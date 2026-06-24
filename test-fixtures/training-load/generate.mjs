import { calcTrainingLoad } from '../../web/src/utils/trainingLoad.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scenarios = [
  {
    description: 'single day, 100 TSS from zero',
    input: [{ date: '2026-06-13', tss: 100, note: '' }],
  },
  {
    description: 'three consecutive days, equal TSS',
    input: [
      { date: '2026-06-11', tss: 80, note: '' },
      { date: '2026-06-12', tss: 80, note: '' },
      { date: '2026-06-13', tss: 80, note: '' },
    ],
  },
  {
    description: 'rest day between two efforts',
    input: [
      { date: '2026-06-11', tss: 100, note: '' },
      { date: '2026-06-13', tss: 100, note: '' },
    ],
  },
  {
    description: 'descending TSS over three days',
    input: [
      { date: '2026-06-11', tss: 150, note: '' },
      { date: '2026-06-12', tss: 100, note: '' },
      { date: '2026-06-13', tss: 50, note: '' },
    ],
  },
];

const fixtures = {
  generated: new Date().toISOString(),
  scenarios: scenarios.map(({ description, input }) => ({
    description,
    input,
    expected: calcTrainingLoad(input),
  })),
};

writeFileSync(
  join(__dirname, 'fixtures.json'),
  JSON.stringify(fixtures, null, 2)
);
console.log('fixtures.json written');
