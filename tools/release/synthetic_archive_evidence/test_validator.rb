# frozen_string_literal: true
require 'json'
require 'socket'
require 'stringio'
require_relative 'fixtures'
GROUPS = %w[happy parse shape expected binding inventory symbols policy determinism purity mutations all].freeze
unless ARGV.length == 2 && ARGV[0] == '--group' && GROUPS.include?(ARGV[1])
  puts 'FAIL runner_arguments'
  exit 1
end
begin
  require_relative 'validator'
rescue LoadError
  puts 'FAIL happy_missing_implementation'
  exit 1
end
module PuritySentinels
  class Forbidden < StandardError; end
  class Provider
    def self.inspect_archive(*); raise 'unreachable_provider'; end
  end
  SINGLETONS = {
    File=>%i[new open read binread write binwrite foreach readlines stat lstat exist? exists? directory? file? realpath readlink rename unlink delete chmod chown truncate],
    IO=>%i[new open read binread write binwrite foreach readlines popen sysopen pipe copy_stream],
    Dir=>%i[new open entries children foreach glob [] pwd getwd chdir mkdir rmdir home],
    Process=>%i[spawn exec fork daemon clock_gettime times pid ppid],
    Kernel=>%i[system exec spawn fork ` open require require_relative load sleep rand],
    ENV=>%i[[] fetch values_at to_h to_hash each each_pair keys values key? include? member? has_key? getenv []= store delete clear replace update],
    Time=>%i[now new],
    Socket=>%i[new open getaddrinfo getnameinfo tcp udp unix],
    TCPSocket=>%i[new open], UDPSocket=>%i[new open], UNIXSocket=>%i[new open],
    Provider=>%i[inspect_archive]
  }.freeze
  INSTANCES = {
    Kernel=>%i[system exec spawn fork ` open require require_relative load sleep rand],
    IO=>%i[read write sysread syswrite pread pwrite readpartial gets puts print printf << close],
    BasicSocket=>%i[send recv recvfrom sendmsg recvmsg],
    Socket=>%i[connect bind listen accept],
    UDPSocket=>%i[connect bind send]
  }.freeze

  def self.around(probe = false)
    patches = []
    calls = []
    hits = []
    output = StringIO.new
    old_stdout, old_stderr = $stdout, $stderr
    begin
      SINGLETONS.each do |receiver, names|
        names.each do |name|
          next unless receiver.respond_to?(name, true)
          patch(receiver.singleton_class, receiver, name, patches, calls, hits)
        end
      end
      INSTANCES.each do |owner, names|
        receiver = owner == Kernel ? Object.new : owner.allocate
        names.each do |name|
          next unless owner.method_defined?(name) || owner.private_method_defined?(name)
          patch(owner, receiver, name, patches, calls, hits)
        end
      end
      $stdout = output
      $stderr = output
      value = yield calls, hits
      raise Forbidden unless output.string.empty?
      raise Forbidden unless probe || hits.empty?
      value
    ensure
      $stdout, $stderr = old_stdout, old_stderr
      patches.reverse_each do |owner, name, original, own, visibility|
        if own
          owner.send(:define_method, name, original)
          owner.send(visibility, name)
        else
          owner.send(:remove_method, name)
        end
      end
    end
  end

  def self.patch(owner, receiver, name, patches, calls, hits)
    own = owner.instance_methods(false).include?(name) || owner.private_instance_methods(false).include?(name)
    visibility = owner.private_method_defined?(name) ? :private : :public
    patches << [owner, name, owner.instance_method(name), own, visibility]
    owner.send(:define_method, name) { |*| hits << [owner, name]; raise Forbidden }
    calls << [receiver, name]
  end

  def self.prove
    around(true) do |calls, hits|
      raise 'coverage' if calls.length < 100
      calls.each do |receiver, name|
        caught = false
        count = hits.length
        begin
          receiver.__send__(name)
        rescue Forbidden
          caught = true
        end
        raise 'sentinel' unless caught && hits.length == count + 1
      end
    end
  end
