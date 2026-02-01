/**
 * Schema Validator - Ajv-based I/O validation for all modules
 * CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 1.1-1.2
 *
 * @module lib/SchemaValidator
 * @description Provides JSON Schema validation for module inputs and outputs.
 * Ensures data contracts are enforced at module boundaries.
 *
 * @example
 * const { validateInput, validateOutput, formatErrors } = require('./lib/SchemaValidator');
 *
 * const result = validateInput('DiscoveryEngine', { sources: [...] });
 * if (!result.valid) {
 *   console.error('Validation failed:', formatErrors(result.errors));
 * }
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const path = require('path');
const fs = require('fs');

/**
 * SchemaValidator class for Ajv-based JSON Schema validation
 * @class
 */
class SchemaValidator {
    /**
     * Creates a new SchemaValidator instance
     * @constructor
     */
    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        addFormats(this.ajv);
        /** @type {Object.<string, Object>} Loaded schemas by module name */
        this.schemas = {};
        /** @type {Object.<string, Function>} Compiled validators by key */
        this.validators = {};
    }

    /**
     * Load and compile schema for a module
     * @param {string} moduleName - Name of the module (e.g., 'DiscoveryEngine')
     * @returns {Object|null} The loaded schema or null if not found
     */
    loadSchema(moduleName) {
        if (this.schemas[moduleName]) {
            return this.schemas[moduleName];
        }

        const schemaPath = path.join(__dirname, '../schemas', `${moduleName}.schema.json`);
        if (!fs.existsSync(schemaPath)) {
            return null;
        }

        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        this.schemas[moduleName] = schema;

        // Compile validators
        if (schema.input) {
            this.validators[`${moduleName}.input`] = this.ajv.compile(schema.input);
        }
        if (schema.output) {
            this.validators[`${moduleName}.output`] = this.ajv.compile(schema.output);
        }

        return schema;
    }

    /**
     * Validate input data for a module
     * @param {string} moduleName - Name of the module
     * @param {*} data - Data to validate
     * @returns {{valid: boolean, errors: Array|null}} Validation result
     */
    validateInput(moduleName, data) {
        this.loadSchema(moduleName);
        const validator = this.validators[`${moduleName}.input`];

        if (!validator) {
            return { valid: true, errors: null };
        }

        const valid = validator(data);
        return {
            valid,
            errors: valid ? null : validator.errors
        };
    }

    /**
     * Validate output data for a module
     * @param {string} moduleName - Name of the module
     * @param {*} data - Data to validate
     * @returns {{valid: boolean, errors: Array|null}} Validation result
     */
    validateOutput(moduleName, data) {
        this.loadSchema(moduleName);
        const validator = this.validators[`${moduleName}.output`];

        if (!validator) {
            return { valid: true, errors: null };
        }

        const valid = validator(data);
        return {
            valid,
            errors: valid ? null : validator.errors
        };
    }

    /**
     * Format validation errors for logging
     * @param {Array} errors - Array of Ajv error objects
     * @returns {string} Formatted error string
     */
    formatErrors(errors) {
        if (!errors || errors.length === 0) return '';
        return errors.map(e => `${e.instancePath} ${e.message}`).join('; ');
    }
}

// Singleton instance
const validator = new SchemaValidator();

module.exports = {
    SchemaValidator,
    validator,
    /**
     * Validate input for a module (convenience function)
     * @param {string} module - Module name
     * @param {*} data - Data to validate
     * @returns {{valid: boolean, errors: Array|null}}
     */
    validateInput: (module, data) => validator.validateInput(module, data),
    /**
     * Validate output for a module (convenience function)
     * @param {string} module - Module name
     * @param {*} data - Data to validate
     * @returns {{valid: boolean, errors: Array|null}}
     */
    validateOutput: (module, data) => validator.validateOutput(module, data),
    /**
     * Format validation errors (convenience function)
     * @param {Array} errors - Error array
     * @returns {string}
     */
    formatErrors: (errors) => validator.formatErrors(errors)
};
