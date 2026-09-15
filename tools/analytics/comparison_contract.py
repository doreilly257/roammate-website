"""Pure, value-free synthetic date-coverage contract. No source certification."""
from dataclasses import dataclass, fields
from datetime import date, timedelta
from enum import Enum


class Platform(Enum):
    APPLE = 'Apple'
    PLAY = 'Play'


class Family(Enum):
    APPLE_STANDARD_DAILY = 'Apple Discovery and Engagement Standard DAILY'
    APPLE_DETAILED_DAILY = 'Apple Discovery and Engagement Detailed DAILY'
    APPLE_STANDARD_MONTHLY = 'Apple Discovery and Engagement Standard MONTHLY'
    APPLE_DOWNLOADS = 'Apple App Downloads'
    PLAY_OVERVIEW = 'Play overview'


class AppleMetric(Enum):
    COUNTS = 'Counts'
    UNIQUE_COUNTS = 'Unique Counts'


class PlayMetric(Enum):
    DAILY_DEVICE_INSTALLS = 'Daily Device Installs'
    DAILY_DEVICE_UNINSTALLS = 'Daily Device Uninstalls'
    DAILY_DEVICE_UPGRADES = 'Daily Device Upgrades'
    TOTAL_USER_INSTALLS = 'Total User Installs'
    DAILY_USER_INSTALLS = 'Daily User Installs'
    DAILY_USER_UNINSTALLS = 'Daily User Uninstalls'
    ACTIVE_DEVICE_INSTALLS = 'Active Device Installs'
    INSTALL_EVENTS = 'Install events'
    UPDATE_EVENTS = 'Update events'
    UNINSTALL_EVENTS = 'Uninstall events'


class Grain(Enum):
    EVENT = 'event'
    DIMENSION = 'dimension'
    PACKAGE = 'package'


class Policy(Enum):
    INTERSECTION = 'intersection of verified daily dates'


class Operation(Enum):
    NONE = 'none'
    SUM_DAYS = 'sum days'
    SUM_DIMENSIONS = 'sum dimensions'
    CROSS_PLATFORM_SUM = 'cross-platform sum'
    RATIO = 'ratio'
    RANKING = 'ranking'
    ATTRIBUTION = 'attribution'


class GateStatus(Enum):
    VERIFIED = 'verified'
    UNKNOWN = 'unknown'
    FAILED = 'failed'


class ChecksumStatus(Enum):
    VERIFIED = 'verified checksum'
    NOT_APPLICABLE = 'checksum explicitly not applicable'
    UNKNOWN = 'unknown checksum applicability'
    FAILED = 'failed checksum'


class Gate(Enum):
    PREDECLARED = 'predeclared selection'
    DAILY_DATES = 'actual daily date proof'
    DAY_BOUNDARY = 'documented day boundary'
    BOUNDARY_COMPATIBILITY = 'compatible day boundaries'
    PAGES = 'complete listing pages'
    INSTANCES = 'complete instances'
    SEGMENTS = 'complete segments'
    APP_SCHEMA = 'expected app and schema'
    GRAIN = 'documented complete grain'
    POPULATION = 'metric population'
    UNIT = 'metric unit'
    AGGREGATION = 'metric aggregation semantics'
    IDENTITY = 'generation identity'
    CHECKSUM = 'checksum or explicit not applicable'
    CORRECTIONS = 'corrections resolved'
    LATE_ARRIVAL = 'late arrival policy'
    PRECEDENCE = 'version precedence'
    RETRIEVAL = 'retrieval provenance'


class DayBoundary(Enum):
    UTC = 'documented UTC calendar day'
    PACIFIC = 'documented America/Los_Angeles calendar day'
    UNKNOWN = 'unknown day boundary'


class Presence(Enum):
    PRESENT = 'present'
    EXPLICIT_ZERO = 'explicit zero'
    MISSING = 'missing'
    SUPPRESSED = 'suppressed'
    UNKNOWN = 'unknown'


class Eligibility(Enum):
    INVALID_INPUT = 'invalid input'
    UNAVAILABLE = 'unavailable'
    GAPPED = 'gapped'
    ELIGIBLE_SYNTHETIC = 'eligible synthetic date coverage only'