end
module Harness
  @cases = []
  def self.test(group, id, &block)
    @cases << [group, id, block]
  end
  def self.check(codes, expected = SyntheticArchiveFixtures::EXPECTED, observed = SyntheticArchiveFixtures::OBSERVED)
    wanted = {'schema'=>'synthetic-archive-result/v1', 'mode'=>'synthetic',
              'outcome'=>codes.empty? ? 'synthetic_consistent' : 'synthetic_rejected', 'reasons'=>codes}
    actual = PuritySentinels.around { SyntheticArchiveEvidence.validate(expected, observed) }
    raise 'assertion' unless actual == wanted
  end
  def self.run(group)
    cases = @cases.select { |g, _, _| group == 'all' || group == g }
    failures = 0
    cases.each do |_, id, block|
      begin
        block.call
      rescue Exception
        failures += 1
        puts "FAIL #{id}" if failures <= 20
      end
    end
    puts "cases=#{cases.length} passed=#{cases.length-failures} failed=#{failures}"
    exit(cases.empty? || failures > 0 ? 1 : 0)
  end
end
Harness.test('happy', 'happy_complete') { Harness.check([]) }
def mutate(which = :observed)
  value = JSON.parse(which == :expected ? SyntheticArchiveFixtures::EXPECTED : SyntheticArchiveFixtures::OBSERVED)
  yield value
  JSON.generate(value)
end
def observed_case(group, id, codes, &change)
  Harness.test(group, id) { Harness.check(codes, SyntheticArchiveFixtures::EXPECTED, mutate(&change)) }
end
def expected_case(id, code = 'EXPECTED_CONFLICT', &change)
  Harness.test('expected', id) { Harness.check([code], mutate(:expected, &change), '{') }
end
[
  ['non_string', nil, 'FIELD_SHAPE'], ['boolean_input', true, 'FIELD_SHAPE'],
  ['bom', "\xEF\xBB\xBF{}", 'INPUT_ENCODING'], ['utf8', "\xFF", 'INPUT_ENCODING'],
  ['trailing', '{} x', 'INPUT_SYNTAX'], ['escape', '{"x":"\\q"}', 'INPUT_SYNTAX'],
  ['raw_control', "{\"x\":\"\x00\"}", 'INPUT_SYNTAX'],
  ['nan', '{"x":NaN}', 'INPUT_SYNTAX'], ['infinity', '{"x":Infinity}', 'INPUT_SYNTAX'],
  ['duplicate', '{"mode":"synthetic","mode":"synthetic"}', 'INPUT_SYNTAX'],
  ['escaped_duplicate', '{"mode":"synthetic","m\u006fde":"synthetic"}', 'INPUT_SYNTAX'],
  ['nested_duplicate', '{"x":{"a":"x","a":"y"}}', 'INPUT_SYNTAX'],
  ['duplicate_before_syntax', '{"x":{"a":"x","a":"y"},BAD}', 'INPUT_SYNTAX'],
  ['syntax_before_duplicate', '{BAD,"x":{"a":"x","a":"y"}}', 'INPUT_SYNTAX'],
  ['depth_at', '[' * 12 + '"x"' + ']' * 12, 'SCHEMA_MODE'],
  ['depth_over', '[' * 13 + '"x"' + ']' * 13, 'INPUT_LIMIT'],
  ['string_at', JSON.generate({'x'=>'s' * 128}), 'SCHEMA_MODE'],
  ['string_over', JSON.generate({'x'=>'s' * 129}), 'INPUT_LIMIT'],
  ['key_at', JSON.generate({'k' * 128=>'x'}), 'SCHEMA_MODE'],
  ['key_over', JSON.generate({'k' * 129=>'x'}), 'INPUT_LIMIT'],
  ['object_at', JSON.generate((1..32).map { |i| [i.to_s, 'x'] }.to_h), 'SCHEMA_MODE'],
  ['object_over', JSON.generate((1..33).map { |i| [i.to_s, 'x'] }.to_h), 'INPUT_LIMIT'],
  ['array_at', JSON.generate(['x'] * 8), 'SCHEMA_MODE'],
  ['array_over', JSON.generate(['x'] * 9), 'INPUT_LIMIT']
].each do |id, input, code|
  Harness.test('parse', 'parse_' + id) { Harness.check([code], input) }
