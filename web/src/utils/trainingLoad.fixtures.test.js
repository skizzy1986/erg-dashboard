import { test, expect } from 'vitest';
import { calcTrainingLoad } from './trainingLoad.js';
import fixtures from '../../../test-fixtures/training-load/fixtures.json';

fixtures.scenarios.forEach(({ description, input, expected }) => {
  test(description, () => {
    const result = calcTrainingLoad(input);
    expect(result).toEqual(expected);
  });
});
