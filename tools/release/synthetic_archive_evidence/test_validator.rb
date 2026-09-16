# frozen_string_literal: true
require 'json'
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
module Harness
  @cases = []
  def self.test(group, id, &block)
    @cases << [group, id, block]
  end
  def self.check(codes, expected = SyntheticArchiveFixtures::EXPECTED, observed = SyntheticArchiveFixtures::OBSERVED)
    wanted = {'schema'=>'synthetic-archive-result/v1', 'mode'=>'synthetic',
              'outcome'=>codes.empty? ? 'synthetic_consistent' : 'synthetic_rejected', 'reasons'=>codes}
    raise 'assertion' unless SyntheticArchiveEvidence.validate(expected, observed) == wanted
  end
  def self.run(group)
    cases = @cases.select { |g, _, _| group == 'all' || group == g }
    failures = 0
    cases.each do |_, id, block|
      begin
        block.call
      rescue Exception
        failures += 1
        puts "FAIL #{id}"
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
  ['nan', '{"x":NaN}', 'INPUT_SYNTAX'], ['infinity', '{"x":Infinity}', 'INPUT_SYNTAX'],
  ['duplicate', '{"mode":"synthetic","mode":"synthetic"}', 'DUPLICATE_KEY'],
  ['escaped_duplicate', '{"mode":"synthetic","m\u006fde":"synthetic"}', 'DUPLICATE_KEY'],
  ['nested_duplicate', '{"x":{"a":"x","a":"y"}}', 'DUPLICATE_KEY'],
  ['duplicate_before_syntax', '{"x":{"a":"x","a":"y"},BAD}', 'DUPLICATE_KEY'],
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
Harness.run(ARGV[1])