end
Harness.test('parse', 'parse_byte_at') { Harness.check([], SyntheticArchiveFixtures::EXPECTED.ljust(65_536)) }
Harness.test('parse', 'parse_byte_over') { Harness.check(['INPUT_LIMIT'], SyntheticArchiveFixtures::EXPECTED.ljust(65_537)) }
Harness.test('parse', 'parse_encoding_before_size') { Harness.check(['INPUT_ENCODING'], "\xFF" + ' ' * 65_536) }
Harness.test('parse', 'parse_plain_binary_wrapper') { Harness.check([], SyntheticArchiveFixtures::EXPECTED.dup.force_encoding(Encoding::ASCII_8BIT)) }
Harness.test('parse', 'parse_utf16_wrapper') { Harness.check(['INPUT_ENCODING'], SyntheticArchiveFixtures::EXPECTED.encode(Encoding::UTF_16LE)) }
Harness.test('parse', 'parse_subclass') do
  input = Class.new(String) do
    def instance_of?(*); raise 'input_method'; end
    def class; raise 'input_method'; end
    def to_str; raise 'input_method'; end
    def bytesize; raise 'input_method'; end
  end.new('{}')
  Harness.check(['FIELD_SHAPE'], input)
end
[false, true].each do |over|
  Harness.test('parse', over ? 'parse_nodes_over' : 'parse_nodes_at') do
    # 1 + 31*(1 + 8 + 56) + (1 + 4 + 27) = 2048 value nodes.
    tree = (1..31).map { |i| [i.to_s, Array.new(8) { ['x'] * 7 }] }.to_h
    tree['last'] = {'a'=>['x'] * 8, 'b'=>['x'] * 8, 'c'=>['x'] * 8, 'd'=>['x'] * (over ? 4 : 3)}
    Harness.check([over ? 'INPUT_LIMIT' : 'SCHEMA_MODE'], JSON.generate(tree))
  end
end
# Traverse fixtures only to enumerate shape mutations; oracles remain literal.
def object_paths(value, path = [], found = [])
  if value.is_a?(Hash)
    found << path
    value.each { |k, v| object_paths(v, path + [k], found) }
  elsif value.is_a?(Array)
    value.each_with_index { |v, i| object_paths(v, path + [i], found) }
  end
  found
end
def at_path(value, path)
  path.inject(value) { |node, key| node[key] }
end
[:expected, :observed].each do |which|
  base = JSON.parse(which == :expected ? SyntheticArchiveFixtures::EXPECTED : SyntheticArchiveFixtures::OBSERVED)
  object_paths(base).each_with_index do |path, index|
    object = at_path(base, path)
    (object.keys + ['unlisted']).each_with_index do |key, fi|
      code = path.empty? && %w[schema mode].include?(key) ? 'SCHEMA_MODE' : 'FIELD_SHAPE'
      Harness.test('shape', "shape_#{which}_#{index}_#{fi}") do
        input = mutate(which) do |v|
          obj = at_path(v, path)
          key == 'unlisted' ? obj[key] = 'synthetic:secret_marker' : obj.delete(key)
        end
        Harness.check([code], which == :expected ? input : SyntheticArchiveFixtures::EXPECTED,
                      which == :observed ? input : SyntheticArchiveFixtures::OBSERVED)
      end
    end
    object.each_with_index do |(key, value), fi|
      replacements = value.is_a?(String) ? [nil, true, false, 1, 1.5, [], {}, 'INVALID'] : [nil, true, 1, 'synthetic:x']
      replacements.each_with_index do |replacement, ri|
        code = path.empty? && %w[schema mode].include?(key) ? 'SCHEMA_MODE' : 'FIELD_SHAPE'
        Harness.test('shape', "type_#{which}_#{index}_#{fi}_#{ri}") do
          input = mutate(which) { |v| at_path(v, path)[key] = replacement }
          Harness.check([code], which == :expected ? input : SyntheticArchiveFixtures::EXPECTED,
                        which == :observed ? input : SyntheticArchiveFixtures::OBSERVED)
        end
      end
    end
  end
end
%w[version build configuration environment].each do |field|
  expected_case('expected_binding_' + field) { |v| v['bundles'][0][field] = v['bundles'][0][field].sub(/.$/, '9') }
