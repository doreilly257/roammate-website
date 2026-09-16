"""Synthetic assessment contract; host execution is explicit, never Gradle."""

import errno
from contextlib import ExitStack
import hashlib
import json
import os
from pathlib import Path
import select
import socket
import subprocess
import sys
import tempfile
import time

MARKER = b'synthetic-udp-control-v1'
CHILD = r'''
import errno, json, socket, sys
mode, port, sentinel, source = sys.argv[1:]
port = int(port)
marker = b'synthetic-udp-control-v1'
result = dict(observed='allowed', markers=0, errno=None)
try:
    if mode in ('read', 'write'):
        if mode == 'read':
            with open(sentinel, 'rb') as f:
                if f.read() != marker:
                    raise ValueError('sentinel mismatch')
        else:
            with open(sentinel, 'wb') as f:
                if f.write(marker) != len(marker):
                    raise ValueError('short write')
        result['markers'] = 1
    else:
        family = socket.AF_INET6 if mode in ('udp6', 'wild6') else socket.AF_INET
        kind = socket.SOCK_STREAM if mode == 'tcp4' else socket.SOCK_DGRAM
        host = '::1' if family == socket.AF_INET6 else '127.0.0.1'
        with socket.socket(family, kind) as s:
            s.settimeout(2)
            if family == socket.AF_INET6:
                s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            if mode == 'send':
                s.sendto(marker, (host, port))
            else:
                address = '::' if mode == 'wild6' else '0.0.0.0' if mode in ('wild4', 'ephemeral') else host
                s.bind((address, int(source) if mode == 'reply' else port))
                if kind == socket.SOCK_STREAM:
                    s.listen(1)
                print('READY:' + str(s.getsockname()[1]), flush=True)
                if kind == socket.SOCK_STREAM:
                    connection, _ = s.accept()
                    with connection:
                        connection.settimeout(2)
                        received = connection.recv(256)
                else:
                    received, _ = s.recvfrom(256)
                if received != marker:
                    raise ValueError('unexpected marker')
                result['markers'] = 1
                if mode == 'reply':
                    print('RECEIVED', flush=True)
                    result['markers'] = 0
                    s.sendto(marker, (host, port))
except OSError as error:
    code = error.errno
    category = ('denied' if code in (errno.EPERM, errno.EACCES) else
                'collision' if code == errno.EADDRINUSE else
                'unsupported' if code in (errno.EAFNOSUPPORT, errno.EPROTONOSUPPORT, errno.EADDRNOTAVAIL) else
                'timeout' if isinstance(error, TimeoutError) else 'fixture_error')
    result.update(observed=category, errno=code)
except Exception:
    result.update(observed='fixture_error')
print(json.dumps(result), flush=True)
'''

def decode(payload, code, stderr=False):
    if code != 0 or stderr:
        return ('policy_error' if code == 65 else 'fixture_error', 0, None)
    try:
        value = json.loads(payload)
        if set(value) != {'observed', 'markers', 'errno'}:
            raise ValueError()
        observed, markers, number = value['observed'], value['markers'], value['errno']
        if type(markers) is not int or markers not in (0, 1):
            raise ValueError()
        if number is not None and type(number) is not int:
            raise ValueError()
        if observed not in ('allowed', 'denied', 'collision', 'unsupported', 'timeout', 'fixture_error'):
            raise ValueError()
        if observed == 'denied' and number not in (errno.EPERM, errno.EACCES):
            raise ValueError()
        if observed == 'allowed' and number is not None:
            raise ValueError()
        return observed, markers, number
    except (ValueError, TypeError, KeyError):
        return 'malformed', 0, None

def environment(home, temporary):
    return {'HOME': str(home), 'TMPDIR': str(temporary), 'PATH': '/usr/bin:/bin', 'LC_ALL': 'C'}