class Reason(Enum):
    INVALID_INPUT = 'INVALID_INPUT'
    GATE_UNVERIFIED = 'GATE_UNVERIFIED'
    FAMILY_MISMATCH = 'FAMILY_MISMATCH'
    BOUNDARY_UNVERIFIED = 'BOUNDARY_UNVERIFIED'
    DESCRIPTOR_MISSING = 'DESCRIPTOR_MISSING'
    OPERATION_FORBIDDEN = 'OPERATION_FORBIDDEN'
    VERSION_UNRESOLVED = 'VERSION_UNRESOLVED'
    DUPLICATE_GRAIN = 'DUPLICATE_GRAIN'
    INCONSISTENT_PRESENCE = 'INCONSISTENT_PRESENCE'
    OUTSIDE_INTERVAL = 'OUTSIDE_INTERVAL'
    MISSING = 'MISSING'
    SUPPRESSED = 'SUPPRESSED'
    UNKNOWN = 'UNKNOWN'
    EMPTY_INTERSECTION = 'EMPTY_INTERSECTION'
    INCOMPLETE_INTERVAL = 'INCOMPLETE_INTERVAL'
    GRAIN_MISMATCH = 'GRAIN_MISMATCH'


@dataclass(frozen=True)
class Selection:
    start: date
    end: date
    apple_family: Family = Family.APPLE_STANDARD_DAILY
    play_family: Family = Family.PLAY_OVERVIEW
    apple_metric: AppleMetric = AppleMetric.COUNTS
    play_metric: PlayMetric = PlayMetric.DAILY_DEVICE_INSTALLS
    apple_grain: tuple = (Grain.EVENT,)
    play_grain: tuple = (Grain.PACKAGE,)
    policy: Policy = Policy.INTERSECTION
    contiguous_required: bool = False
    requested_operation: Operation = Operation.NONE


@dataclass(frozen=True)
class Observation:
    day: date
    grain: tuple
    presence: Presence
    logical_report: str
    version: str


@dataclass(frozen=True)
class ReportVersion:
    logical_report: str
    selected_version: str
    superseded_versions: tuple
    identity: str
    checksum: str
    checksum_status: ChecksumStatus = ChecksumStatus.UNKNOWN
    checksum_na_reason: str = ''


@dataclass(frozen=True)
class Evidence:
    platform: Platform
    family: Family
    observations: tuple
    gates: tuple
    boundary: DayBoundary
    versions: tuple
    app_schema: str
    grain_definition: str
    population_definition: str
    unit_definition: str
    aggregation_definition: str
    late_arrival_policy: str
    precedence_rule: str
    retrieval: str


@dataclass(frozen=True)
class Result:
    eligibility: Eligibility
    reasons: tuple
    intended_days: int = 0
    apple_dates: tuple = ()
    play_dates: tuple = ()
    shared_dates: tuple = ()
    missing_dates: tuple = ()
    diagnostic_apple_dates: tuple = ()
    diagnostic_play_dates: tuple = ()
    coverage_verified: bool = False
    apple_metric: AppleMetric = AppleMetric.COUNTS
    play_metric: PlayMetric = PlayMetric.DAILY_DEVICE_INSTALLS
    apple_grain: tuple = ()
    play_grain: tuple = ()
    exclusions: tuple = ()
    apple_family: Family = Family.APPLE_STANDARD_DAILY
    play_family: Family = Family.PLAY_OVERVIEW
    day_boundary: DayBoundary = DayBoundary.UNKNOWN
    apple_missing_dates: tuple = ()
    apple_suppressed_dates: tuple = ()
    apple_unknown_dates: tuple = ()
    play_missing_dates: tuple = ()
    play_suppressed_dates: tuple = ()
    play_unknown_dates: tuple = ()
    apple_coverage: tuple | None = None
    play_coverage: tuple | None = None
    shared_coverage: tuple | None = None


INVALID = Result(Eligibility.INVALID_INPUT, (Reason.INVALID_INPUT,))


