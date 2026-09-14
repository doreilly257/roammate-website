#!/usr/bin/env python3
"""Offline-only supervisor. Raw child diagnostics are never retained."""
import copy
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
import argparse
import ctypes
from datetime import datetime
import hashlib
import math
import re
import selectors
import shutil
import signal
import subprocess
import time
import errno

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'infra/csp-nonce/functions/_middleware.js'
HARNESS = ROOT / 'infra/csp-nonce/nonce.benchmark.mjs'
LIMIT = 16 * 1024 * 1024
POLICY = '(version 1) (allow default) (deny network*)'
SAFE_INT = 2**53 - 1
STAGE = 'START'
DEFINITIONS = [
    ('html200', '/', 'GET', 200, 'text/html', 61),
    ('html404', '/synthetic-missing/', 'GET', 404, 'text/html', 61),
    ('htmlHead', '/', 'HEAD', 200, 'text/html', 0),
    ('search', '/search/', 'GET', 200, 'text/html', 61),
    ('bypass', '/images/synthetic.webp', 'GET', 200, 'image/webp', 21),
]


class Invalid(Exception):
    """Fixed-code failure only; never includes child data."""


def failure_label(error, stage):
    stages = {'START', 'RUNTIME', 'ISOLATION', 'SELF_TEST', 'FUNCTIONAL', 'UNIT', 'SOURCE_BEFORE',
              'MEASURE', 'SOURCE_AFTER', 'RUNTIME_AFTER', 'DECODE', 'VALIDATE', 'PUBLISH'}
    codes = {'INVALID', 'CHILD_INVALID', 'CHILD_TIMEOUT', 'CHILD_OVERSIZE', 'CHILD_FAILED',
             'JSON_INVALID', 'DATE_INVALID', 'EAGAIN', 'EACCES', 'EPERM', 'ENOSPC', 'EMFILE', 'EPIPE',
             *(f'NODE_STAGE_{index}' for index in range(101, 110))}
    code = error.args[0] if isinstance(error, Invalid) and error.args else 'INVALID'
    if isinstance(error, OSError):
        code = errno.errorcode.get(error.errno, 'INVALID')
    return f'BENCHMARK_INVALID_{stage if stage in stages else "UNKNOWN"}_{code if code in codes else "INVALID"}'


def require(condition):
    if not condition:
        raise Invalid('INVALID')


def valid_runtime(value):
    return value == 'v26.8.2'


def policy_check(parent):
    require(sys.platform == 'darwin' and parent == os.getppid())
    library = ctypes.CDLL('/usr/lib/libsandbox.dylib')
    library.sandbox_check.restype = ctypes.c_int
    for pid in (os.getpid(), parent):
        for operation in (b'network-inbound', b'network-outbound'):
            require(library.sandbox_check(ctypes.c_int(pid), ctypes.c_char_p(operation), ctypes.c_int(0)) == 1)


def run_child(command, timeout=120, result=False, extra_env=None):
    """Bounded dedicated JSON pipe; stdout/stderr go straight to /dev/null.

    The independent parent deadline covers stalled event loops and descendants
    retaining the pipe. Every outcome kills the group and reaps its direct child.
    """
    require(Path('/usr/bin/sandbox-exec').is_file())
    environment = {'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'LANG': 'C',
                   'BENCH_PYTHON': sys.executable, 'BENCH_SUPERVISOR': str(Path(__file__).resolve())}
    environment.update(extra_env or {})
    read_fd, write_fd = os.pipe()
    environment['BENCH_RESULT_FD'] = str(write_fd)
    process = None
    selector = selectors.DefaultSelector()
    output = bytearray()
    try:
        start = time.monotonic()
        process = subprocess.Popen(['/usr/bin/sandbox-exec', '-p', POLICY, *command], cwd=ROOT,
                                   stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   pass_fds=(write_fd,) if result else (), env=environment, start_new_session=True)
        os.close(write_fd); write_fd = None
        os.set_blocking(read_fd, False)
        selector.register(read_fd, selectors.EVENT_READ)
        eof = False
        while not (eof and process.poll() is not None):
            remaining = timeout - (time.monotonic() - start)
            if remaining <= 0: raise Invalid('CHILD_TIMEOUT')
            for key, _ in selector.select(min(remaining, .05)):
                chunk = os.read(key.fd, min(65536, LIMIT + 1 - len(output)))
                if not chunk:
                    eof = True; selector.unregister(read_fd)
                else:
                    output.extend(chunk)
                    if len(output) > LIMIT: raise Invalid('CHILD_OVERSIZE')
        status = process.wait()
        if status != 0:
            raise Invalid(f'NODE_STAGE_{status}' if 101 <= status <= 109 else 'CHILD_FAILED')
        return bytes(output)
    except Invalid:
        raise
    except OSError as error:
        code = errno.errorcode.get(error.errno, 'CHILD_INVALID')
        raise Invalid(code if code in {'EAGAIN', 'EACCES', 'EPERM', 'ENOSPC', 'EMFILE', 'EPIPE'} else 'CHILD_INVALID') from None
    except BaseException:
        raise Invalid('CHILD_INVALID') from None
    finally:
        if process is not None:
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait()
        selector.close()
        os.close(read_fd)
        if write_fd is not None: os.close(write_fd)