end
%w[artifacts bundles].each do |field|
  expected_case('expected_empty_' + field) { |v| v[field] = [] }
  expected_case('expected_duplicate_' + field) { |v| v[field] << v[field][0] }
end
%w[id role].each { |field| expected_case('expected_duplicate_' + field) { |v| v['bundles'][1][field] = v['bundles'][0][field] } }
expected_case('expected_empty_arch') { |v| v['bundles'][0]['architectures'] = [] }
expected_case('expected_duplicate_arch') { |v| v['bundles'][0]['architectures'] *= 2 }
expected_case('expected_duplicate_uuid') { |v| v['bundles'][1]['architectures'][0]['uuid'] = v['bundles'][0]['architectures'][0]['uuid'] }
expected_case('expected_finding', 'FIELD_SHAPE') { |v| v['bundles'][0]['policy_evidence']['privacy']['finding'] = 'synthetic_unknown' }
%w[source run toolchain version build configuration environment].each do |field|
  observed_case('binding', 'binding_' + field, ['BINDING_MISMATCH']) { |v| v['binding'][field] = v['binding'][field].sub(/.$/, '9') }
end
%w[id revision digest].each do |field|
  observed_case('binding', 'policy_binding_' + field, ['POLICY_MISMATCH']) { |v| v['policy'][field] = v['policy'][field].sub(/.$/, '9') }
end
3.times { |i| observed_case('binding', "artifact_digest_#{i}", ['ARTIFACT_MISMATCH']) { |v| v['artifacts'][i]['digest'] = 'synthetic-sha256:' + 'f' * 64 } }
%w[version build configuration environment].each do |field|
  observed_case('binding', 'bundle_' + field, ['BUNDLE_IDENTITY']) { |v| v['bundles'][0][field] = v['bundles'][0][field].sub(/.$/, '9') }
end
observed_case('binding', 'binary_digest', ['BINARY_MISMATCH']) { |v| v['bundles'][0]['binary_digest'] = 'synthetic-sha256:' + 'f' * 64 }
{'artifacts'=>'ARTIFACT_MISMATCH','bundles'=>'BUNDLE_INVENTORY','dsyms'=>'DSYM_INVENTORY'}.each do |field, code|
  observed_case('inventory', 'missing_' + field, [code]) { |v| v[field].pop }
  observed_case('inventory', 'duplicate_' + field, [code]) { |v| v[field] << v[field][0] }
  observed_case('inventory', 'empty_' + field, [code]) { |v| v[field] = [] }
  observed_case('inventory', 'overcap_' + field, ['INPUT_LIMIT']) { |v| v[field] = [v[field][0]] * 9 }
