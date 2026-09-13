import builtins
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import export_metadata as exporter


class ExportTests(unittest.TestCase):
    def test_module_import_does_not_import_jwt(self):
        original = builtins.__import__
        def guarded(name, *args, **kwargs):
            if name == 'jwt':
                self.fail('JWT imported outside asc()')
            return original(name, *args, **kwargs)
        spec = importlib.util.spec_from_file_location('offline_export', exporter.__file__)
        with mock.patch('builtins.__import__', side_effect=guarded):
            spec.loader.exec_module(importlib.util.module_from_spec(spec))

    def run_diff(self, root, responses):
        original = open
        def read_only(path, mode='r', *args, **kwargs):
            self.assertFalse(any(flag in mode for flag in 'wax+'), f'write attempted: {path}')
            self.assertTrue(Path(path).is_relative_to(root), f'credential/outside read: {path}')
            return original(path, mode, *args, **kwargs)
        with mock.patch.object(exporter, 'asc', side_effect=responses) as asc, \
                mock.patch('builtins.open', side_effect=read_only), \
                mock.patch('os.makedirs', side_effect=AssertionError('mkdir attempted')), \
                mock.patch('urllib.request.urlopen', side_effect=AssertionError('network attempted')), \
                mock.patch('os.environ', {}), \
                mock.patch('sys.argv', ['export', '--out', str(root), '--diff']), \
                contextlib.redirect_stdout(io.StringIO()) as output:
            with self.assertRaises(SystemExit) as result:
                exporter.main()
            self.assertEqual(asc.call_count, 4)
        return result.exception.code, output.getvalue()

    def test_diff_missing_changed_and_clean_are_read_only(self):
        responses = [
            {'data': [{'id': 'v', 'attributes': {'versionString': 'fixture'}}]},
            {'data': [{'attributes': {'locale': 'en-US', 'description': 'hello'}}]},
            {'data': [{'id': 'i'}]},
            {'data': [{'attributes': {'locale': 'en-US', 'name': 'Fixture'}}]},
        ]
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'metadata'
            self.assertEqual(self.run_diff(root, responses)[0], 1)
            self.assertFalse(root.exists())
            locale = root / 'en-US'
            locale.mkdir(parents=True)
            for name in [*exporter.VERSION_FIELDS.values(), *exporter.INFO_FIELDS.values()]:
                value = {'description.txt': 'hello\n', 'name.txt': 'Fixture\n'}.get(name, '\n')
                (locale / name).write_text(value)
            before = {p: p.read_bytes() for p in locale.iterdir()}
            self.assertEqual(self.run_diff(root, responses)[0], 0)
            (locale / 'description.txt').write_text('different\n')
            before[locale / 'description.txt'] = b'different\n'
            status, output = self.run_diff(root, responses)
            self.assertEqual(status, 1)
            self.assertIn('1 file(s)', output)
            self.assertEqual(before, {p: p.read_bytes() for p in locale.iterdir()})


if __name__ == '__main__':
    unittest.main()
