import contextlib
import copy
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import verify_store_metadata as lint


class LintTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.metadata = self.root / 'metadata'
        self.metadata.mkdir()
        self.prose = self.metadata / 'description.txt'
        self.prose.write_text('Meet people.', encoding='utf-8')
        self.rules = self.root / 'rules.json'
        self.document = {'rules': [{'id': 'test', 'severity': 'error',
            'patterns': ['forbidden'], 'why': 'reason', 'allowed_when': 'shipped',
            'owner': 'owner'}]}
        self.rules.write_text(json.dumps(self.document), encoding='utf-8')

    def cli(self, *roots, extra=()):
        output = io.StringIO()
        with mock.patch('sys.argv', ['lint', '--rules', str(self.rules),
                                    *map(str, roots or [self.metadata]), *extra]), \
                contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            try:
                status = lint.main()
            except Exception as exc:
                self.fail(f'CLI leaked {type(exc).__name__}: {exc}')
        return status, output.getvalue()

    def test_claim_status_and_warn_only(self):
        self.assertEqual(self.cli()[0], 0)
        self.prose.write_text('first line\nFORBIDDEN', encoding='utf-8')
        status, output = self.cli()
        self.assertEqual(status, 1)
        self.assertIn(':2', output)
        self.assertEqual(self.cli(extra=['--warn-only'])[0], 0)
        self.document['rules'][0]['severity'] = 'warn'
        self.rules.write_text(json.dumps(self.document))
        self.assertEqual(self.cli()[0], 0)

    def test_each_root_must_exist_be_directory_and_have_prose(self):
        empty = self.root / 'empty'
        empty.mkdir()
        changelogs = self.root / 'changelogs'
        changelogs.mkdir()
        (changelogs / '123.txt').write_text('Release')
        for bad in [self.root / 'missing', self.prose, empty, changelogs]:
            for extra in [[], ['--warn-only']]:
                with self.subTest(bad=bad, extra=extra):
                    status, output = self.cli(self.metadata, bad, extra=extra)
                    self.assertEqual(status, 2)
                    self.assertNotIn('PASS', output)

    def test_invalid_utf8_is_input_failure_even_warn_only(self):
        self.prose.write_bytes(b'\xff')
        self.assertEqual(self.cli(extra=['--warn-only'])[0], 2)

    def test_unreadable_file_and_rules_fail_closed(self):
        original = open
        for target in [self.prose, self.rules]:
            def denied(path, *args, **kwargs):
                if Path(path) == target:
                    raise PermissionError('denied')
                return original(path, *args, **kwargs)
            with self.subTest(target=target), mock.patch('builtins.open', side_effect=denied):
                self.assertEqual(self.cli(extra=['--warn-only'])[0], 2)

    def test_unreadable_root_or_nested_directory_fail_closed(self):
        nested = self.metadata / 'nested'
        nested.mkdir()
        original = os.scandir
        for target in [self.metadata, nested]:
            def denied(path):
                if Path(path) == target:
                    raise PermissionError('denied')
                return original(path)
            with self.subTest(target=target), mock.patch('os.scandir', side_effect=denied):
                self.assertEqual(self.cli(extra=['--warn-only'])[0], 2)

    def test_malformed_rules_fail_closed(self):
        documents = [None, [], {}, {'rules': None}, {'rules': []}, {'rules': [None]}]
        for key in ['id', 'severity', 'patterns', 'why', 'allowed_when', 'owner']:
            value = copy.deepcopy(self.document)
            del value['rules'][0][key]
            documents.append(value)
        for key, invalids in {'id': ['', 1], 'severity': ['warning', None],
                             'patterns': ['', [], [1], ['[']], 'why': [None],
                             'allowed_when': [False], 'owner': [[]]}.items():
            for invalid in invalids:
                value = copy.deepcopy(self.document)
                value['rules'][0][key] = invalid
                documents.append(value)
        duplicate = copy.deepcopy(self.document)
        duplicate['rules'] *= 2
        documents.append(duplicate)
        for value in documents:
            with self.subTest(value=value):
                self.rules.write_text(json.dumps(value))
                self.assertEqual(self.cli(extra=['--warn-only'])[0], 2)
        for raw in [b'{', b'\xff']:
            self.rules.write_bytes(raw)
            self.assertEqual(self.cli()[0], 2)
        self.rules.unlink()
        self.assertEqual(self.cli()[0], 2)

    def test_supported_names_and_empty_optional_fields(self):
        self.prose.unlink()
        for name in lint.PROSE:
            (self.metadata / name).write_text('')
        self.assertEqual(self.cli()[0], 0)

    def test_regex_overflow_and_recursion_are_input_errors(self):
        for pattern in ['a{999999999999999999999}', '(' * 2000 + 'a' + ')' * 2000]:
            self.document['rules'][0]['patterns'] = [pattern]
            self.rules.write_text(json.dumps(self.document))
            for extra in [[], ['--warn-only']]:
                with self.subTest(pattern=pattern[:30], extra=extra):
                    status, output = self.cli(extra=extra)
                    self.assertEqual(status, 2)
                    self.assertIn('INPUT ERROR', output)
                    self.assertNotIn('PASS', output)

    def test_eight_locale_drafts_and_safe_name_filter(self):
        self.prose.unlink()
        locales = ['ko', 'ja', 'zh-Hans', 'pt-BR', 'es-ES', 'fr-CA', 'ar-SA', 'es-MX']
        for locale in locales:
            (self.metadata / f'{locale}.description.txt').write_text('forbidden')
        for name in ['notes.description.txt', 'description.txt.bak', '.description.txt',
                     'en..description.txt', 'en_US.description.txt', 'README.md']:
            (self.metadata / name).write_text('forbidden')
        status, output = self.cli()
        self.assertEqual(status, 1)
        self.assertIn('8 prose files', output)
        self.assertIn('ERRORS (8)', output)

    def test_sorted_traversal_and_resolved_path_dedup_per_root(self):
        self.prose.unlink()
        for name in ['z', 'a']:
            folder = self.metadata / name
            folder.mkdir()
            (folder / 'description.txt').write_text('forbidden')
        (self.metadata / 'subtitle.txt').symlink_to(self.metadata / 'a/description.txt')
        status, output = self.cli(self.metadata, self.metadata / 'a', self.metadata)
        self.assertEqual(status, 1)
        self.assertIn('2 prose files', output)
        self.assertIn('ERRORS (2)', output)
        first = self.cli(self.metadata)[1]
        self.assertEqual(first, self.cli(self.metadata)[1])

    def test_broken_prose_symlink_fails(self):
        (self.metadata / 'subtitle.txt').symlink_to(self.metadata / 'absent')
        self.assertEqual(self.cli()[0], 2)

    def test_preserved_rule_history(self):
        rules = json.loads((Path(lint.HERE) / 'claims.json').read_text())
        self.assertEqual(len(rules['rules']), 5)
        self.assertEqual({r['id'] for r in rules['_retired']},
                         {'sos-contact-delivery', 'collect-badges', 'actionable-groups'})
        self.assertFalse({r['id'] for r in rules['rules']} &
                         {r['id'] for r in rules['_retired']})

    def test_actual_active_rules_and_retired_claims(self):
        self.rules = Path(lint.HERE) / 'claims.json'
        for text, expected in [('all users are verified', 1), ('AI Concierge', 1),
                               ('read receipts', 1), ('request to join', 1),
                               ('no paywall', 0),
                               ('SOS shares your live location with emergency contacts. '
                                'Collect badges. Join groups.', 0)]:
            with self.subTest(text=text):
                self.prose.write_text(text)
                self.assertEqual(self.cli()[0], expected)

    def test_fastlane_platform_checks_are_separate(self):
        snippet = (Path(lint.HERE) / 'Fastfile.snippet').read_text()
        for platform, upload in [('ios', 'deliver('), ('play', 'supply(')]:
            lint_lane = snippet.split(f'lane :verify_{platform}_metadata do', 1)[1].split('\nend', 1)[0]
            self.assertIn(f'{platform}_metadata)', lint_lane)
            upload_lane = snippet.split(f'lane :push_{platform}_metadata do', 1)[1].split('\nend', 1)[0]
            self.assertLess(upload_lane.index(f'verify_{platform}_metadata'), upload_lane.index(upload))

    def test_fastlane_ios_example_is_metadata_only_without_submission(self):
        snippet = (Path(lint.HERE) / 'Fastfile.snippet').read_text()
        lane = snippet.split('lane :push_ios_metadata do', 1)[1].split('\nend', 1)[0]
        self.assertIn('skip_screenshots: true', lane)
        self.assertIn('submit_for_review: false', lane)
        self.assertIn('force: false', lane)
        self.assertNotIn('overwrite_screenshots', lane)

    def test_fastlane_play_example_skips_images_screenshots_and_changelogs(self):
        snippet = (Path(lint.HERE) / 'Fastfile.snippet').read_text()
        lane = snippet.split('lane :push_play_metadata do', 1)[1].split('\nend', 1)[0]
        for option in ['skip_upload_images', 'skip_upload_screenshots', 'skip_upload_changelogs']:
            with self.subTest(option=option):
                self.assertIn(f'{option}: true', lane)


if __name__ == '__main__':
    unittest.main()
