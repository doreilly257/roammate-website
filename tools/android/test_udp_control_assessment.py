"""Pure synthetic contract tests: no sockets, subprocesses or private reads."""
import unittest
import ast
import errno
from unittest.mock import Mock, patch
import udp_control_assessment as m


class ContractTests(unittest.TestCase):
    def child_run(self, wire, expected='allowed', code=0, stderr=b'', timeout=False, reply=False):
        child = Mock()
        child.returncode = code
        child.poll.return_value = code
        child.wait.return_value = code
        ready = Mock()
        events = [([child.stdout], [], []) for _ in wire] + [([child.stdout], [], []), ([child.stderr], [], []), ([child.stderr], [], [])]
        with patch.object(m.subprocess, 'Popen', return_value=child) as spawn, \
             patch.object(m.select, 'select', side_effect=[([], [], [])] if timeout else events), \
             patch.object(m.os, 'read', side_effect=[bytes([b]) for b in wire] + [b'', stderr, b'']):
            result = m.run_child(['/fixed/python'], '/tmp/owned', {'HOME': '/tmp/owned'}, expected, ready, reply=reply)
        return result, child, ready, spawn

    def test_runner_denial_closes_descriptors_and_uses_fixed_environment(self):
        result, child, ready, spawn = self.child_run(b'{"observed":"denied","markers":0,"errno":1}\n', expected='denied')
        self.assertEqual(result['observed'], 'denied')
        self.assertTrue(spawn.call_args.kwargs['close_fds'])
        self.assertEqual(spawn.call_args.kwargs['env'], {'HOME': '/tmp/owned'})
        self.assertEqual(spawn.call_args.kwargs['stdin'], m.subprocess.DEVNULL)
        ready.assert_not_called()
        child.wait.assert_called()

    def test_unexpected_bind_is_stopped_without_sending_marker(self):
        result, child, ready, _ = self.child_run(b'READY:43123\n', expected='denied')
        self.assertEqual(result['observed'], 'allowed')
        child.kill.assert_called_once()
        ready.assert_not_called()
        child.wait.assert_called()

    def test_timeout_kills_and_reaps_owned_child(self):
        result, child, ready, _ = self.child_run(b'', timeout=True)
        self.assertEqual(result['observed'], 'timeout')
        child.kill.assert_called_once()
        child.wait.assert_called()

    def test_receiver_ready_then_final_requires_marker(self):
        result, child, ready, _ = self.child_run(b'READY:43123\n{"observed":"allowed","markers":1,"errno":null}\n')
        self.assertEqual(result['markers'], 1)
        ready.assert_called_once_with(43123)

    def test_output_overflow_stops_without_unbounded_communicate(self):
        for wire, stderr in [(b'x' * 4097, b''), (b'{}\n', b'x' * 4097)]:
            result, child, _, _ = self.child_run(wire, stderr=stderr)
            self.assertEqual(result['observed'], 'output_overflow')
            child.kill.assert_called_once()
            child.wait.assert_called()
            child.communicate.assert_not_called()

    def test_reply_requires_receipt_before_send_denial(self):
        denial = b'{"observed":"denied","markers":0,"errno":1}\n'
        for prefix in (b'', b'READY:43123\n'):
            result, _, _, _ = self.child_run(prefix + denial, expected='denied', reply=True)
            self.assertEqual(result['observed'], 'setup_denied')
        result, _, ready, _ = self.child_run(b'READY:43123\nRECEIVED\n' + denial, expected='denied', reply=True)
        self.assertEqual(result['observed'], 'denied')
        self.assertEqual(result['stage'], 'send')
        ready.assert_called_once_with(43123)

    def test_environment_excludes_inherited_configuration(self):
        self.assertEqual(m.environment('/tmp/home', '/tmp/tmp'),
                         {'HOME': '/tmp/home', 'TMPDIR': '/tmp/tmp', 'PATH': '/usr/bin:/bin', 'LC_ALL': 'C'})

    def test_decoder_rejects_untrusted_output(self):
        for payload in ('', '{}', 'arbitrary private error', '{"observed":"denied","markers":0,"errno":2}',
                        '{"observed":"allowed","markers":true,"errno":null}',
                        '{"observed":"allowed","markers":1,"errno":null,"secret":"x"}'):
            self.assertEqual(m.decode(payload, 0)[0], 'malformed')
        self.assertEqual(m.decode('', 65, True)[0], 'policy_error')
        self.assertEqual(m.decode('{"observed":"denied","markers":0,"errno":1}', 0), ('denied', 0, 1))
        self.assertEqual(m.decode('{"observed":"allowed","markers":1,"errno":null}', 0), ('allowed', 1, None))
        self.assertEqual(m.decode('{"observed":"allowed","markers":1,"errno":null}', 0, True)[0], 'fixture_error')

    def test_child_is_fixed_stdlib_fixture(self):
        tree = ast.parse(m.CHILD)
        imports = {alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names}
        self.assertEqual(imports, {'errno', 'json', 'socket', 'sys'})
        self.assertNotIn('subprocess', m.CHILD)
        self.assertNotIn('getaddrinfo', m.CHILD)
        self.assertIn('READY', m.CHILD)

    def test_policy_only_one_receive_exception(self):
        baseline, experiment = m.profile(43123, '/tmp/fixture/private', ['/tmp/secret'])
        self.assertIn('(deny network*)', baseline)
        self.assertEqual(experiment, baseline + '(allow network-inbound (local udp "localhost:43123"))\n')
        self.assertNotIn('network-outbound', experiment)
        self.assertIn('(deny file-read* file-write* (subpath "/tmp/fixture/private"))', baseline)
        self.assertIn('(deny file-read* (subpath "/tmp/secret"))', baseline)

    def test_invalid_policy_inputs_rejected(self):
        for port in (0, -1, 65536, True, '44'):
            with self.subTest(port=port), self.assertRaises(ValueError):
                m.profile(port, '/tmp/private', [])
        for path in ('relative', '/tmp/"escape', '/tmp/\nline', '/tmp/\\escape'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                m.profile(43123, path, [])

    def test_all_security_requirements_in_matrix(self):
        rows = m.cases(43123, 43124)
        modes = {r['mode'] for r in rows}
        self.assertEqual(modes, {'udp4', 'udp6', 'wild4', 'wild6', 'ephemeral', 'tcp4', 'send', 'reply', 'read', 'write'})
        self.assertEqual(len({r['id'] for r in rows}), len(rows))
        self.assertEqual(rows[0]['expected'], 'allowed')
        for index, row in enumerate(rows):
            if row['policy'] != 'none':
                self.assertTrue(any(p['policy'] == 'none' and p['mode'] == row['mode'] and p['port'] == row['port'] for p in rows[:index]), row)
        sends = [r for r in rows if r['mode'] == 'send' and r['policy'] == 'experiment']
        self.assertEqual({r['port'] for r in sends}, {43123, 43124})
        self.assertTrue(all(r['expected'] == 'denied' for r in rows if r['mode'] in ('wild4', 'wild6', 'ephemeral') and r['policy'] != 'none'))

    def test_classification_rejects_every_non_denial(self):
        for result in ('allowed', 'timeout', 'collision', 'malformed', 'policy_error', 'unsupported', 'fixture_error'):
            with self.subTest(result=result):
                self.assertNotEqual(m.classify('denied', result, 0, 0), 'pass')
        self.assertEqual(m.classify('denied', 'denied', 0, 0), 'pass')
        self.assertEqual(m.classify('allowed', 'allowed', 0, 1), 'pass')
        for args in [('allowed', 'allowed', 0, 0), ('denied', 'denied', 0, 1), ('denied', 'denied', 65, 0), ('allowed', 'allowed', 0, 2)]:
            self.assertEqual(m.classify(*args), 'fail')
        self.assertEqual(m.classify('allowed', 'unsupported', 0, 0, 6), 'incomplete')

    def test_stops_at_first_failure(self):
        matrix = [{'id': str(i), 'expected': 'denied', 'family': 4} for i in range(3)]
        called = []
        def execute(row):
            called.append(row['id'])
            return {'observed': 'allowed', 'exit_code': 0, 'markers': 0}
        report = m.assess(matrix, execute)
        self.assertEqual(called, ['0'])
        self.assertEqual(report['status'], 'fail')
        self.assertEqual(report['not_run'], ['1', '2'])

    def test_empty_matrix_does_not_pass(self):
        self.assertEqual(m.assess([], lambda r: {})['status'], 'incomplete')

    def test_complete_synthetic_matrix_and_incomplete_stop(self):
        matrix = m.cases(43123, 43124)
        report = m.assess(matrix, lambda row: dict(observed=row['expected'], exit_code=0,
                                                  markers=int(row['expected'] == 'allowed')))
        self.assertEqual(len(report['results']), 36)
        self.assertEqual(report['status'], 'pass')
        self.assertEqual(report['not_run'], [])
        rows = [{'id': 'ipv6', 'expected': 'allowed', 'family': 6}, {'id': 'later'}]
        report = m.assess(rows, lambda row: dict(observed='unsupported', exit_code=0, markers=0))
        self.assertEqual(report['status'], 'incomplete')
        self.assertEqual(report['not_run'], ['later'])

    def test_policy_parse_error_is_not_network_denial(self):
        result, _, _, _ = self.child_run(b'\n', expected='denied', code=65, stderr=b'private/path syntax')
        self.assertEqual(result['observed'], 'policy_error')
        self.assertNotIn('private', str(result))

    def test_fixture_file_positive_and_denial_without_launch(self):
        # Execute only the file branch in-process with mocked file handles.
        # Any accidental socket construction is a hard test failure.
        for mode in ('read', 'write'):
            for denied in (False, True):
                with self.subTest(mode=mode, denied=denied):
                    handle = Mock()
                    handle.read.return_value = m.MARKER
                    handle.write.return_value = len(m.MARKER)
                    manager = Mock()
                    manager.__enter__ = Mock(return_value=handle)
                    manager.__exit__ = Mock(return_value=False)
                    with patch.object(m.sys, 'argv', ['fixture', mode, '0', '/synthetic/sentinel', '43123']), \
                         patch('builtins.open', side_effect=PermissionError(errno.EPERM, 'private') if denied else None, return_value=manager), \
                         patch('builtins.print') as output, \
                         patch.object(m.socket, 'socket', side_effect=AssertionError('no socket permitted')):
                        exec(compile(m.CHILD, '<synthetic>', 'exec'), {})
                    observed, markers, _ = m.decode(output.call_args.args[0], 0)
                    self.assertEqual(observed, 'denied' if denied else 'allowed')
                    self.assertEqual(markers, 0 if denied else 1)

    def test_fixture_bind_shapes_with_fake_sockets(self):
        for mode, host, port in [('udp4', '127.0.0.1', 43123), ('udp6', '::1', 43123),
                                 ('wild4', '0.0.0.0', 43123), ('wild6', '::', 43123),
                                 ('ephemeral', '0.0.0.0', 0)]:
            with self.subTest(mode=mode):
                channel = Mock()
                channel.__enter__ = Mock(return_value=channel)
                channel.__exit__ = Mock(return_value=False)
                channel.getsockname.return_value = (host, 43123)
                channel.recvfrom.return_value = (m.MARKER, ('127.0.0.1', 43124))
                with patch.object(m.sys, 'argv', ['fixture', mode, str(port), '/sentinel', '43123']), \
                     patch.object(m.socket, 'socket', return_value=channel), patch('builtins.print') as output:
                    exec(compile(m.CHILD, '<synthetic>', 'exec'), {})
                channel.bind.assert_called_once_with((host, port))
                channel.setsockopt.assert_not_called() if mode not in ('udp6', 'wild6') else None
                self.assertEqual(m.decode(output.call_args.args[0], 0)[0], 'allowed')

    def test_fixture_reply_denial_occurs_after_receipt(self):
        channel = Mock()
        channel.__enter__ = Mock(return_value=channel)
        channel.__exit__ = Mock(return_value=False)
        channel.getsockname.return_value = ('127.0.0.1', 43123)
        channel.recvfrom.return_value = (m.MARKER, ('127.0.0.1', 43125))
        channel.sendto.side_effect = PermissionError(errno.EPERM, 'private')
        with patch.object(m.sys, 'argv', ['fixture', 'reply', '43124', '/sentinel', '43123']), \
             patch.object(m.socket, 'socket', return_value=channel), patch('builtins.print') as output:
            exec(compile(m.CHILD, '<synthetic>', 'exec'), {})
        channel.bind.assert_called_once_with(('127.0.0.1', 43123))
        channel.sendto.assert_called_once_with(m.MARKER, ('127.0.0.1', 43124))
        self.assertEqual(output.call_args_list[0].args[0], 'READY:43123')
        self.assertEqual(output.call_args_list[1].args[0], 'RECEIVED')
        self.assertEqual(m.decode(output.call_args.args[0], 0), ('denied', 0, errno.EPERM))


if __name__ == '__main__':
    unittest.main()
