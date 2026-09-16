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
  class UniqueObject < Hash
    def []=(key, value)
      raise Rejection.new('DUPLICATE_KEY') if key?(key)
      super
    end
  end
  private_constant :Rejection, :UniqueObject

  def self.validate(expected_json, observed_json)
    expected = parse(expected_json, 'synthetic-archive-expected/v1')
    observed = parse(observed_json, 'synthetic-archive-observed/v1')
    result([])
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
      raw = String.new(input).force_encoding(Encoding::UTF_8)
      reject('INPUT_ENCODING') unless raw.valid_encoding? && !raw.start_with?("\xEF\xBB\xBF") && !raw.include?("\x00")
      reject('INPUT_LIMIT') if raw.bytesize > 65_536
      begin
        document = JSON.parse(raw, object_class: UniqueObject, create_additions: false,
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
  end
end
