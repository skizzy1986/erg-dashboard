import { test, expect } from 'vitest';
import { calcTrainingLoad } from './trainingLoad.js';
import fixtures from '../../../test-fixtures/training-load/fixtures.json';

fixtures.scenarios.forEach(({ description, input, expected }) => {
  test(description, () => {
    const lastDate = input[input.length - 1].date;
    const result = calcTrainingLoad(input, lastDate);
    expect(result).toEqual(expected);
  });
});
