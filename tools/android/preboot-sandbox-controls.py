#!/usr/bin/env python3
"""Host-only synthetic assessment. Never invokes Android tools or remote hosts."""
import errno
import json
import os
from pathlib import Path
import select
import socket
import subprocess
import sys
import tempfile
import time

CHILD = r'''
import errno, json, os, socket, sys
from pathlib import Path
mode, marker, home, sentinel, port, fd = sys.argv[1:]
result = {"mode": mode, "pid": os.getpid()}
try:
    if mode == "files":
        Path(home, "owned-marker").write_text(marker)
        result["home_write"] = True
        Path(sentinel).read_text()
    elif mode == "fd":
        with socket.socket(fileno=int(fd)) as channel:
            channel.sendall(marker.encode())
    else:
        family = socket.AF_INET6 if mode == "tcp6" else socket.AF_INET
        kind = socket.SOCK_DGRAM if mode == "udp4" else socket.SOCK_STREAM
        with socket.socket(family, kind) as channel:
            channel.settimeout(1)
            address = ("::1" if mode == "tcp6" else "127.0.0.1", int(port))
            if mode == "udp4":
                channel.sendto(marker.encode(), address)
            else:
                channel.connect(address)
                channel.sendall(marker.encode())
    result["result"] = "allowed"
except OSError as error:
    result.update(result="error", errno=error.errno)
print(json.dumps(result))
'''