end
observed_case('inventory', 'bundle_role', ['BUNDLE_INVENTORY']) { |v| v['bundles'][0]['role'] = 'widget' }
observed_case('inventory', 'bundle_id', ['BUNDLE_INVENTORY']) { |v| v['bundles'][0]['id'] = 'synthetic:other' }
observed_case('inventory', 'dsym_id', ['DSYM_INVENTORY']) { |v| v['dsyms'][0]['bundle_id'] = 'synthetic:other' }
observed_case('inventory', 'missing_independent', ['POLICY_MISMATCH', 'BUNDLE_INVENTORY']) { |v| v['bundles'].pop; v['policy']['id'] = 'synthetic:other' }
observed_case('inventory', 'duplicate_independent', ['BINARY_MISMATCH', 'DSYM_INVENTORY']) { |v| v['dsyms'] << v['dsyms'][0]; v['bundles'][1]['binary_digest'] = 'synthetic-sha256:' + 'f'*64 }
observed_case('inventory', 'duplicate_suppression', ['BUNDLE_INVENTORY']) { |v| v['bundles'] << JSON.parse(JSON.generate(v['bundles'][0])); v['bundles'].last['binary_digest'] = 'synthetic-sha256:' + 'f'*64 }
observed_case('symbols', 'binary_uuid', ['ARCHITECTURE_MISMATCH', 'DSYM_MISMATCH']) { |v| v['bundles'][0]['architectures'][0]['uuid'] = 'synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff' }
observed_case('symbols', 'binary_arch', ['ARCHITECTURE_MISMATCH', 'DSYM_MISMATCH']) { |v| v['bundles'][0]['architectures'][0]['architecture'] = 'synthetic-x86_64' }
observed_case('symbols', 'binary_duplicate', ['ARCHITECTURE_MISMATCH']) { |v| v['bundles'][0]['architectures'] *= 2 }
observed_case('symbols', 'binary_missing', ['ARCHITECTURE_MISMATCH']) { |v| v['bundles'][0]['architectures'] = [] }
observed_case('symbols', 'binary_cross_uuid', ['ARCHITECTURE_MISMATCH', 'DSYM_MISMATCH']) { |v| v['bundles'][1]['architectures'][0]['uuid'] = v['bundles'][0]['architectures'][0]['uuid'] }
observed_case('symbols', 'uuid_wrong_bundle', ['ARCHITECTURE_MISMATCH', 'DSYM_MISMATCH']) { |v| v['bundles'][0]['architectures'], v['bundles'][1]['architectures'] = v['bundles'][1]['architectures'], v['bundles'][0]['architectures'] }
%w[digest uuid architecture missing duplicate extra].each do |field|
  observed_case('symbols', 'dsym_' + field, ['DSYM_MISMATCH']) do |v|
    d = v['dsyms'][0]
    case field
    when 'digest' then d['digest'] = 'synthetic-sha256:' + 'f'*64
    when 'uuid' then d['architectures'][0]['uuid'] = 'synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff'
    when 'architecture' then d['architectures'][0]['architecture'] = 'synthetic-x86_64'
    when 'missing' then d['architectures'] = []
    when 'duplicate' then d['architectures'] *= 2
    when 'extra' then d['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff'}
    end
  end
end
%w[distribution_signing entitlements privacy forbidden_credentials].each do |category|
  %w[profile digest finding unknown].each do |field|
    codes = field == 'unknown' ? ['POLICY_EVIDENCE_MISMATCH', 'EVIDENCE_UNKNOWN'] : ['POLICY_EVIDENCE_MISMATCH']
    observed_case('policy', "policy_#{category}_#{field}", codes) do |v|
      e = v['bundles'][0]['policy_evidence'][category]
      case field
      when 'profile' then e[field] = 'synthetic:other'
      when 'digest' then e[field] = 'synthetic-sha256:' + 'f'*64
      when 'finding' then e[field] = 'synthetic_mismatch'
      when 'unknown' then e['finding'] = 'synthetic_unknown'
      end
    end
  end
end
observed_case('policy', 'forbidden_present', ['POLICY_EVIDENCE_MISMATCH', 'FORBIDDEN_CREDENTIAL_FINDING']) { |v| v['bundles'][0]['policy_evidence']['forbidden_credentials']['finding'] = 'synthetic_present' }
Harness.test('determinism', 'permutations') do
  observed = mutate { |v| %w[artifacts bundles dsyms].each { |k| v[k].reverse! }; (v['bundles'] + v['dsyms']).each { |b| b['architectures'].reverse! } }
  3.times { Harness.check([], SyntheticArchiveFixtures::EXPECTED, observed) }
end
observed_case('determinism', 'combined_order', ['BINDING_MISMATCH','POLICY_MISMATCH','ARTIFACT_MISMATCH','BUNDLE_IDENTITY','BINARY_MISMATCH','ARCHITECTURE_MISMATCH','DSYM_MISMATCH','POLICY_EVIDENCE_MISMATCH','EVIDENCE_UNKNOWN','FORBIDDEN_CREDENTIAL_FINDING']) do |v|
  v['binding']['run'] = 'synthetic:other'; v['policy']['id'] = 'synthetic:other'; v['artifacts'] = []
  b=v['bundles'][0]; b['version']='synthetic-version:9'; b['binary_digest']='synthetic-sha256:'+'f'*64
  b['architectures'][0]['uuid']='synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff'
  b['policy_evidence']['privacy']['finding']='synthetic_unknown'
  b['policy_evidence']['forbidden_credentials']['finding']='synthetic_present'
