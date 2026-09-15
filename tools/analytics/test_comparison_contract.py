"""Inline synthetic contract fixtures; no provider data or metric values."""
import unittest
import ast
from pathlib import Path
from dataclasses import FrozenInstanceError, fields, replace
from datetime import date, datetime
try:
    import comparison_contract as c
except ModuleNotFoundError:
    c = None


class StructureTests(unittest.TestCase):
    def test_contract_exists(self):
        self.assertIsNotNone(c, 'synthetic comparison contract not implemented')

    @unittest.skipIf(c is None, 'contract not yet implemented')
    def test_strict_selection_and_top_level(self):
        s, a, p = fixture()
        for bad in (None, {}, (), True, 'SECRET'):
            self.assertEqual(c.evaluate(bad, a, p), c.INVALID)
            self.assertEqual(c.evaluate(s, bad, p), c.INVALID)
            self.assertEqual(c.evaluate(s, a, bad), c.INVALID)
        for name, bad in [('start', datetime(2026, 9, 1)), ('end', 'SECRET'),
                          ('contiguous_required', 1), ('policy', 'INTERSECTION'),
                          ('apple_metric', 'COUNTS'), ('apple_grain', []),
                          ('requested_operation', None)]:
            self.assertEqual(c.evaluate(replace(s, **{name: bad}), a, p), c.INVALID)
        self.assertEqual(c.evaluate(replace(s, start=s.end, end=s.start), a, p), c.INVALID)
        with self.assertRaises(FrozenInstanceError):
            s.start = s.end
        self.assertEqual(s.requested_operation, c.Operation.NONE)

    @unittest.skipIf(c is None, 'contract not yet implemented')
    def test_strict_evidence_and_observation(self):
        s, a, p = fixture()
        for name, bad in [('observations', []), ('gates', []), ('family', 'SECRET'),
                          ('boundary', 'UTC'), ('versions', []), ('platform', True)]:
            self.assertEqual(c.evaluate(s, replace(a, **{name: bad}), p), c.INVALID)
        for name, bad in [('day', datetime(2026, 9, 1)), ('grain', []),
                          ('presence', 'PRESENT'), ('version', 1), ('logical_report', None)]:
            row = replace(a.observations[0], **{name: bad})
            self.assertEqual(c.evaluate(s, replace(a, observations=(row,)), p), c.INVALID)