def main():
    assert sys.platform == 'darwin', 'Assessment requires macOS sandbox-exec'
    sandbox = '/usr/bin/sandbox-exec'
    assert Path(sandbox).is_file(), 'sandbox-exec unavailable; no fallback'
    results = []
    with tempfile.TemporaryDirectory(prefix='android-preboot-controls-') as temporary:
        root = Path(temporary).resolve()
        home = root / 'home'
        private = root / 'synthetic-private'
        home.mkdir()
        private.mkdir()
        sentinel = private / 'sentinel'
        sentinel.write_text('synthetic-only')
        deny = '(version 1)\n(allow default)\n(deny network*)\n' + f'(deny file-read* (subpath "{private}"))\n'

        def run(case, mode, policy=None, port=0, inherited=None):
            marker = 'synthetic-' + case
            command = [sys.executable, '-I', '-S', '-c', CHILD, mode, marker, str(home), str(sentinel), str(port), str(inherited if inherited is not None else -1)]
            if policy is not None:
                profile = root / (case + '.sb')
                profile.write_text(policy)
                command = [sandbox, '-f', str(profile), *command]
            started = time.monotonic()
            completed = subprocess.run(command, env={'HOME': str(home), 'PATH': '/usr/bin:/bin'}, cwd=root,
                                       close_fds=True, pass_fds=() if inherited is None else (inherited,),
                                       capture_output=True, text=True, timeout=5, check=False)
            assert completed.returncode == 0, f'{case}: fixture/profile failed (exit {completed.returncode})'
            result = json.loads(completed.stdout)
            result.update(case=case, elapsed_ms=round((time.monotonic() - started) * 1000), subprocess_exit=completed.returncode)
            results.append(result)
            return result, marker.encode()

        def expected(result, allowed):
            if allowed:
                assert result['result'] == 'allowed', f'{result["case"]}: expected allowed control'
            else:
                assert result['result'] == 'error' and result['errno'] in (errno.EPERM, errno.EACCES), f'{result["case"]}: not a demonstrated policy denial'

        def receiver(mode, port=0):
            family = socket.AF_INET6 if mode == 'tcp6' else socket.AF_INET
            kind = socket.SOCK_DGRAM if mode == 'udp4' else socket.SOCK_STREAM
            server = socket.socket(family, kind)
            try:
                if mode == 'tcp6':
                    server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
                server.bind(('::1' if mode == 'tcp6' else '127.0.0.1', port))
                if mode != 'udp4':
                    server.listen(4)
                server.settimeout(1)
                return server
            except BaseException:
                server.close()
                raise

        def collect(server, mode):
            messages = []
            while select.select([server], [], [], 0.15)[0]:
                if mode == 'udp4':
                    messages.append(server.recvfrom(1024)[0])
                else:
                    stream, _ = server.accept()
                    with stream:
                        stream.settimeout(1)
                        messages.append(stream.recv(1024))
            return messages

        def network_pair(label, mode, server, policy, allowed=False):
            port = server.getsockname()[1]
            positive, marker = run(label + '-positive', mode, port=port)
            expected(positive, True)
            assert collect(server, mode) == [marker], 'Receiver positive control failed'
            positive['receiver_markers'] = 1
            controlled, marker = run(label + '-sandbox', mode, policy, port)
            expected(controlled, allowed)
            received = collect(server, mode)
            assert received == ([marker] if allowed else []), 'Unexpected/missing receiver marker'
            controlled['receiver_markers'] = len(received)

        positive, _ = run('files-positive', 'files')
        expected(positive, True)
        negative, _ = run('files-sandbox', 'files', deny)
        expected(negative, False)
        assert negative['home_write'] is True

        for mode in ['tcp4', 'udp4', 'tcp6']:
            try:
                server = receiver(mode)
            except OSError as error:
                if mode != 'tcp6':
                    raise
                results.append({'case': 'tcp6', 'result': 'unsupported', 'errno': error.errno})
                continue
            with server:
                network_pair('deny-' + mode, mode, server, deny)

        # The only extra inherited descriptor is a parent-created local socketpair.
        # No TCP/UDP listening or connected descriptor is passed to the child.
        parent, child = socket.socketpair()
        with parent, child:
            parent.settimeout(1)
            positive, marker = run('fd-positive', 'fd', inherited=child.fileno())
            expected(positive, True)
            assert parent.recv(1024) == marker
            positive['receiver_markers'] = 1
            controlled, marker = run('fd-sandbox', 'fd', deny, inherited=child.fileno())
            if controlled['result'] == 'allowed':
                assert parent.recv(1024) == marker
                controlled['receiver_markers'] = 1
            else:
                expected(controlled, False)
                assert not select.select([parent], [], [], 0.15)[0]
                controlled['receiver_markers'] = 0

        # Serial FDs alone do not establish an ADB control path. Assess the exact
        # TCP alternative without ever starting a daemon, emulator or forwarder.
        with receiver('tcp4') as allowed_server, receiver('tcp4') as other_server:
            allowed_port = allowed_server.getsockname()[1]
            policy = deny + f'(allow network-outbound (remote tcp "127.0.0.1:{allowed_port}"))\n'
            profile = root / 'exact-ipv4-preflight.sb'
            profile.write_text(policy)
            preflight = subprocess.run([sandbox, '-f', str(profile), '/usr/bin/true'],
                                       env={'HOME': str(home), 'PATH': '/usr/bin:/bin'}, cwd=root,
                                       close_fds=True, capture_output=True, text=True, timeout=5, check=False)
            if preflight.returncode != 0:
                assert preflight.returncode == 65 and 'host must be * or localhost' in preflight.stderr, 'Unexpected policy preflight failure'
                results.append({'case': 'numeric-ipv4-exception-policy', 'result': 'unsupported_tested_syntax',
                                'subprocess_exit': 65, 'category': 'numeric-host-selector-rejected'})
                # No relaxation to localhost/* and no claim about untested operators.
                return results
            network_pair('exception-tcp4-allowed', 'tcp4', allowed_server, policy, True)
            network_pair('exception-tcp4-other', 'tcp4', other_server, policy)
            with receiver('udp4', allowed_port) as udp_server:
                network_pair('exception-udp4-same-port', 'udp4', udp_server, policy)
            try:
                ipv6_server = receiver('tcp6', allowed_port)
            except OSError as error:
                results.append({'case': 'exception-tcp6-same-port', 'result': 'unsupported', 'errno': error.errno})
            else:
                with ipv6_server:
                    network_pair('exception-tcp6-same-port', 'tcp6', ipv6_server, policy)

    return results


if __name__ == '__main__':
    print(json.dumps({'assessment': 'host-synthetic-only', 'results': main()}, indent=2))
