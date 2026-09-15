"""Synthetic, offline contract tests for the standalone keyword validator."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


SCRIPT = Path(__file__).with_name('verify_apple_keywords.py')
NETWORK_ATTEMPTS = []


def deny_test_network(event, args):
    if event.startswith('socket.'):
        NETWORK_ATTEMPTS.append(event)
        raise AssertionError('network operations forbidden')


sys.addaudithook(deny_test_network)
# Auditing begins before loading the validator and fails even if it catches the
# denial. No listener, live request, credentials or external dependency is used.
GUARDED_RUNNER = '''
import runpy, sys
attempts = []
def deny_network(event, args):
    if event.startswith("socket."):
        attempts.append(event)
        raise AssertionError("network operations forbidden")
sys.addaudithook(deny_network)
sys.argv = sys.argv[1:]
try:
    runpy.run_path(sys.argv[0], run_name="__main__")
finally:
    if attempts:
        raise AssertionError("validator attempted network access")
'''


class KeywordValidatorTests(unittest.TestCase):
    def setUp(self):
        NETWORK_ATTEMPTS.clear()
        self.addCleanup(lambda: self.assertEqual(NETWORK_ATTEMPTS, []))
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.fixtures = []

    def fixture(self, content, name='input', basename='keywords.txt'):
        path = self.root / name / basename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        self.fixtures.append(path)
        return path

    def hashes(self):
        return {str(path): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in self.fixtures}

    def run_cli(self, paths, counts, code):
        before = self.hashes()
        self.assertTrue(SCRIPT.is_file(), 'missing standalone validator implementation')
        try:
            result = subprocess.run(
                [sys.executable, '-B', '-c', GUARDED_RUNNER, str(SCRIPT),
                 *(str(path) for path in paths)],
                capture_output=True, text=True, timeout=5, cwd=self.root,
            )
        finally:
            self.assertEqual(before, self.hashes(), 'input bytes changed')
        self.assertEqual(result.returncode, code, result.stderr)
        self.assertEqual(result.stderr, '')
        lines = result.stdout.splitlines()
        self.assertEqual(len(lines), len(counts), result.stdout)
        rows = [json.loads(line) for line in lines]
        for row, count in zip(rows, counts):
            self.assertEqual(set(row), {'path', 'bytes', 'limit'})
            self.assertEqual(row['bytes'], count)
            self.assertEqual(row['limit'], 100)
            self.assertIsInstance(row['path'], str)
        return rows, result.stdout

    def assert_one(self, content, count, code):
        path = self.fixture(content)
        rows, output = self.run_cli([path], [count], code)
        self.assertEqual(rows[0]['path'], str(path))
        return output

    def test_ascii_byte_boundaries(self):
        for size in (99, 100, 101):
            with self.subTest(size=size):
                self.assert_one(b'x' * size, size, int(size > 100))

    def test_arabic_cjk_emoji_byte_boundaries(self):
        for symbol in ('ش', '旅', '🧭'):
            for size in (99, 100, 101):
                with self.subTest(symbol=symbol, size=size):
                    unit = symbol.encode('utf-8')
                    data = unit * (size // len(unit)) + b'a' * (size % len(unit))
                    self.assert_one(data, size, int(size > 100))

    def test_combining_sequences_are_not_normalized(self):
        self.assert_one(('e\u0301' * 34).encode('utf-8'), 102, 1)

    def test_printable_whitespace_is_retained(self):
        self.assert_one(('  private\u00a0\u2003 ').encode('utf-8'), 15, 0)

    def test_only_spaces_are_not_stripped(self):
        self.assert_one(b' ' * 101, 101, 1)

    def test_one_terminal_lf_or_crlf_is_removed(self):
        for ending in (b'\n', b'\r\n'):
            with self.subTest(ending=ending):
                self.assert_one(b'x' * 100 + ending, 100, 0)

    def test_empty_and_empty_line_are_invalid(self):
        for data in (b'', b'\n', b'\r\n'):
            with self.subTest(data=data):
                self.assert_one(data, None, 2)

    def test_interior_repeated_and_lone_line_endings_are_invalid(self):
        for data in (b'a\nb', b'a\r\nb', b'a\n\n', b'a\r\n\r\n',
                     b'a\r', b'a\rb', b'a\n\r\n', b'a\r\r\n'):
            with self.subTest(data=data):
                self.assert_one(data, None, 2)

    def test_all_ascii_controls_are_invalid(self):
        for control in (*range(32), 127):
            with self.subTest(control=control):
                self.assert_one(b'private' + bytes([control]) + b'secret', None, 2)

    def test_bom_is_invalid_anywhere(self):
        for text in ('\ufeffprivate', 'pri\ufeffvate', 'private\ufeff'):
            with self.subTest(text=text):
                self.assert_one(text.encode('utf-8'), None, 2)

    def test_strict_utf8_and_invalid_precedes_length(self):
        for data in (b'\xff', b'\xc0\x80', b'\xed\xa0\x80', b'\xf0\x9f',
                     b'x' * 101 + b'\xff', b'x' * 101 + b'\x00'):
            with self.subTest(data=data):
                self.assert_one(data, None, 2)

    def test_missing_path_is_invalid(self):
        self.run_cli([self.root / 'missing' / 'keywords.txt'], [None], 2)

    def test_symlink_loop_is_invalid_and_processing_continues(self):
        loop = self.root / 'loop'
        loop.symlink_to(loop)
        good = self.fixture(b'private')
        self.run_cli([loop / 'keywords.txt', good], [None, 7], 2)

    def test_embedded_nul_path_is_safe_and_processing_continues(self):
        # exec argv cannot contain NUL; exercise the callable boundary directly.
        module = self.load_validator()
        good = self.fixture(b'private')
        before = self.hashes()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            self.assertEqual(module.main(['bad\x00/keywords.txt', str(good)]), 2)
        self.assertEqual(before, self.hashes())
        rows = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(rows, [
            {'path': 'bad\x00/keywords.txt', 'bytes': None, 'limit': 100},
            {'path': str(good), 'bytes': 7, 'limit': 100},
        ])

    def test_wrong_basename_is_invalid(self):
        for basename in ('Keywords.txt', 'keywords.json', 'not-keywords.txt'):
            with self.subTest(basename=basename):
                path = self.fixture(b'private', basename=basename)
                self.run_cli([path], [None], 2)

    def test_directory_is_invalid(self):
        path = self.root / 'keywords.txt'
        path.mkdir()
        self.run_cli([path], [None], 2)

    def test_fifo_is_rejected_without_blocking(self):
        path = self.root / 'keywords.txt'
        os.mkfifo(path)
        self.run_cli([path], [None], 2)

    def test_final_symlink_is_invalid_even_after_seen_target(self):
        target = self.fixture(b'private')
        link = self.root / 'alias' / 'keywords.txt'
        link.parent.mkdir()
        link.symlink_to(target)
        rows, _ = self.run_cli([target, link], [7, None], 2)
        self.assertEqual([row['path'] for row in rows], [str(target), str(link)])

    def test_dangling_symlink_is_invalid(self):
        link = self.root / 'keywords.txt'
        link.symlink_to(self.root / 'absent')
        self.run_cli([link], [None], 2)

    def test_parent_symlink_is_allowed_and_resolved_paths_deduplicate(self):
        target = self.fixture(b'private')
        alias = self.root / 'alias'
        alias.symlink_to(target.parent, target_is_directory=True)
        self.run_cli([alias / 'keywords.txt', target], [7], 0)

    def test_deduplication_preserves_first_input_order(self):
        first = self.fixture(b'private', 'first')
        second = self.fixture(b'x' * 101, 'second')
        rows, _ = self.run_cli([second, first, second, first], [101, 7], 1)
        self.assertEqual([row['path'] for row in rows], [str(second), str(first)])

    def test_relative_and_absolute_paths_deduplicate(self):
        path = self.fixture(b'private')
        self.run_cli([path.relative_to(self.root), path], [7], 0)

    def test_distinct_hardlink_paths_are_not_deduplicated(self):
        first = self.fixture(b'private')
        second = self.root / 'other' / 'keywords.txt'
        second.parent.mkdir()
        os.link(first, second)
        self.fixtures.append(second)
        self.run_cli([first, second], [7, 7], 0)

    def test_invalid_overrides_oversize_and_processing_continues(self):
        over = self.fixture(b'x' * 101, 'over')
        bad = self.fixture(b'\xffprivate', 'bad')
        good = self.fixture(b'private', 'good')
        for paths, counts in (([over, bad, good], [101, None, 7]),
                              ([bad, good, over], [None, 7, 101])):
            with self.subTest(paths=paths):
                self.run_cli(paths, counts, 2)

    def test_safe_output_escapes_paths_and_never_exposes_contents(self):
        valid = self.fixture(b'SYNTHETIC_SECRET_VALID', 'line\nbreak\t"quoted')
        bad = self.fixture(b'SYNTHETIC_SECRET_INVALID\xff', 'bad\rpath')
        missing = self.root / 'missing\npath' / 'keywords.txt'
        rows, output = self.run_cli([valid, bad, missing], [22, None, None], 2)
        self.assertEqual([row['path'] for row in rows], list(map(str, [valid, bad, missing])))
        for secret in ('SYNTHETIC_SECRET', 'UnicodeDecodeError', 'Traceback', 'Errno'):
            self.assertNotIn(secret, output)
        self.assertIn('\\n', output)
        self.assertIn('\\r', output)
        self.assertIn('\\t', output)

    def test_missing_arguments_emits_fixed_usage_only(self):
        self.assertTrue(SCRIPT.is_file(), 'missing standalone validator implementation')
        result = subprocess.run([sys.executable, '-B', '-c', GUARDED_RUNNER, str(SCRIPT)],
                                capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, '')
        self.assertEqual(result.stderr,
                         'Usage: verify_apple_keywords.py PATH/keywords.txt [PATH/keywords.txt ...]\n')

    def test_network_guard_rejects_attempt_before_network_use(self):
        probe = self.root / 'probe.py'
        probe.write_text('import socket\ntry:\n socket.socket()\nexcept AssertionError:\n pass\n')
        result = subprocess.run([sys.executable, '-B', '-c', GUARDED_RUNNER, str(probe)],
                                capture_output=True, text=True, timeout=5)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('validator attempted network access', result.stderr)

    def load_validator(self):
        self.assertTrue(SCRIPT.is_file(), 'missing standalone validator implementation')
        spec = importlib.util.spec_from_file_location('keyword_validator_under_test', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_open_uses_read_only_nonfollowing_nonblocking_flags(self):
        path = self.fixture(b'private')
        module = self.load_validator()
        real_open = os.open
        flags_seen = []
        def record_open(name, flags, *args, **kwargs):
            flags_seen.append(flags)
            return real_open(name, flags, *args, **kwargs)
        before = self.hashes()
        with mock.patch.object(module.os, 'open', side_effect=record_open), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(module.main([str(path)]), 0)
        self.assertEqual(before, self.hashes())
        self.assertEqual(len(flags_seen), 1)
        self.assertEqual(flags_seen[0] & os.O_ACCMODE, os.O_RDONLY)
        self.assertTrue(flags_seen[0] & os.O_NOFOLLOW)
        self.assertTrue(flags_seen[0] & os.O_NONBLOCK)

    def test_final_component_swap_to_symlink_or_fifo_is_invalid(self):
        for replacement in ('symlink', 'fifo'):
            with self.subTest(replacement=replacement):
                module = self.load_validator()
                target = self.fixture(b'private', replacement + '-target')
                path = self.fixture(b'original', replacement + '-input')
                before = self.hashes()
                original = path.read_bytes()
                real_open = os.open
                real_close = os.close
                descriptors = []
                def swapped_open(name, flags, *args, **kwargs):
                    path.unlink()
                    if replacement == 'symlink':
                        path.symlink_to(target)
                    else:
                        os.mkfifo(path)
                    fd = real_open(name, flags, *args, **kwargs)
                    descriptors.append(fd)
                    return fd
                output = io.StringIO()
                try:
                    with mock.patch.object(module.os, 'open', side_effect=swapped_open), \
                         mock.patch.object(module.os, 'close', wraps=real_close) as close, \
                         contextlib.redirect_stdout(output):
                        self.assertEqual(module.main([str(path)]), 2)
                    for fd in descriptors:
                        close.assert_any_call(fd)
                    self.assertEqual(json.loads(output.getvalue())['bytes'], None)
                    self.assertEqual(target.read_bytes(), b'private')
                finally:
                    path.unlink()
                    path.write_bytes(original)
                self.assertEqual(before, self.hashes())


if __name__ == '__main__':
    unittest.main()