def run_child(command, root, env, expected, ready, reply=False):
    started = time.monotonic()
    deadline = started + 5
    child = subprocess.Popen(command, cwd=root, env=env, close_fds=True,
                             stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    observed, markers, number = 'fixture_error', 0, None
    stage = 'operation'
    try:
        active = [child.stdout, child.stderr]
        output, errors, pending = b'', b'', b''
        stdout_count = 0
        bound = received = False
        while active:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError()
            readable, _, _ = select.select(active, [], [], remaining)
            if not readable:
                raise TimeoutError()
            for stream in readable:
                chunk = os.read(stream.fileno(), 1024)
                if not chunk:
                    active.remove(stream)
                    continue
                if stream is child.stderr:
                    errors += chunk
                    if len(errors) > 4096:
                        raise OverflowError()
                    continue
                stdout_count += len(chunk)
                if stdout_count > 4096:
                    raise OverflowError()
                pending += chunk
                while b'\n' in pending:
                    line, pending = pending.split(b'\n', 1)
                    if line.startswith(b'READY:'):
                        if bound or output:
                            raise ValueError('duplicate readiness')
                        port = int(line[6:])
                        if not 1 <= port <= 65535:
                            raise ValueError('invalid readiness')
                        bound = True
                        stage = 'bind'
                        if expected == 'denied' and not reply:
                            observed = 'allowed'
                            raise StopIteration()
                        ready(port)
                    elif line == b'RECEIVED':
                        if not reply or not bound or received or output:
                            raise ValueError('invalid receipt stage')
                        received = True
                        stage = 'send'
                    else:
                        output += line + b'\n'
        child.wait(timeout=max(0.01, deadline - time.monotonic()))
        observed, markers, number = decode(output + pending, child.returncode, bool(errors))
        if reply and observed == 'denied' and not received:
            observed = 'setup_denied'
        if reply and observed == 'allowed' and not received:
            observed = 'fixture_error'
    except (TimeoutError, subprocess.TimeoutExpired):
        observed = 'timeout'
    except OverflowError:
        observed = 'output_overflow'
    except StopIteration:
        pass
    except (ValueError, OSError):
        observed = 'fixture_error'
    finally:
        # No communicate(): even cleanup must not accumulate unlimited pipe data.
        if active:
            child.kill()
        elif child.poll() is None:
            child.kill()
        child.stdout.close()
        child.stderr.close()
        child.wait(timeout=2)
    return dict(observed=observed, markers=markers, errno=number, exit_code=child.returncode,
                stage=stage, elapsed_ms=round((time.monotonic() - started) * 1000))


def profile(port, private, protected):
    if type(port) is not int or not 1 <= port <= 65535:
        raise ValueError('invalid port')
    for path in [private, *protected]:
        if not path.startswith('/') or any(c in path for c in '\"\\\n\r\0'):
            raise ValueError('invalid policy path')
    baseline = '(version 1)\n(allow default)\n(deny network*)\n'
    baseline += f'(deny file-read* file-write* (subpath "{private}"))\n'
    for path in protected:
        baseline += f'(deny file-read* (subpath "{path}"))\n'
    return baseline, baseline + f'(allow network-inbound (local udp "localhost:{port}"))\n'

def cases(port, other):
    rows = []
    def add(label, mode, number, policy, expected):
        rows.append(dict(id=label, mode=mode, port=number, policy=policy,
                         expected=expected, family=6 if mode in ('udp6', 'wild6') else 4))
    add('udp4-positive', 'udp4', port, 'none', 'allowed')
    add('udp4-baseline', 'udp4', port, 'baseline', 'denied')
    add('udp4-experiment', 'udp4', port, 'experiment', 'allowed')
    for label, mode, number in [('other', 'udp4', other), ('tcp', 'tcp4', port),
                                ('ipv6', 'udp6', port), ('wild4', 'wild4', port),
                                ('wild6', 'wild6', port), ('ephemeral', 'ephemeral', 0),
                                ('send-allowed', 'send', port), ('send-other', 'send', other),
                                ('bound-reply', 'reply', other),
                                ('read', 'read', 0), ('write', 'write', 0)]:
        add(label + '-positive', mode, number, 'none', 'allowed')
        for policy in ('baseline', 'experiment'):
            add(label + '-' + policy, mode, number, policy, 'denied')
    return rows

def classify(expected, observed, exit_code, markers, family=4):
    if family == 6 and expected == 'allowed' and observed == 'unsupported' and exit_code == 0 and markers == 0:
        return 'incomplete'
    if exit_code != 0 or expected not in ('allowed', 'denied'):
        return 'fail'
    return 'pass' if observed == expected and markers == (1 if expected == 'allowed' else 0) else 'fail'

def assess(matrix, execute):
    report = {'status': 'incomplete', 'results': [], 'not_run': []}
    for index, case in enumerate(matrix):
        result = execute(case)
        status = classify(case['expected'], result['observed'], result['exit_code'], result['markers'], case['family'])
        report['results'].append({**case, **result, 'status': status})
        report['status'] = status
        if status != 'pass':
            report['not_run'] = [r['id'] for r in matrix[index + 1:]]
            break
    return report


def host_assessment():
    """Only called by the explicit CLI switch; never used by unit tests."""
    if sys.platform != 'darwin':
        raise RuntimeError('macOS required; no fallback')
    sandbox = Path('/usr/bin/sandbox-exec')
    interpreter = Path(sys.executable).resolve(strict=True)
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    identities = {'python': digest(interpreter), 'sandbox_exec': digest(sandbox),
                  'fixture': hashlib.sha256(CHILD.encode()).hexdigest()}
    with tempfile.TemporaryDirectory(prefix='synthetic-udp-control-') as temporary:
        root = Path(temporary).resolve()
        fixture = root / 'fixture.py'
        fixture.write_text(CHILD)
        private = root / 'private'
        private.mkdir()
        sentinel = private / 'sentinel'
        sentinel.write_bytes(MARKER)
        home = Path.home()
        protected = [str(home / p) for p in ('.roammate-secrets', '.appstoreconnect', '.ssh', '.aws',
                    '.config/gcloud', 'Library/Keychains', 'Library/Developer/CoreSimulator/Devices', '.android/avd')]
        # Both reservations are held together to ensure distinct fixed port numbers.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as first, socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as second:
            first.bind(('127.0.0.1', 0))
            second.bind(('127.0.0.1', 0))
            port, other = first.getsockname()[1], second.getsockname()[1]
        policy_texts = dict(zip(('baseline', 'experiment'), profile(port, str(private), protected)))
        profiles = {}
        for name, text in policy_texts.items():
            path = root / (name + '.sb')
            path.write_text(text)
            profiles[name] = path
            identities[name] = digest(path)

        def execute(case):
            with ExitStack() as stack:
                childroot = root / case['id']
                childroot.mkdir()
                childhome, childtmp = childroot / 'home', childroot / 'tmp'
                childhome.mkdir()
                childtmp.mkdir()
                env = environment(childhome, childtmp)
                result = dict(observed='fixture_error', markers=0, errno=None, exit_code=None, elapsed_ms=0)
                try:
                    if (digest(interpreter) != identities['python'] or digest(sandbox) != identities['sandbox_exec']
                            or digest(fixture) != identities['fixture']
                            or any(digest(path) != identities[name] for name, path in profiles.items())):
                        result['observed'] = 'identity_changed'
                        return result
                    server = None
                    sent = 0
                    family = socket.AF_INET6 if case['family'] == 6 else socket.AF_INET
                    loopback = '::1' if family == socket.AF_INET6 else '127.0.0.1'
                    if case['mode'] in ('send', 'reply'):
                        server = stack.enter_context(socket.socket(socket.AF_INET, socket.SOCK_DGRAM))
                        server.bind(('127.0.0.1', case['port']))
                        server.settimeout(1)
                        if case['mode'] == 'reply':
                            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as reservation:
                                reservation.bind(('127.0.0.1', port))
                    elif case['mode'] not in ('read', 'write') and case['port']:
                        # This is a collision check, not an atomic handoff guarantee.
                        kind = socket.SOCK_STREAM if case['mode'] == 'tcp4' else socket.SOCK_DGRAM
                        with socket.socket(family, kind) as reservation:
                            if family == socket.AF_INET6:
                                reservation.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
                            reservation.bind((loopback, case['port']))
                    def ready(actual_port):
                        nonlocal sent
                        expected_port = port if case['mode'] == 'reply' else case['port']
                        if expected_port and actual_port != expected_port:
                            raise ValueError('unexpected port')
                        kind = socket.SOCK_STREAM if case['mode'] == 'tcp4' else socket.SOCK_DGRAM
                        with socket.socket(family, kind) as sender:
                            sender.settimeout(1)
                            if kind == socket.SOCK_STREAM:
                                sender.connect((loopback, actual_port))
                                sender.sendall(MARKER)
                            elif sender.sendto(MARKER, (loopback, actual_port)) != len(MARKER):
                                raise ValueError('short send')
                            sent += 1
                    command = [str(interpreter), '-I', '-S', str(fixture), case['mode'], str(case['port']), str(sentinel), str(port)]
                    if case['policy'] != 'none':
                        command = [str(sandbox), '-f', str(profiles[case['policy']]), *command]
                    result = run_child(command, root, env, case['expected'], ready,
                                       reply=case['mode'] == 'reply' and case['policy'] != 'baseline')
                    if (digest(interpreter) != identities['python'] or digest(sandbox) != identities['sandbox_exec']
                            or digest(fixture) != identities['fixture']
                            or any(digest(path) != identities[name] for name, path in profiles.items())):
                        result['observed'] = 'identity_changed'
                    if server is not None:
                        packets = []
                        # At most two packets, each wait bounded. More than one fails.
                        for _ in range(2):
                            if not select.select([server], [], [], 0.2)[0]:
                                break
                            packets.append(server.recvfrom(256)[0])
                        result['markers'] = len(packets)
                        if any(packet != MARKER for packet in packets):
                            result['observed'] = 'unexpected_marker'
                        result['parent_sent'] = sent
                    elif case['mode'] not in ('read', 'write'):
                        result['parent_sent'] = sent
                        if result['observed'] == 'allowed' and case['expected'] == 'allowed' and sent != 1:
                            result['observed'] = 'counter_mismatch'
                    elif sentinel.read_bytes() != MARKER:
                        result['observed'] = 'sentinel_mismatch'
                    return result
                except OSError as error:
                    result['observed'] = ('collision' if error.errno == errno.EADDRINUSE else
                                          'unsupported' if error.errno in (errno.EAFNOSUPPORT, errno.EPROTONOSUPPORT, errno.EADDRNOTAVAIL) else 'fixture_error')
                    result['errno'] = error.errno
                    # Parent IPv6 unavailability is an incomplete positive control.
                    result['exit_code'] = 0 if result['observed'] == 'unsupported' else None
                    return result

        matrix = cases(port, other)
        report = assess(matrix, execute)
        report.update(assessment='synthetic-fixed-port-only', identities=identities,
                      python_version=sys.version.split()[0], scratch_removed_on_return=True,
                      actual_gradle_compatibility='not-tested', real_policy_changed=False)
        return report


if __name__ == '__main__':
    if sys.argv[1:] != ['--run-host-controls']:
        raise SystemExit('Explicit --run-host-controls required; this never runs Gradle.')
    try:
        report = host_assessment()
    except Exception:
        report = {'status': 'incomplete', 'category': 'host-setup-error', 'actual_gradle_compatibility': 'not-tested'}
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['status'] == 'pass' else 1)