class GateTests(unittest.TestCase):
    def test_each_semantic_gate_blocks_both_platforms(self):
        s, a, p = fixture()
        for gate in c.Gate:
            for status in (c.GateStatus.UNKNOWN, c.GateStatus.FAILED):
                for platform in ('apple', 'play'):
                    with self.subTest(gate=gate, status=status, platform=platform):
                        e = a if platform == 'apple' else p
                        e = replace(e, gates=tuple((g, status if g == gate else v) for g, v in e.gates))
                        result = c.evaluate(s, e if platform == 'apple' else a, e if platform == 'play' else p)
                        self.assertEqual(result.eligibility, c.Eligibility.UNAVAILABLE)
                        self.assertIn(c.Reason.GATE_UNVERIFIED, result.reasons)
                        self.assertFalse(result.coverage_verified)
                        self.assertEqual(result.shared_dates, ())
        self.assertIn(c.Reason.GATE_UNVERIFIED, c.evaluate(s, replace(a, gates=()), p).reasons)

    def test_verified_status_cannot_override_families_boundaries_descriptors(self):
        s, a, p = fixture()
        for family in (c.Family.APPLE_DOWNLOADS, c.Family.APPLE_DETAILED_DAILY, c.Family.APPLE_STANDARD_MONTHLY):
            self.assertIn(c.Reason.FAMILY_MISMATCH, c.evaluate(s, replace(a, family=family), p).reasons)
            self.assertIn(c.Reason.FAMILY_MISMATCH, c.evaluate(replace(s, apple_family=family), a, p).reasons)
        for boundary in (c.DayBoundary.UNKNOWN, c.DayBoundary.PACIFIC):
            self.assertIn(c.Reason.BOUNDARY_UNVERIFIED, c.evaluate(s, replace(a, boundary=boundary), p).reasons)
        for f in fields(c.Evidence)[6:]:
            self.assertIn(c.Reason.DESCRIPTOR_MISSING, c.evaluate(s, replace(a, **{f.name: ' '}), p).reasons)

    def test_no_aggregation_or_cross_platform_operations(self):
        s, a, p = fixture()
        for operation in c.Operation:
            if operation is c.Operation.NONE:
                continue
            for metric in c.AppleMetric:
                result = c.evaluate(replace(s, requested_operation=operation, apple_metric=metric), a, p)
                self.assertIn(c.Reason.OPERATION_FORBIDDEN, result.reasons)
                self.assertEqual(result.eligibility, c.Eligibility.UNAVAILABLE)
        self.assertEqual(len({m.value for m in c.PlayMetric}), 10)

    def test_versions_require_one_selected_with_superseded_provenance_only(self):
        s, a, p = fixture()
        v = a.versions[0]
        for versions in ((), (v, v), (v, replace(v, selected_version='v2')),
                         (replace(v, identity=''),), (replace(v, checksum=''),),
                         (replace(v, superseded_versions=('v1',)),)):
            self.assertIn(c.Reason.VERSION_UNRESOLVED, c.evaluate(s, replace(a, versions=versions), p).reasons)
        corrected = replace(a, versions=(replace(v, selected_version='v2', superseded_versions=('v1',)),),
                            observations=tuple(replace(o, version='v2') for o in a.observations))
        self.assertNotIn(c.Reason.VERSION_UNRESOLVED, c.evaluate(s, corrected, p).reasons)
        old_and_new = replace(corrected, observations=corrected.observations + a.observations)
        self.assertIn(c.Reason.VERSION_UNRESOLVED, c.evaluate(s, old_and_new, p).reasons)

    def test_checksum_applicability_is_explicit_and_fail_closed(self):
        self.assertTrue(hasattr(c, 'ChecksumStatus'), 'typed checksum applicability missing')
        s, a, p = fixture()
        v = a.versions[0]
        for status in (c.ChecksumStatus.UNKNOWN, c.ChecksumStatus.FAILED):
            r = c.evaluate(s, replace(a, versions=(replace(v, checksum_status=status),)), p)
            self.assertIn(c.Reason.VERSION_UNRESOLVED, r.reasons)
        for status in ('VERIFIED', True, 1, None):
            self.assertEqual(c.evaluate(s, replace(a, versions=(replace(v, checksum_status=status),)), p), c.INVALID)
        na = replace(v, checksum_status=c.ChecksumStatus.NOT_APPLICABLE,
                     checksum='', checksum_na_reason='Synthetic family has no checksum')
        self.assertEqual(c.evaluate(s, replace(a, versions=(na,)), p).eligibility, c.Eligibility.ELIGIBLE_SYNTHETIC)
        for invalid in (replace(na, checksum_na_reason=' '), replace(na, identity=''),
                        replace(v, checksum=''), replace(v, checksum_na_reason='contradiction')):
            self.assertIn(c.Reason.VERSION_UNRESOLVED, c.evaluate(s, replace(a, versions=(invalid,)), p).reasons)