end
Harness.test('determinism', 'forged_fiction') do
  # Independently supplied literals remain fiction, even if mutually consistent.
  e = SyntheticArchiveFixtures::EXPECTED.gsub('synthetic:source','synthetic:fiction')
  o = SyntheticArchiveFixtures::OBSERVED.gsub('synthetic:source','synthetic:fiction')
  Harness.check([], e, o)
end
Harness.test('determinism', 'diagnostic_secrecy') do
  ['{"secret_marker_897":{"x":"x","x":"y"}}', '{"x":"secret_marker_897"}', 'secret_marker_897'].each do |raw|
    result = PuritySentinels.around { SyntheticArchiveEvidence.validate(raw, raw) }
    raise 'echo' if JSON.generate(result).include?('secret_marker_897')
  end
end
observed_case('mutations', 'sensitivity_inventory', ['ARTIFACT_MISMATCH']) { |v| v['artifacts'].pop }
observed_case('mutations', 'sensitivity_identity', ['BUNDLE_IDENTITY']) { |v| v['bundles'][0]['build']='synthetic-build:99' }
observed_case('mutations', 'sensitivity_uuid', ['ARCHITECTURE_MISMATCH','DSYM_MISMATCH']) { |v| v['bundles'][0]['architectures'][0]['uuid']='synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff' }
observed_case('mutations', 'sensitivity_policy', ['POLICY_EVIDENCE_MISMATCH']) { |v| v['bundles'][0]['policy_evidence']['privacy']['finding']='synthetic_mismatch' }
Harness.test('purity', 'purity_sentinels') { PuritySentinels.prove }
Harness.test('purity', 'purity_complete') { Harness.check([]) }
Harness.test('purity', 'purity_imports') do
  raise 'imports' if $LOADED_FEATURES.any? { |f| f.match?(/fastlane|release_candidate|release_contract|rubygems/i) }
end
Harness.test('purity', 'production_boundary') do
  # Independent fake reader, not an owner prerequisite reader or adapter.
  production_reader = ->(value) { value.is_a?(Hash) && value['schema'] == 'fake-production-prerequisite/v1' && value['mode'] == 'authenticated' }
  result = PuritySentinels.around { SyntheticArchiveEvidence.validate(SyntheticArchiveFixtures::EXPECTED, SyntheticArchiveFixtures::OBSERVED) }
  [JSON.parse(SyntheticArchiveFixtures::EXPECTED), JSON.parse(SyntheticArchiveFixtures::OBSERVED), result].each do |value|
    raise 'production' if production_reader.call(value)
  end
  raise 'result' unless result.keys.sort == %w[mode outcome reasons schema] && result['outcome'] == 'synthetic_consistent'