def _strings(value, nonempty=False):
    return type(value) is tuple and (not nonempty or bool(value)) and all(type(x) is str and bool(x) for x in value)


def _valid_selection(s):
    return (type(s) is Selection and type(s.start) is date and type(s.end) is date
            and s.start <= s.end and type(s.contiguous_required) is bool
            and all(type(value) is expected for value, expected in (
                (s.apple_family, Family), (s.play_family, Family), (s.apple_metric, AppleMetric),
                (s.play_metric, PlayMetric), (s.policy, Policy), (s.requested_operation, Operation)))
            and all(type(g) is tuple and bool(g) and all(type(x) is Grain for x in g)
                    and len(set(g)) == len(g) for g in (s.apple_grain, s.play_grain)))


def _valid_evidence(e):
    if type(e) is not Evidence:
        return False
    if not (type(e.platform) is Platform and type(e.family) is Family and type(e.boundary) is DayBoundary
            and type(e.observations) is tuple and type(e.gates) is tuple and type(e.versions) is tuple):
        return False
    if not all(type(getattr(e, f.name)) is str for f in fields(Evidence)[6:]):
        return False
    for pair in e.gates:
        if not (type(pair) is tuple and len(pair) == 2 and type(pair[0]) is Gate and type(pair[1]) is GateStatus):
            return False
    if len({g for g, _ in e.gates}) != len(e.gates):
        return False
    for v in e.versions:
        if not (type(v) is ReportVersion and all(type(x) is str for x in
                (v.logical_report, v.selected_version, v.identity, v.checksum, v.checksum_na_reason))
                and type(v.checksum_status) is ChecksumStatus and _strings(v.superseded_versions)):
            return False
    for row in e.observations:
        if not (type(row) is Observation and type(row.day) is date and _strings(row.grain, True)
                and type(row.presence) is Presence and type(row.logical_report) is str
                and type(row.version) is str):
            return False
    return True


def _semantic_reasons(s, apple, play):
    reasons = set()
    if (s.apple_family is not Family.APPLE_STANDARD_DAILY or s.play_family is not Family.PLAY_OVERVIEW
            or apple.family is not s.apple_family or play.family is not s.play_family
            or apple.platform is not Platform.APPLE or play.platform is not Platform.PLAY):
        reasons.add(Reason.FAMILY_MISMATCH)
    if apple.boundary is DayBoundary.UNKNOWN or play.boundary is DayBoundary.UNKNOWN or apple.boundary is not play.boundary:
        reasons.add(Reason.BOUNDARY_UNVERIFIED)
    # This phase permits no metric operation, even if future aggregation is documented.
    if s.requested_operation is not Operation.NONE:
        reasons.add(Reason.OPERATION_FORBIDDEN)
    for e in (apple, play):
        if len(e.gates) != len(Gate) or any(status is not GateStatus.VERIFIED for _, status in e.gates):
            reasons.add(Reason.GATE_UNVERIFIED)
        if any(not getattr(e, f.name).strip() for f in fields(Evidence)[6:]):
            reasons.add(Reason.DESCRIPTOR_MISSING)
        selected = {}
        for v in e.versions:
            checksum_verified = (v.checksum_status is ChecksumStatus.VERIFIED
                                 and bool(v.checksum.strip()) and not v.checksum_na_reason.strip())
            checksum_na = (v.checksum_status is ChecksumStatus.NOT_APPLICABLE
                           and not v.checksum.strip() and bool(v.checksum_na_reason.strip()))
            if (not all(x.strip() for x in (v.logical_report, v.selected_version, v.identity))
                    or not (checksum_verified or checksum_na)
                    or v.logical_report in selected or v.selected_version in v.superseded_versions
                    or len(set(v.superseded_versions)) != len(v.superseded_versions)):
                reasons.add(Reason.VERSION_UNRESOLVED)
            selected[v.logical_report] = v.selected_version
        if not selected or any(selected.get(row.logical_report) != row.version for row in e.observations):
            reasons.add(Reason.VERSION_UNRESOLVED)
    return reasons