class CoverageTests(unittest.TestCase):
    def test_explicit_platform_categories_and_coverage_pairs(self):
        s, a, p = fixture()
        r = c.evaluate(s, a, p)
        self.assertTrue(hasattr(r, 'apple_coverage'), 'coverage pairs missing')
        self.assertEqual((r.apple_coverage, r.play_coverage, r.shared_coverage), ((3, 3),) * 3)
        a = replace(a, observations=(replace(a.observations[0], presence=c.Presence.SUPPRESSED),
                                     replace(a.observations[1], presence=c.Presence.UNKNOWN)))
        p = replace(p, observations=(replace(p.observations[0], presence=c.Presence.MISSING),) + p.observations[1:])
        r = c.evaluate(s, a, p)
        self.assertEqual(r.apple_missing_dates, (s.end,))
        self.assertEqual(r.apple_suppressed_dates, (s.start,))
        self.assertEqual(r.apple_unknown_dates, (date(2026, 9, 2),))
        self.assertEqual(r.play_missing_dates, (s.start,))
        self.assertEqual((r.play_suppressed_dates, r.play_unknown_dates), ((), ()))
        self.assertEqual((r.apple_coverage, r.play_coverage, r.shared_coverage), ((0, 3), (2, 3), (0, 3)))
        r = c.evaluate(s, replace(a, gates=()), p)
        self.assertEqual((r.apple_coverage, r.play_coverage, r.shared_coverage), (None,) * 3)
        self.assertFalse(r.coverage_verified)
        self.assertEqual(r.apple_suppressed_dates, (s.start,))

    def test_complete_unique_dates_and_native_labels(self):
        s, a, p = fixture()
        r = c.evaluate(s, a, p)
        self.assertEqual(r.eligibility, c.Eligibility.ELIGIBLE_SYNTHETIC)
        self.assertEqual(r.intended_days, 3)
        self.assertEqual(r.shared_dates, tuple(o.day for o in a.observations))
        self.assertTrue(r.coverage_verified)
        self.assertEqual(r.apple_metric, s.apple_metric)
        self.assertEqual(r.apple_grain, s.apple_grain)

    def test_missing_interior_and_endpoints_keep_intended_denominator(self):
        s, a, p = fixture()
        for index in range(3):
            reduced = replace(a, observations=a.observations[:index] + a.observations[index + 1:])
            r = c.evaluate(s, reduced, p)
            self.assertEqual(r.eligibility, c.Eligibility.GAPPED)
            self.assertEqual(r.intended_days, 3)
            self.assertEqual(r.missing_dates, (a.observations[index].day,))
            self.assertIn((c.Platform.APPLE, a.observations[index].day, c.Reason.MISSING), r.exclusions)
            self.assertIn(c.Reason.INCOMPLETE_INTERVAL, r.reasons)
            self.assertEqual(c.evaluate(replace(s, contiguous_required=True), reduced, p).eligibility, c.Eligibility.UNAVAILABLE)

    def test_duplicate_full_grain_vs_dimension_rows(self):
        s, a, p = fixture()
        duplicate = replace(a, observations=a.observations + (a.observations[0],))
        r = c.evaluate(s, duplicate, p)
        self.assertIn(c.Reason.DUPLICATE_GRAIN, r.reasons)
        self.assertNotIn(s.start, r.apple_dates)
        dimensional = replace(a, observations=a.observations + (replace(a.observations[0], grain=('other',)),))
        r = c.evaluate(s, dimensional, p)
        self.assertEqual(r.eligibility, c.Eligibility.ELIGIBLE_SYNTHETIC)
        self.assertEqual(len(r.apple_dates), 3)
        wrong_arity = replace(a, observations=(replace(a.observations[0], grain=('one', 'two')),))
        self.assertIn(c.Reason.GRAIN_MISMATCH, c.evaluate(s, wrong_arity, p).reasons)

    def test_zero_absent_suppressed_unknown_and_mixed_presence(self):
        s, a, p = fixture()
        for presence in c.Presence:
            changed = replace(a, observations=(replace(a.observations[0], presence=presence),) + a.observations[1:])
            r = c.evaluate(s, changed, p)
            self.assertEqual(s.start in r.apple_dates, presence in (c.Presence.PRESENT, c.Presence.EXPLICIT_ZERO))
            if presence in (c.Presence.MISSING, c.Presence.SUPPRESSED, c.Presence.UNKNOWN):
                self.assertIn(c.Reason[presence.name], r.reasons)
                # A present different grain cannot rescue the incomplete date.
                mixed = replace(changed, observations=changed.observations + (replace(a.observations[0], grain=('other',)),))
                self.assertNotIn(s.start, c.evaluate(s, mixed, p).apple_dates)
        mixed = replace(a, observations=a.observations + (replace(a.observations[0], presence=c.Presence.SUPPRESSED),))
        self.assertIn(c.Reason.INCONSISTENT_PRESENCE, c.evaluate(s, mixed, p).reasons)

    def test_disjoint_september_empty_and_outside_dates(self):
        s, a, p = fixture()
        s = replace(s, end=date(2026, 9, 12))
        a = replace(a, observations=tuple(replace(a.observations[0], day=date(2026, 9, d)) for d in (10, 11, 12)))
        p = replace(p, observations=tuple(replace(p.observations[0], day=date(2026, 9, d)) for d in range(1, 9)))
        r = c.evaluate(s, a, p)
        self.assertEqual(r.eligibility, c.Eligibility.UNAVAILABLE)
        self.assertEqual(r.shared_dates, ())
        self.assertEqual(r.intended_days, 12)
        self.assertIn(c.Reason.EMPTY_INTERSECTION, r.reasons)
        self.assertEqual(c.evaluate(s, replace(a, observations=()), p).eligibility, c.Eligibility.UNAVAILABLE)
        s, a, p = fixture()
        outside = replace(a, observations=a.observations + (replace(a.observations[0], day=date(2026, 8, 31)),))
        r = c.evaluate(s, outside, p)
        self.assertIn(c.Reason.OUTSIDE_INTERVAL, r.reasons)
        self.assertEqual(r.intended_days, 3)
        self.assertNotIn(date(2026, 8, 31), r.apple_dates)
        self.assertIn((c.Platform.APPLE, date(2026, 8, 31), c.Reason.OUTSIDE_INTERVAL), r.exclusions)

    def test_month_label_not_daily_proof_and_failed_gates_diagnostic_only(self):
        s, a, p = fixture()
        a = replace(a, observations=(a.observations[0],), gates=tuple((g, c.GateStatus.UNKNOWN if g is c.Gate.DAILY_DATES else v) for g, v in a.gates))
        r = c.evaluate(s, a, p)
        self.assertFalse(r.coverage_verified)
        self.assertEqual(r.apple_dates, ())
        self.assertEqual(r.shared_dates, ())
        self.assertEqual(r.diagnostic_apple_dates, (s.start,))

    def test_order_independent_and_immutable(self):
        s, a, p = fixture()
        before = (s, a, p)
        r = c.evaluate(s, a, p)
        reversed_a = replace(a, observations=tuple(reversed(a.observations)), gates=tuple(reversed(a.gates)))
        self.assertEqual(r, c.evaluate(s, reversed_a, p))
        self.assertEqual(before, fixture())
        with self.assertRaises(FrozenInstanceError):
            r.intended_days = 10
        # Inclusive date.max must not overflow when building the denominator.
        edge = replace(s, start=date.max, end=date.max)
        ar = replace(a, observations=(replace(a.observations[0], day=date.max),))
        pr = replace(p, observations=(replace(p.observations[0], day=date.max),))
        self.assertEqual(c.evaluate(edge, ar, pr).intended_days, 1)


