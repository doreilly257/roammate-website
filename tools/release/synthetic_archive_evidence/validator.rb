# frozen_string_literal: true
require 'json'
module SyntheticArchiveEvidence
  class Rejection < StandardError
    attr_reader :code
    def initialize(code)
      @code = code
      super('synthetic rejection')
    end
  end
  private_constant :Rejection
  TAG = /\Asynthetic:[a-z0-9][a-z0-9_-]{0,31}\z/.freeze
  DIGEST = /\Asynthetic-sha256:[0-9a-f]{64}\z/.freeze
  UUID = /\Asynthetic-uuid:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\z/.freeze
  VERSION = /\Asynthetic-version:[0-9]{1,6}(?:\.[0-9]{1,6}){0,2}\z/.freeze
  BUILD = /\Asynthetic-build:[0-9]{1,12}\z/.freeze
  IDENTITY = {'version'=>VERSION, 'build'=>BUILD, 'configuration'=>DIGEST, 'environment'=>TAG}.freeze
  FINDINGS = {'distribution_signing'=>'synthetic_distribution', 'entitlements'=>'synthetic_expected',
              'privacy'=>'synthetic_expected', 'forbidden_credentials'=>'synthetic_absent'}.freeze
  ARCHITECTURES = %w[synthetic-arm64 synthetic-x86_64].freeze
  ARTIFACTS = %w[archive ipa dsym_set].freeze
  ROLES = %w[app widget].freeze
  CODES = %w[BINDING_MISMATCH POLICY_MISMATCH ARTIFACT_MISMATCH BUNDLE_INVENTORY BUNDLE_IDENTITY BINARY_MISMATCH ARCHITECTURE_MISMATCH DSYM_INVENTORY DSYM_MISMATCH POLICY_EVIDENCE_MISMATCH EVIDENCE_UNKNOWN FORBIDDEN_CREDENTIAL_FINDING].freeze
  private_constant :TAG, :DIGEST, :UUID, :VERSION, :BUILD, :IDENTITY, :FINDINGS, :ARCHITECTURES, :ARTIFACTS, :ROLES, :CODES

  def self.validate(expected_json, observed_json)
    expected = parse(expected_json, 'synthetic-archive-expected/v1')
    shape(expected, true)
    expected_consistency(expected)
    observed = parse(observed_json, 'synthetic-archive-observed/v1')
    shape(observed, false)
    result(compare(expected, observed))
  rescue Rejection => error
    result([error.code])
  end

  class << self
    private

    def reject(code)
      raise Rejection.new(code)
    end

    def result(codes)
      {'schema'=>'synthetic-archive-result/v1', 'mode'=>'synthetic',
       'outcome'=>codes.empty? ? 'synthetic_consistent' : 'synthetic_rejected', 'reasons'=>codes}
    end

    def parse(input, schema)
      # Bind the built-in predicate: do not dispatch methods on arbitrary inputs.
      reject('FIELD_SHAPE') unless Object.instance_method(:instance_of?).bind(input).call(String)
      encoding = String.instance_method(:encoding).bind(input).call
      reject('INPUT_ENCODING') unless [Encoding::UTF_8, Encoding::US_ASCII, Encoding::ASCII_8BIT].include?(encoding)
      raw = String.new(input).force_encoding(Encoding::UTF_8)
      reject('INPUT_ENCODING') unless raw.valid_encoding? && !raw.start_with?("\xEF\xBB\xBF")
      reject('INPUT_LIMIT') if raw.bytesize > 65_536
      begin
        document = JSON.parse(raw, allow_duplicate_key: false, create_additions: false,
                             allow_nan: false, max_nesting: 12)
      rescue JSON::NestingError
        reject('INPUT_LIMIT')
      rescue JSON::ParserError
        reject('INPUT_SYNTAX')
      end
      limits(document)
      reject('SCHEMA_MODE') unless document.is_a?(Hash) && document['schema'] == schema && document['mode'] == 'synthetic'
      document
    end

    def limits(document)
      pending = [document]
      nodes = 0
      until pending.empty?
        value = pending.pop
        nodes += 1
        reject('INPUT_LIMIT') if nodes > 2048
        case value
        when Hash
          reject('INPUT_LIMIT') if value.size > 32 || value.keys.any? { |key| key.bytesize > 128 }
          pending.concat(value.values)
        when Array
          reject('INPUT_LIMIT') if value.size > 8
          pending.concat(value)
        when String
          reject('INPUT_LIMIT') if value.bytesize > 128
        end
      end
    end

    def object(value, fields)
      reject('FIELD_SHAPE') unless value.is_a?(Hash) && value.keys.sort == fields.keys.sort
      fields.each do |key, type|
        scalar = value[key]
        valid = case type
                when Regexp then scalar.is_a?(String) && type.match?(scalar)
                when Array then scalar.is_a?(String) && type.include?(scalar)
                when Class then scalar.is_a?(type)
                end
        reject('FIELD_SHAPE') unless valid
      end
    end

    def pairs_shape(pairs)
      pairs.each { |pair| object(pair, {'architecture'=>ARCHITECTURES, 'uuid'=>UUID}) }
    end

    def shape(document, expected)
      top = {'schema'=>String, 'mode'=>String, 'binding'=>Hash, 'policy'=>Hash, 'artifacts'=>Array, 'bundles'=>Array}
      top['dsyms'] = Array unless expected
      object(document, top)
      object(document['binding'], IDENTITY.merge('source'=>TAG, 'run'=>TAG, 'toolchain'=>TAG))
      object(document['policy'], {'id'=>TAG, 'revision'=>TAG, 'digest'=>DIGEST})
      document['artifacts'].each { |artifact| object(artifact, {'kind'=>ARTIFACTS, 'digest'=>DIGEST}) }
      bundle_fields = IDENTITY.merge('role'=>ROLES, 'id'=>TAG, 'binary_digest'=>DIGEST, 'architectures'=>Array, 'policy_evidence'=>Hash)
      bundle_fields['dsym_digest'] = DIGEST if expected
      document['bundles'].each do |bundle|
        object(bundle, bundle_fields)
        pairs_shape(bundle['architectures'])
        object(bundle['policy_evidence'], FINDINGS.keys.to_h { |key| [key, Hash] })
        FINDINGS.each do |category, accepted|
          findings = [accepted]
          findings += %w[synthetic_mismatch synthetic_unknown] unless expected
          findings << 'synthetic_present' if !expected && category == 'forbidden_credentials'
          object(bundle['policy_evidence'][category], {'profile'=>TAG, 'digest'=>DIGEST, 'finding'=>findings})
        end
      end
      return if expected
      document['dsyms'].each do |dsym|
        object(dsym, {'bundle_id'=>TAG, 'digest'=>DIGEST, 'architectures'=>Array})
        pairs_shape(dsym['architectures'])
      end
    end

    def unique?(items, key)
      values = items.map { |item| item[key] }
      values.uniq.length == values.length
    end

    def valid_pairs?(pairs)
      (1..2).include?(pairs.length) && unique?(pairs, 'architecture') && unique?(pairs, 'uuid')
    end

    def expected_consistency(expected)
      artifacts = expected['artifacts']
      bundles = expected['bundles']
      valid = artifacts.map { |a| a['kind'] }.sort == ARTIFACTS.sort &&
              bundles.map { |b| b['role'] }.sort == ROLES.sort && unique?(bundles, 'id')
      valid &&= bundles.all? do |bundle|
        IDENTITY.keys.all? { |key| bundle[key] == expected['binding'][key] } && valid_pairs?(bundle['architectures'])
      end
      valid &&= unique?(bundles.flat_map { |bundle| bundle['architectures'] }, 'uuid')
      reject('EXPECTED_CONFLICT') unless valid
    end

    # Two passes: find all ambiguous keys BEFORE constructing any item lookup.
    # Never pick a representative from duplicate inventories.
    def inventory(items, key, other_keys = [])
      keys = [key] + other_keys
      duplicates = keys.to_h do |field|
        values = items.map { |item| item[field] }
        [field, values.select { |value| values.count(value) > 1 }.uniq]
      end
      safe = items.reject { |item| keys.any? { |field| duplicates[field].include?(item[field]) } }
      [safe.to_h { |item| [item[key], item] }, duplicates.values.any? { |values| !values.empty? }]
    end

    def pairs_equal?(left, right)
      left.sort_by { |pair| pair['architecture'] } == right.sort_by { |pair| pair['architecture'] }
    end

    def compare(expected, observed)
      codes = []
      codes << 'BINDING_MISMATCH' unless expected['binding'] == observed['binding']
      codes << 'POLICY_MISMATCH' unless expected['policy'] == observed['policy']
      artifacts, ambiguous = inventory(observed['artifacts'], 'kind')
      codes << 'ARTIFACT_MISMATCH' if ambiguous || artifacts.keys.sort != ARTIFACTS.sort
      expected['artifacts'].each do |artifact|
        actual = artifacts[artifact['kind']]
        codes << 'ARTIFACT_MISMATCH' if actual && actual['digest'] != artifact['digest']
      end
      bundles, ambiguous = inventory(observed['bundles'], 'id', ['role'])
      expected_ids = expected['bundles'].map { |bundle| bundle['id'] }.sort
      codes << 'BUNDLE_INVENTORY' if ambiguous || bundles.keys.sort != expected_ids
      # Wrong role/id association has no unambiguous expected counterpart.
      expected['bundles'].each do |bundle|
        actual = bundles[bundle['id']]
        if actual && actual['role'] != bundle['role']
          codes << 'BUNDLE_INVENTORY'
          bundles.delete(bundle['id'])
        end
      end
      # UUIDs must also be unique across binaries, independently of correspondence.
      codes << 'ARCHITECTURE_MISMATCH' unless unique?(observed['bundles'].flat_map { |b| b['architectures'] }, 'uuid') || ambiguous
      symbols, ambiguous_symbols = inventory(observed['dsyms'], 'bundle_id')
      codes << 'DSYM_INVENTORY' if ambiguous_symbols || symbols.keys.sort != expected_ids
      expected['bundles'].each do |bundle|
        actual = bundles[bundle['id']]
        compare_bundle(bundle, actual, codes) if actual
        symbol = symbols[bundle['id']]
        next unless symbol
        symbol_pairs = symbol['architectures']
        codes << 'DSYM_MISMATCH' unless symbol['digest'] == bundle['dsym_digest'] &&
                                             valid_pairs?(symbol_pairs) && pairs_equal?(bundle['architectures'], symbol_pairs)
        # Missing/duplicate binary architecture counterparts suppress this pairing,
        # not the independent expected-to-dSYM comparison above.
        if actual && valid_pairs?(actual['architectures']) && valid_pairs?(symbol_pairs)
          codes << 'DSYM_MISMATCH' unless pairs_equal?(actual['architectures'], symbol_pairs)
        end
      end
      CODES.select { |code| codes.include?(code) }
    end

    def compare_bundle(expected, actual, codes)
      codes << 'BUNDLE_IDENTITY' unless IDENTITY.keys.all? { |key| expected[key] == actual[key] }
      codes << 'BINARY_MISMATCH' unless expected['binary_digest'] == actual['binary_digest']
      codes << 'ARCHITECTURE_MISMATCH' unless valid_pairs?(actual['architectures']) &&
                                                   pairs_equal?(expected['architectures'], actual['architectures'])
      FINDINGS.each do |category, _|
        evidence = actual['policy_evidence'][category]
        codes << 'POLICY_EVIDENCE_MISMATCH' unless evidence == expected['policy_evidence'][category]
        codes << 'EVIDENCE_UNKNOWN' if evidence['finding'] == 'synthetic_unknown'
        codes << 'FORBIDDEN_CREDENTIAL_FINDING' if category == 'forbidden_credentials' && evidence['finding'] == 'synthetic_present'
      end
    end
  end
end