end
# Positive two-architecture fixtures: each second pair is separately authored.
Harness.test('determinism', 'two_architecture_permutations') do
  expected = mutate(:expected) do |v|
    v['bundles'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:33333333-3333-3333-3333-333333333333'}
    v['bundles'][1]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:44444444-4444-4444-4444-444444444444'}
    v['artifacts'].reverse!; v['bundles'].reverse!
  end
  observed = mutate do |v|
    v['bundles'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:33333333-3333-3333-3333-333333333333'}
    v['bundles'][1]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:44444444-4444-4444-4444-444444444444'}
    v['dsyms'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:33333333-3333-3333-3333-333333333333'}
    v['dsyms'][1]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:44444444-4444-4444-4444-444444444444'}
    (v['bundles']+v['dsyms']).each { |b| b['architectures'].reverse! }
    v['dsyms'].reverse!
  end
  Harness.check([], expected, observed)
end
Harness.test('shape', 'scalar_maximums') do
  e = mutate(:expected) do |v|
    v['binding']['source'] = 'synthetic:' + 'a'*32
    v['binding']['version'] = 'synthetic-version:123456.123456.123456'
    v['binding']['build'] = 'synthetic-build:123456789012'
    v['bundles'].each { |b| b['version']='synthetic-version:123456.123456.123456'; b['build']='synthetic-build:123456789012' }
  end
  o = mutate do |v|
    v['binding']['source'] = 'synthetic:' + 'a'*32
    v['binding']['version'] = 'synthetic-version:123456.123456.123456'
    v['binding']['build'] = 'synthetic-build:123456789012'
    v['bundles'].each { |b| b['version']='synthetic-version:123456.123456.123456'; b['build']='synthetic-build:123456789012' }
  end
  Harness.check([], e, o)
end
{
  'source'=>['synthetic:', 'synthetic:'+'a'*33, 'synthetic:Upper', "synthetic:é", ' synthetic:a', "synthetic:a\n", 'synthetic:_a'],
  'version'=>['synthetic-version:1234567', 'synthetic-version:1.2.3.4', 'synthetic-version:.1', 'synthetic-version:1.', 'synthetic-version:-1'],
  'build'=>['synthetic-build:1234567890123', 'synthetic-build:', 'synthetic-build:1.2', 'synthetic-build:-1'],
  'configuration'=>['synthetic-sha256:'+'a'*63, 'synthetic-sha256:'+'a'*65, 'synthetic-sha256:'+'A'*64]
}.each do |field, values|
  values.each_with_index do |value, index|
    observed_case('shape', "scalar_edge_#{field}_#{index}", ['FIELD_SHAPE']) { |v| v['binding'][field] = value }
  end
end
Harness.test('parse', 'parse_plain_string_singleton') do
  input = SyntheticArchiveFixtures::EXPECTED.dup
  %i[class instance_of? encoding to_str bytesize valid_encoding?].each { |name| input.define_singleton_method(name) { raise 'input_dispatch' } }
  Harness.check([], input)
end
Harness.test('parse', 'parse_arbitrary_object') do
  input = Object.new
  %i[class instance_of? to_str to_s to_json].each { |name| input.define_singleton_method(name) { raise 'input_dispatch' } }
  Harness.check(['FIELD_SHAPE'], input)
end
Harness.test('parse', 'parse_input_unchanged') do
  expected = SyntheticArchiveFixtures::EXPECTED.dup.freeze
  observed = SyntheticArchiveFixtures::OBSERVED.dup.freeze
  Harness.check([], expected, observed)
end
Harness.test('parse', 'parse_duplicate_before_depth') { Harness.check(['INPUT_SYNTAX'], '{"x":{"a":"1","a":"2"},"z":' + '['*13 + '"x"' + ']'*13 + '}') }
Harness.test('parse', 'parse_depth_before_duplicate') { Harness.check(['INPUT_LIMIT'], '{"z":' + '['*13 + '"x"' + ']'*13 + ',"x":{"a":"1","a":"2"}}') }
%w[bundles dsyms].each do |field|
  code = field == 'bundles' ? 'ARCHITECTURE_MISMATCH' : 'DSYM_MISMATCH'
  observed_case('symbols', 'architecture_eight_' + field, [code]) { |v| v[field][0]['architectures'] *= 8 }
  observed_case('symbols', 'architecture_nine_' + field, ['INPUT_LIMIT']) { |v| v[field][0]['architectures'] *= 9 }
end
expected_case('expected_uuid_within_bundle') do |v|
  v['bundles'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:11111111-1111-1111-1111-111111111111'}
end
observed_case('symbols', 'binary_uuid_within_bundle', ['ARCHITECTURE_MISMATCH']) do |v|
  v['bundles'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:11111111-1111-1111-1111-111111111111'}
end
observed_case('symbols', 'binary_extra_pair', ['ARCHITECTURE_MISMATCH','DSYM_MISMATCH']) do |v|
  v['bundles'][0]['architectures'] << {'architecture'=>'synthetic-x86_64','uuid'=>'synthetic-uuid:ffffffff-ffff-ffff-ffff-ffffffffffff'}
end
observed_case('inventory', 'extra_unique_dsym', ['DSYM_INVENTORY']) do |v|
  extra = JSON.parse(JSON.generate(v['dsyms'][0])); extra['bundle_id']='synthetic:extra'; v['dsyms'] << extra
end
observed_case('inventory', 'ambiguous_symbol_suppression', ['DSYM_INVENTORY']) do |v|
  extra=JSON.parse(JSON.generate(v['dsyms'][0])); extra['digest']='synthetic-sha256:'+'f'*64; v['dsyms'] << extra
end
Harness.run(ARGV[1])