def decode(data):
    require(len(data) <= LIMIT)
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result)
            result[key] = value
        return result
    def invalid_constant(_):
        raise Invalid('JSON_INVALID')
    try:
        return json.loads(data, object_pairs_hook=unique, parse_constant=invalid_constant)
    except BaseException:
        raise Invalid('JSON_INVALID') from None


def keys(value, expected):
    require(type(value) is dict and set(value) == set(expected.split()))


def integer(value, low=0):
    require(type(value) is int and low <= value <= SAFE_INT)


def stats(values):
    ordered = sorted(values)
    return dict(zip(('min', 'median', 'p95', 'p99', 'max'),
                    (ordered[0], ordered[math.ceil(.5 * len(ordered)) - 1],
                     ordered[math.ceil(.95 * len(ordered)) - 1],
                     ordered[math.ceil(.99 * len(ordered)) - 1], ordered[-1])))


def validate(value, provenance):
    keys(value, 'schema runtime source startUtc endUtc durationNs environment method orderRule warmupPairs measuredPairs validity fixtures')
    require(type(value['schema']) is int and value['schema'] == 1 and valid_runtime(value['runtime']))
    keys(value['source'], 'sha256 revision dirty runtimeSha256')
    require(value['source'] == provenance)
    for name in ('sha256', 'runtimeSha256'):
        require(type(value['source'][name]) is str and re.fullmatch('[0-9a-f]{64}', value['source'][name]))
    require(type(value['source']['revision']) is str and re.fullmatch('[0-9a-f]{40}', value['source']['revision']))
    require(type(value['source']['dirty']) is bool)
    dates = []
    for name in ('startUtc', 'endUtc'):
        require(type(value[name]) is str and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z', value[name]))
        try: dates.append(datetime.fromisoformat(value[name].replace('Z', '+00:00')))
        except ValueError: raise Invalid('DATE_INVALID') from None
    require(0 <= (dates[1] - dates[0]).total_seconds() <= 120)
    integer(value['durationNs'], 1); require(value['durationNs'] <= 120_000_000_000)
    env = value['environment']; keys(env, 'cpu cpuCount os release arch')
    require(type(env['cpu']) is str and len(env['cpu']) <= 160 and re.fullmatch(r'[A-Za-z0-9 ()@.,+_-]+', env['cpu']))
    integer(env['cpuCount'], 1); require(env['cpuCount'] <= 1024 and env['os'] == 'darwin' and env['arch'] in ('arm64', 'x64'))
    require(type(env['release']) is str and re.fullmatch(r'\d+\.\d+\.\d+', env['release']))
    require(value['method'] == 'paired-B-minus-A-nearest-rank' and value['orderRule'] == 'even-AB-odd-BA')
    for name, count in (('warmupPairs', 1000), ('measuredPairs', 25000)):
        integer(value[name]); require(value[name] == count)
    keys(value['validity'], 'correctness isolationBefore isolationAfter sourceUnchanged complete')
    require(all(flag is True for flag in value['validity'].values()))
    require(type(value['fixtures']) is list and len(value['fixtures']) == 5)
    for fixture, definition in zip(value['fixtures'], DEFINITIONS):
        keys(fixture, 'id path method status contentType bodyBytes warmupPairs blocks')
        require(tuple(fixture[k] for k in ('id', 'path', 'method', 'status', 'contentType', 'bodyBytes')) == definition)
        integer(fixture['status']); integer(fixture['bodyBytes']); integer(fixture['warmupPairs'])
        require(fixture['warmupPairs'] == 200 and type(fixture['blocks']) is list and len(fixture['blocks']) == 5)
        for block_index, block in enumerate(fixture['blocks']):
            keys(block, 'block pairs summary'); integer(block['block']); require(block['block'] == block_index)
            require(type(block['pairs']) is list and len(block['pairs']) == 1000)
            columns = {key: [] for key in ('aNs', 'bNs', 'deltaNs')}
            for index, pair in enumerate(block['pairs']):
                keys(pair, 'pair order aNs bNs deltaNs')
                integer(pair['pair']); require(pair['pair'] == block_index * 1000 + index)
                require(pair['order'] == ('AB' if pair['pair'] % 2 == 0 else 'BA'))
                integer(pair['aNs']); integer(pair['bNs']); integer(pair['deltaNs'], -SAFE_INT)
                require(pair['deltaNs'] == pair['bNs'] - pair['aNs'])
                for key in columns: columns[key].append(pair[key])
            keys(block['summary'], 'aNs bNs deltaNs')
            for key, column in columns.items():
                keys(block['summary'][key], 'min median p95 p99 max')
                for number in block['summary'][key].values(): integer(number, -SAFE_INT if key == 'deltaNs' else 0)
                require(block['summary'][key] == stats(column))


def publish(path, value, provenance):
    validate(value, provenance)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix='.nonce-result-', delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(value, handle, separators=(',', ':'), allow_nan=False)
            handle.write('\n'); handle.flush(); os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None: temporary.unlink(missing_ok=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def provenance(node):
    # git metadata is allowlisted, never copied wholesale into diagnostics.
    revision = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5, check=True).stdout.decode().strip()
    require(re.fullmatch('[0-9a-f]{40}', revision))
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', str(SOURCE.relative_to(ROOT))], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5, check=True).stdout != b''
    return {'sha256': digest(SOURCE), 'revision': revision, 'dirty': dirty, 'runtimeSha256': digest(Path(node))}


def synthetic_result():
    source = {'sha256': 'a' * 64, 'revision': 'b' * 40, 'dirty': False, 'runtimeSha256': 'c' * 64}
    value = {'schema': 1, 'runtime': 'v26.8.2', 'source': source.copy(), 'startUtc': '2026-09-14T00:00:00.000Z',
             'endUtc': '2026-09-14T00:00:01.000Z', 'durationNs': 1_000_000_000,
             'environment': {'cpu': 'Synthetic CPU', 'cpuCount': 1, 'os': 'darwin', 'release': '1.0.0', 'arch': 'arm64'},
             'method': 'paired-B-minus-A-nearest-rank', 'orderRule': 'even-AB-odd-BA', 'warmupPairs': 1000, 'measuredPairs': 25000,
             'validity': dict.fromkeys(('correctness', 'isolationBefore', 'isolationAfter', 'sourceUnchanged', 'complete'), True), 'fixtures': []}
    for definition in DEFINITIONS:
        fixture = dict(zip(('id', 'path', 'method', 'status', 'contentType', 'bodyBytes'), definition))
        fixture.update(warmupPairs=200, blocks=[])
        for block in range(5):
            pairs = [{'pair': block * 1000 + i, 'order': 'AB' if i % 2 == 0 else 'BA', 'aNs': 10, 'bNs': 5, 'deltaNs': -5} for i in range(1000)]
            fixture['blocks'].append({'block': block, 'pairs': pairs, 'summary': {key: stats([p[key] for p in pairs]) for key in ('aNs', 'bNs', 'deltaNs')}})
        value['fixtures'].append(fixture)
    return value, source


class SupervisorTests(unittest.TestCase):
    def test_safe_failure_diagnostics(self):
        self.assertEqual(failure_label(Invalid('CHILD_TIMEOUT'), 'MEASURE'), 'BENCHMARK_INVALID_MEASURE_CHILD_TIMEOUT')
        self.assertEqual(failure_label(OSError(28, 'private path'), 'PUBLISH'), 'BENCHMARK_INVALID_PUBLISH_ENOSPC')
        self.assertEqual(failure_label(Invalid('private nonce'), 'private path'), 'BENCHMARK_INVALID_UNKNOWN_INVALID')

    def test_actual_environment_schema(self):
        node = shutil.which('node')
        code = ('const o=require("node:os");require("node:fs").writeFileSync(Number(process.env.BENCH_RESULT_FD),'
                'JSON.stringify({cpu:o.cpus()[0].model,cpuCount:o.cpus().length,os:o.platform(),release:o.release(),arch:o.arch()}))')
        actual = decode(run_child([node, '-e', code], timeout=5, result=True))
        value, source = synthetic_result()
        value['environment'] = actual
        validate(value, source)

    def test_complete_synthetic_transport_and_publication(self):
        value, source = synthetic_result()
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / 'synthetic-input.json'
            output_path = Path(directory) / 'synthetic-result.json'
            input_path.write_text(json.dumps(value))
            code = ('const fs=require("node:fs");const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));'
                    'fs.writeFileSync(Number(process.env.BENCH_RESULT_FD),JSON.stringify(v))')
            data = run_child([shutil.which('node'), '-e', code, str(input_path)], timeout=5, result=True)
            publish(output_path, decode(data), source)
            self.assertTrue(decode(output_path.read_bytes()) == value)
            self.assertEqual(len(list(Path(directory).glob('.nonce-result-*'))), 0)

    def test_node_fixed_stage_rejection_before_workload(self):
        with self.assertRaises(Invalid) as caught:
            run_child([shutil.which('node'), str(HARNESS)], timeout=10, result=True,
                      extra_env={'BENCH_SOURCE': 'not-json'})
        self.assertEqual(caught.exception.args, ('NODE_STAGE_102',))

    def test_large_node_result_channel(self):
        node = shutil.which('node')
        code = 'require("node:fs").writeFileSync(Number(process.env.BENCH_RESULT_FD),"x".repeat(4*1024*1024))'
        data = run_child([node, '-e', code], timeout=5, result=True)
        self.assertEqual(len(data), 4 * 1024 * 1024)

    def test_actual_fixture_metadata_schema(self):
        node = shutil.which('node')
        code = ('import {FIXTURES} from "./infra/csp-nonce/nonce.benchmark.mjs";'
                'import {writeFileSync} from "node:fs";'
                'writeFileSync(Number(process.env.BENCH_RESULT_FD),JSON.stringify(FIXTURES.map(f=>'
                '[f.id,f.path,f.method,f.status,f.type,f.body===null?0:Buffer.byteLength(f.body)])))')
        actual = decode(run_child([node, '--input-type=module', '-e', code], timeout=5, result=True))
        self.assertTrue(actual == [list(row) for row in DEFINITIONS], 'FIXTURE_SCHEMA_INVALID')

    def test_runtime(self):
        self.assertTrue(valid_runtime('v26.8.2'))
        for value in ['v26.8.1', '', 'v26.8.2\nsecret']:
            self.assertFalse(valid_runtime(value))

    def test_schema(self):
        good, provenance = synthetic_result()
        validate(good, provenance)
        mutations = [
            lambda x: x.update(extra='private'),
            lambda x: x['source'].update(sha256='0' * 64),
            lambda x: x['fixtures'].pop(),
            lambda x: x['fixtures'][0]['blocks'].pop(),
            lambda x: x['fixtures'][0]['blocks'][0]['pairs'].pop(),
            lambda x: x['fixtures'][0]['blocks'][0]['pairs'][0].update(deltaNs=99),
            lambda x: x['fixtures'][0]['blocks'][0]['pairs'][0].update(order='BA'),
            lambda x: x['fixtures'][0]['blocks'][0]['summary']['deltaNs'].update(p95=99),
            lambda x: x.update(runtime='v26.8.1'),
        ]
        for mutate in mutations:
            bad = copy.deepcopy(good); mutate(bad)
            with self.assertRaises(Invalid): validate(bad, provenance)

    def test_json(self):
        for payload in [b'{', b'{}trailing', b'{"a":1,"a":2}', b'{"a":NaN}', b'x' * (LIMIT + 1)]:
            with self.assertRaises(Invalid): decode(payload)

    def test_children_and_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'result.json'
            path.write_text('earlier-valid-artifact')
            for code, cap in [
                ('import os;os.write(1,b"private diagnostic");os.write(2,b"private header");os.write(3,b"{")', 2),
                ('import os;os.write(3,b"x"*(16*1024*1024+1))', 2),
                ('import time;time.sleep(10)', .05),
                ('import sys;sys.exit(2)', 2),
                ('import os;os.write(1,b"x"*(20*1024*1024));os.write(3,b"{}")', 2),
            ]:
                with self.assertRaises(Invalid):
                    code = code.replace('os.write(3,', 'os.write(int(os.environ["BENCH_RESULT_FD"]),')
                    data = run_child([sys.executable, '-c', code], timeout=cap, result=True)
                    publish(path, decode(data), {})
                self.assertEqual(path.read_text(), 'earlier-valid-artifact')
            data = run_child([sys.executable, '-c', 'import os;os.write(1,b"secret");os.write(2,b"secret");os.write(int(os.environ["BENCH_RESULT_FD"]),b"{}")'], result=True)
            self.assertEqual(decode(data), {})

    def test_exited_child_descendant_holds_result_pipe(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'result.json'
            pid_path = Path(directory) / 'descendant.json'
            output.write_text('earlier-valid-artifact')
            code = (
                'import os,subprocess,sys;'
                'fd=int(os.environ["BENCH_RESULT_FD"]);'
                'child=subprocess.Popen([sys.executable,"-c","import time;time.sleep(30)"],pass_fds=(fd,));'
                f'open({str(pid_path)!r},"w").write(str(child.pid))'
            )
            pid = None
            try:
                start = time.monotonic()
                with self.assertRaises(Invalid):
                    payload = run_child([sys.executable, '-c', code], timeout=.5, result=True)
                    publish(output, decode(payload), {})
                self.assertLess(time.monotonic() - start, 3)
                self.assertEqual(output.read_text(), 'earlier-valid-artifact')
                self.assertTrue(pid_path.is_file())
                pid = int(pid_path.read_text())
                # An orphan may briefly await init's reap after group SIGKILL.
                deadline = time.monotonic() + 2
                while time.monotonic() < deadline:
                    try: os.kill(pid, 0)
                    except ProcessLookupError:
                        pid = None
                        break
                    time.sleep(.02)
                self.assertIsNone(pid)
            finally:
                if pid is not None:
                    try: os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError: pass


def self_test():
    result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(SupervisorTests))
    print('SUPERVISOR_SELF_TEST_PASS' if result.wasSuccessful() else 'SUPERVISOR_SELF_TEST_FAIL')
    return 0 if result.wasSuccessful() else 1


def main():
    global STAGE
    parser = argparse.ArgumentParser(description='Bounded offline synthetic nonce benchmark')
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--policy-check', type=int, help=argparse.SUPPRESS)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.policy_check is not None:
        policy_check(args.policy_check)
        return 0
    require(args.self_test != (args.output is not None))
    node = shutil.which('node'); require(node is not None)
    node = str(Path(node).resolve())
    before = provenance(node)
    runtime_check = [node, '-e', 'process.exit(process.version === "v26.8.2" ? 0 : 1)']
    STAGE = 'RUNTIME'
    run_child(runtime_check, timeout=5)
    STAGE = 'ISOLATION'
    run_child([node, str(HARNESS), '--isolation-only'], timeout=10)
    print('ISOLATION_PASS', flush=True)
    if args.self_test:
        STAGE = 'SELF_TEST'
        return self_test()
    for filename, stage in [('nonce.test.mjs', 'FUNCTIONAL_PASS'), ('nonce.benchmark.test.mjs', 'BENCHMARK_UNIT_PASS')]:
        STAGE = 'FUNCTIONAL' if filename == 'nonce.test.mjs' else 'UNIT'
        run_child([node, '--test', str(HARNESS.parent / filename)], timeout=30)
        print(stage, flush=True)
    STAGE = 'SOURCE_BEFORE'
    require(provenance(node) == before)
    STAGE = 'MEASURE'
    payload = run_child([node, str(HARNESS)], timeout=120, result=True,
                        extra_env={'BENCH_SOURCE': json.dumps(before)})
    STAGE = 'SOURCE_AFTER'
    require(provenance(node) == before)
    STAGE = 'RUNTIME_AFTER'
    run_child(runtime_check, timeout=5)
    STAGE = 'DECODE'
    value = decode(payload)
    STAGE = 'VALIDATE'
    validate(value, before)
    STAGE = 'PUBLISH'
    publish(args.output, value, before)
    print('BENCHMARK_VALID_PUBLISHED', flush=True)
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        print(failure_label(error, STAGE), flush=True)
        sys.exit(1)
