import { describe, it, expect } from 'vitest';
import { validatePersistenceSchema } from '../utils/apiBridge';
import { validateModelAgainstCatalog } from '../utils/modelValidation';

describe('Agent Settings & Persistence Unit Tests', () => {
  it('should validate persistence schema correctly and catch mismatches', () => {
    const mockPersistence = {
      configs: {
        'hermes-agent': {
          model: {
            provider: 'ollama',
            model: 'gemma4-soul:latest'
          }
        },
        'zeroclaw': {
          model: null // missing/invalid model object
        }
      }
    };

    const result = validatePersistenceSchema(mockPersistence);
    expect(result.isValid).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
    expect(result.validatedConfigs.configs['zeroclaw'].model).toBeDefined();
  });

  it('should validate valid persistence schema successfully', () => {
    const validPersistence = {
      configs: {
        'hermes-agent': {
          model: {
            provider: 'ollama',
            model: 'gemma4-soul:latest'
          }
        }
      }
    };

    const result = validatePersistenceSchema(validPersistence);
    expect(result.isValid).toBe(true);
    expect(result.mismatches.length).toBe(0);
  });

  it('should validate custom and catalog models with validateModelAgainstCatalog', async () => {
    // Test empty model string
    const emptyResult = await validateModelAgainstCatalog('');
    expect(emptyResult.isValid).toBe(false);

    // Test custom model allowed by heuristic rules (e.g., gemma4-soul)
    const customResult = await validateModelAgainstCatalog('gemma4-soul:latest', 'http://localhost:11434', 'ollama');
    expect(customResult.isValid).toBe(true);
  });
});