def _coverage(s, e, grain, intended):
    """Any unavailable/inconsistent grain invalidates its entire synthetic day."""
    seen = {}
    present = set()
    blocked = set()
    observed = set()
    exclusions = set()
    for row in e.observations:
        if not s.start <= row.day <= s.end:
            exclusions.add((e.platform, row.day, Reason.OUTSIDE_INTERVAL))
            continue
        observed.add(row.day)
        key = (row.day, row.logical_report, row.version, row.grain)
        if len(row.grain) != len(grain):
            blocked.add(row.day)
            exclusions.add((e.platform, row.day, Reason.GRAIN_MISMATCH))
        if key in seen:
            blocked.add(row.day)
            exclusions.add((e.platform, row.day, Reason.DUPLICATE_GRAIN))
            if seen[key] is not row.presence:
                exclusions.add((e.platform, row.day, Reason.INCONSISTENT_PRESENCE))
        seen[key] = row.presence
        if row.presence in (Presence.PRESENT, Presence.EXPLICIT_ZERO):
            present.add(row.day)
        else:
            blocked.add(row.day)
            exclusions.add((e.platform, row.day, Reason[row.presence.name]))
    for day in intended - observed:
        exclusions.add((e.platform, day, Reason.MISSING))
    return present - blocked, observed, exclusions


def evaluate(selection: Selection, apple: Evidence, play: Evidence) -> Result:
    """Validate caller-built synthetic structures without coercion or input echo."""
    if not (_valid_selection(selection) and _valid_evidence(apple) and _valid_evidence(play)):
        return INVALID
    reasons = _semantic_reasons(selection, apple, play)
    verified = not reasons
    count = (selection.end - selection.start).days + 1
    intended = {selection.start + timedelta(days=i) for i in range(count)}
    ad, diagnostic_a, ax = _coverage(selection, apple, selection.apple_grain, intended)
    pd, diagnostic_p, px = _coverage(selection, play, selection.play_grain, intended)
    exclusions = ax | px
    reasons.update(reason for _, _, reason in exclusions)
    # No intersection or eligible platform dates are exposed before semantic gates pass.
    shared = ad & pd if verified else set()
    missing = intended - shared if verified else set()
    eligibility = Eligibility.UNAVAILABLE
    if verified:
        if not shared:
            reasons.add(Reason.EMPTY_INTERSECTION)
        if missing:
            reasons.add(Reason.INCOMPLETE_INTERVAL)
        if shared and not missing:
            eligibility = Eligibility.ELIGIBLE_SYNTHETIC
        elif shared and not selection.contiguous_required:
            eligibility = Eligibility.GAPPED
    return Result(
        eligibility=eligibility, reasons=tuple(sorted(reasons, key=lambda r: r.value)),
        intended_days=count, apple_dates=tuple(sorted(ad)) if verified else (),
        play_dates=tuple(sorted(pd)) if verified else (), shared_dates=tuple(sorted(shared)),
        missing_dates=tuple(sorted(missing)), diagnostic_apple_dates=tuple(sorted(diagnostic_a)),
        diagnostic_play_dates=tuple(sorted(diagnostic_p)), coverage_verified=verified,
        apple_metric=selection.apple_metric, play_metric=selection.play_metric,
        apple_grain=selection.apple_grain, play_grain=selection.play_grain,
        exclusions=tuple(sorted(exclusions, key=lambda x: (x[0].value, x[1], x[2].value))),
        day_boundary=apple.boundary if verified else DayBoundary.UNKNOWN,
        apple_missing_dates=_category_dates(ax, Reason.MISSING),
        apple_suppressed_dates=_category_dates(ax, Reason.SUPPRESSED),
        apple_unknown_dates=_category_dates(ax, Reason.UNKNOWN),
        play_missing_dates=_category_dates(px, Reason.MISSING),
        play_suppressed_dates=_category_dates(px, Reason.SUPPRESSED),
        play_unknown_dates=_category_dates(px, Reason.UNKNOWN),
        apple_coverage=(len(ad), count) if verified else None,
        play_coverage=(len(pd), count) if verified else None,
        shared_coverage=(len(shared), count) if verified else None)


def _category_dates(exclusions, category):
    return tuple(sorted(day for _, day, reason in exclusions if reason is category))