class BoundaryTests(unittest.TestCase):
    def test_nested_malformed_fields_are_fixed_invalid(self):
        s, a, p = fixture()
        malformed = (None, True, 1, 'SECRET', [], {}, ([],))
        for bad in malformed:
            for name in ('gates', 'versions', 'observations'):
                self.assertEqual(c.evaluate(s, replace(a, **{name: (bad,)}), p), c.INVALID)
            for name in ('apple_grain', 'play_grain'):
                self.assertEqual(c.evaluate(replace(s, **{name: (bad,)}), a, p), c.INVALID)
            row = replace(a.observations[0], grain=(bad,))
            if type(bad) is not str:
                self.assertEqual(c.evaluate(s, replace(a, observations=(row,)), p), c.INVALID)
        for bad in (True, 1, 'VERIFIED', None):
            self.assertEqual(c.evaluate(s, replace(a, gates=((c.Gate.PAGES, bad),)), p), c.INVALID)
        with self.assertRaises(TypeError):
            c.Selection(s.start, s.end, metric_value=10)

    def test_no_input_text_leaks_or_numeric_metric_fields(self):
        s, a, p = fixture()
        marker = 'SECRET_SIGNED_URL_DIMENSION_PACKAGE_CREDENTIAL'
        v = c.ReportVersion(marker, marker, (), marker, marker, c.ChecksumStatus.VERIFIED)
        a = replace(a, versions=(v,), observations=tuple(replace(o, grain=(marker,), logical_report=marker, version=marker) for o in a.observations),
                    **{f.name: marker for f in fields(c.Evidence)[6:]})
        self.assertNotIn(marker, repr(c.evaluate(s, a, p)))
        self.assertNotIn(marker, repr(c.evaluate(replace(s, apple_metric=marker), a, p)))
        for cls in (c.Selection, c.Evidence, c.Observation, c.ReportVersion, c.Result):
            for f in fields(cls):
                self.assertNotIn(f.name, ('value', 'metric_value', 'total', 'ratio', 'attribution', 'ranking'))
        for metric in c.PlayMetric:
            self.assertEqual(c.evaluate(replace(s, play_metric=metric), a, p).play_metric, metric)

    def test_runtime_imports_are_only_pure_standard_library(self):
        source = Path(c.__file__).read_text()
        tree = ast.parse(source)
        imports = {node.module for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)}
        self.assertEqual(imports, {'dataclasses', 'datetime', 'enum'})
        self.assertFalse(any(isinstance(node, ast.Import) for node in ast.walk(tree)))
        calls = {node.func.id for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)}
        self.assertTrue(calls.isdisjoint({'open', 'eval', 'exec', '__import__', 'print', 'input'}))

    def test_readme_documents_non_authorization_and_execution(self):
        path = Path(__file__).with_name('README.md')
        self.assertTrue(path.exists(), 'synthetic boundary README not implemented')
        text = path.read_text()
        for required in ('synthetic', 'No private', 'No network', 'No metric values',
                         'does not certify', 'ELIGIBLE_SYNTHETIC', 'sandbox-exec',
                         'contiguous_required', 'EXPLICIT_ZERO', 'diagnostic', 'separate approval'):
            self.assertIn(required, text)


def fixture():
    days = (date(2026, 9, 1), date(2026, 9, 2), date(2026, 9, 3))
    s = c.Selection(days[0], days[-1])
    def evidence(platform, family):
        return c.Evidence(platform, family,
            tuple(c.Observation(d, ('synthetic',), c.Presence.PRESENT, 'report', 'v1') for d in days),
            tuple((gate, c.GateStatus.VERIFIED) for gate in c.Gate),
            c.DayBoundary.UTC, (c.ReportVersion('report', 'v1', (), 'identity', 'checksum', c.ChecksumStatus.VERIFIED),),
            'synthetic app/schema', 'documented daily grain', 'population', 'native unit',
            'no aggregation', 'late arrival rule', 'precedence rule', 'retrieval descriptor')
    return s, evidence(c.Platform.APPLE, c.Family.APPLE_STANDARD_DAILY), evidence(c.Platform.PLAY, c.Family.PLAY_OVERVIEW)
