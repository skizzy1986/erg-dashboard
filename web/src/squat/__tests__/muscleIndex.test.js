import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REGION_NAMES, REGION_OF } from '../constants/muscleRegions.js';
import { MUSCLE_SYNONYMS } from '../constants/muscleSynonyms.js';
import {
  buildMuscleIndex,
  filterMuscles,
  findBySlug,
  foldQuery,
  regionsMatching,
  slugify,
} from '../utils/muscleIndex.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const MUSCLES = manifest.meta.muscles;

// The authored assignment, by NAME. REGION_OF in the shipped constant is
// index-keyed to save ~760 bytes of the squat bundle; this is the readable
// record of what those indices mean, and it fails loudly if a data
// regeneration moves one. Re-derive both together, never one alone.
const NAMED = [
  ['Gluteus maximus', 0],
  ['Gluteus medius', 5],
  ['Gluteus minimus', 5],
  ['Piriformis', 5],
  ['Iliacus', 4],
  ['Psoas major', 4],
  ['Tensor fasciae latae', 5],
  ['Iliotibial tract', 5],
  ['Sartorius', 4],
  ['Rectus femoris', 1],
  ['Vastus lateralis', 1],
  ['Vastus medialis', 1],
  ['Vastus intermedius', 1],
  ['Adductor longus', 3],
  ['Adductor brevis', 3],
  ['Adductor magnus', 0],
  ['Adductor minimus', 0],
  ['Gracilis', 3],
  ['Biceps femoris (long head)', 2],
  ['Biceps femoris (short head)', 2],
  ['Semitendinosus', 2],
  ['Semimembranosus', 2],
  ['Gastrocnemius (lateral head)', 6],
  ['Gastrocnemius (medial head)', 6],
  ['Soleus', 6],
  ['Achilles (calcaneal) tendon', 6],
  ['Plantaris', 6],
  ['Tibialis anterior', 6],
  ['Tibialis posterior', 6],
  ['Extensor digitorum longus', 6],
  ['Extensor hallucis longus', 6],
  ['Fibularis tertius', 6],
  ['Flexor digitorum longus', 6],
  ['Flexor hallucis longus', 6],
  ['Fibularis longus', 6],
  ['Fibularis brevis', 6],
  ['Obturator internus', 5],
  ['Obturator externus', 5],
  ['Gemellus superior', 5],
  ['Gemellus inferior', 5],
  ['Quadratus femoris', 5],
  ['Pectineus', 4],
  ['Popliteus', 2],
  ['Rectus abdominis', 7],
  ['External oblique', 7],
  ['Internal oblique', 7],
  ['Quadratus lumborum', 7],
  ['Iliocostalis lumborum', 7],
  ['Iliocostalis thoracis', 7],
  ['Longissimus thoracis', 7],
  ['Spinalis thoracis', 7],
  ['Multifidus', 7],
  ['Semispinalis thoracis', 7],
  ['Serratus posterior inferior', 7],
  ['Latissimus dorsi', 8],
  ['Trapezius (descending part)', 8],
  ['Trapezius (transverse part)', 8],
  ['Trapezius (ascending part)', 8],
  ['Rhomboid major', 8],
  ['Rhomboid minor', 8],
  ['Levator scapulae', 8],
  ['Serratus anterior', 8],
  ['Pectoralis minor', 8],
  ['Subclavius', 8],
  ['Sternocleidomastoid', 8],
  ['Scalenus anterior', 8],
  ['Scalenus medius', 8],
  ['Scalenus posterior', 8],
  ['Splenius capitis', 8],
  ['Splenius cervicis', 8],
  ['Semispinalis capitis', 8],
  ['Semispinalis cervicis', 8],
  ['Longissimus capitis', 8],
  ['Longissimus cervicis', 8],
  ['Iliocostalis cervicis', 8],
  ['Spinalis cervicis', 8],
  ['Serratus posterior superior', 8],
  ['Deltoid (acromial part)', 9],
  ['Deltoid (clavicular part)', 9],
  ['Deltoid (spinal part)', 9],
  ['Pectoralis major (clavicular part)', 9],
  ['Pectoralis major (sternocostal part)', 9],
  ['Pectoralis major (abdominal part)', 9],
  ['Teres major', 8],
  ['Teres minor', 9],
  ['Infraspinatus', 9],
  ['Supraspinatus', 9],
  ['Subscapularis', 9],
  ['Coracobrachialis', 9],
  ['Biceps brachii (long head)', 9],
  ['Biceps brachii (short head)', 9],
  ['Brachialis', 9],
  ['Triceps brachii (long head)', 9],
  ['Triceps brachii (lateral head)', 9],
  ['Triceps brachii (medial head)', 9],
  ['Anconeus', 9],
  ['Brachioradialis', 9],
  ['Extensor carpi radialis longus', 10],
  ['Extensor carpi radialis brevis', 10],
  ['Extensor digitorum', 10],
  ['Extensor carpi ulnaris (humeral head)', 10],
  ['Extensor carpi ulnaris (ulnar head)', 10],
  ['Flexor carpi radialis', 10],
  ['Palmaris longus', 10],
  ['Flexor carpi ulnaris (humeral head)', 10],
  ['Flexor carpi ulnaris (ulnar head)', 10],
  ['Flexor digitorum superficialis (humeroulnar head)', 10],
  ['Flexor digitorum superficialis (radial head)', 10],
  ['Flexor digitorum profundus', 10],
  ['Flexor pollicis longus', 10],
  ['Pronator teres (humeral head)', 10],
  ['Pronator teres (ulnar head)', 10],
  ['Supinator', 10],
  ['Abductor pollicis longus', 10],
  ['Extensor pollicis longus', 10],
  ['Extensor indicis', 10],
  ['Pronator quadratus', 10],
  ['External intercostals', 7],
];

describe('the 118-row region assignment', () => {
  it('covers every muscle in the data, in manifest order, exactly once', () => {
    expect(NAMED).toHaveLength(118);
    expect(NAMED.map(([n]) => n)).toEqual(MUSCLES.map((m) => m.name));
    expect(new Set(NAMED.map(([n]) => n)).size).toBe(118);
  });

  it('is exactly what REGION_OF encodes', () => {
    expect(NAMED.map(([, r]) => r)).toEqual([...REGION_OF]);
  });

  it('honours the two assignments Scott fixed', () => {
    const regionOf = (name) => NAMED.find(([n]) => n === name)[1];
    // Their own role strings: "powerful hip extensor at depth".
    expect(REGION_NAMES[regionOf('Adductor magnus')]).toBe('Hip extensors');
    expect(REGION_NAMES[regionOf('Adductor minimus')]).toBe('Hip extensors');
    // "Pulled tight to lock the upper back" is the squat job.
    expect(REGION_NAMES[regionOf('Latissimus dorsi')]).toBe(
      'Upper back and bar shelf'
    );
    expect(REGION_NAMES[regionOf('Teres major')]).toBe(
      'Upper back and bar shelf'
    );
  });

  it('puts the two tendons in the region their anatomy sits in', () => {
    const tendons = MUSCLES.filter((m) => m.tendon).map((m) => m.name);
    expect(tendons).toEqual([
      'Iliotibial tract',
      'Achilles (calcaneal) tendon',
    ]);
    const regionOf = (name) => REGION_NAMES[NAMED.find(([n]) => n === name)[1]];
    expect(regionOf('Iliotibial tract')).toBe('Hip stabilisers and abductors');
    expect(regionOf('Achilles (calcaneal) tendon')).toBe(
      'Calves, ankle and foot'
    );
  });

  it('produces the counts the build measured, eleven non-empty regions', () => {
    const counts = REGION_NAMES.map(
      (_, id) => REGION_OF.filter((r) => r === id).length
    );
    expect(counts).toEqual([3, 4, 5, 3, 4, 10, 14, 12, 24, 19, 20]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(118);
    expect(counts.every((n) => n > 0)).toBe(true);
  });
});

describe('slugify', () => {
  it('is collision-free over all 118 names and URL-safe', () => {
    const slugs = MUSCLES.map((m) => slugify(m.name));
    expect(new Set(slugs).size).toBe(118);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]{1,64}$/);
  });

  it('keeps the bracketed head variants distinct', () => {
    expect(slugify('Biceps femoris (long head)')).toBe(
      'biceps-femoris-long-head'
    );
    expect(slugify('Extensor carpi ulnaris (humeral head)')).not.toBe(
      slugify('Extensor carpi ulnaris (ulnar head)')
    );
  });

  it('trims the dashes punctuation leaves at the ends', () => {
    expect(slugify('(Soleus)')).toBe('soleus');
    expect(slugify('Achilles (calcaneal) tendon')).toBe(
      'achilles-calcaneal-tendon'
    );
  });
});

describe('buildMuscleIndex', () => {
  const index = buildMuscleIndex(MUSCLES);

  it('indexes every muscle with the fields the UI needs', () => {
    expect(index.all).toHaveLength(118);
    const glute = index.all[0];
    expect(glute).toMatchObject({
      i: 0,
      name: 'Gluteus maximus',
      slug: 'gluteus-maximus',
      region: 0,
      regionName: 'Hip extensors',
      hasAct: true,
    });
    expect(glute.role).toMatch(/Main hip extensor/);
  });

  it('marks the two tendons as having no activation estimate', () => {
    expect(index.all.filter((m) => !m.hasAct).map((m) => m.i)).toEqual([7, 25]);
    expect(index.all.filter((m) => m.hasAct)).toHaveLength(116);
  });

  it('groups into the eleven regions in hips-first order', () => {
    expect(index.regions.map((g) => g.name)).toEqual(REGION_NAMES);
    expect(index.regions.map((g) => g.id)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(index.regions.flatMap((g) => g.items)).toHaveLength(118);
  });

  it('survives an absent manifest', () => {
    const empty = buildMuscleIndex(undefined);
    expect(empty.all).toEqual([]);
    expect(empty.regions).toEqual([]);
  });

  it('throws rather than defaulting a muscle the region map does not cover', () => {
    expect(() =>
      buildMuscleIndex([...MUSCLES, { name: 'Extra muscle' }])
    ).toThrow(/No region for muscle 118 \(Extra muscle\)/);
  });
});

describe('filterMuscles', () => {
  const index = buildMuscleIndex(MUSCLES);
  const names = (q) =>
    filterMuscles(index, q).regions.flatMap((g) => g.items.map((m) => m.name));

  it('returns everything untouched for an empty query', () => {
    const all = filterMuscles(index, '');
    expect(all.regions).toBe(index.regions);
    expect(all.matches).toBe(118);
    expect(filterMuscles(index, '   ').matches).toBe(118);
  });

  it('is case-insensitive, trims whitespace and ignores diacritics', () => {
    for (const q of ['soleus', 'SOLEUS', '  Soleus  ', 'sóleus']) {
      expect(names(q), q).toContain('Soleus');
    }
  });

  it('matches coach words through the synonym table', () => {
    expect(names('glutes')).toContain('Gluteus maximus');
    expect(names('quads')).toContain('Vastus lateralis');
    expect(names('lats')).toContain('Latissimus dorsi');
    expect(names('grip')).toContain('Flexor digitorum profundus');
    expect(regionsMatching('calves').has(6)).toBe(true);
    // A partial word still finds the region, so the filter works as you type.
    expect(regionsMatching('glu').has(0)).toBe(true);
    expect(Object.values(MUSCLE_SYNONYMS).every((id) => REGION_NAMES[id])).toBe(
      true
    );
  });

  // The matcher used to test `q.includes(word)` as well, which made any query
  // CONTAINING a coach word drag in that word's whole region.
  it('does not drag in a region because the query contains a coach word', () => {
    expect(regionsMatching('gluteus medius').size).toBe(0);
    expect(names('gluteus medius')).toEqual(['Gluteus medius']);
    expect(names('gluteus medius')).not.toContain('Adductor magnus');
    expect(names('gluteus medius')).not.toContain('Gluteus maximus');

    expect(regionsMatching('quadratus lumborum').size).toBe(0);
    expect(names('quadratus lumborum')).toEqual(['Quadratus lumborum']);
    expect(names('quadratus lumborum')).not.toContain('Vastus lateralis');
  });

  it('ignores the synonym table for a one- or two-character query', () => {
    // "a" used to reach nine of the eleven regions.
    for (const q of ['a', 'g', 'ab', 'hi', 'q']) {
      expect(regionsMatching(q).size, q).toBe(0);
    }
    expect(regionsMatching('')).toEqual(new Set());
    // Names and roles still match, which is what a two-letter query means.
    expect(names('ab').length).toBeLessThan(118);
    expect(names('ab')).toContain('Rectus abdominis');
    expect(names('ab')).not.toContain('Soleus');
  });

  it('matches a region name as well as a muscle name', () => {
    expect(names('hamstrings').length).toBeGreaterThan(1);
    expect(names('Knee extensors')).toEqual([
      'Rectus femoris',
      'Vastus lateralis',
      'Vastus medialis',
      'Vastus intermedius',
    ]);
  });

  it('drops a region that has no surviving option, as the APG requires', () => {
    const { regions, matches } = filterMuscles(index, 'soleus');
    expect(matches).toBe(1);
    expect(regions).toHaveLength(1);
    expect(regions[0].name).toBe('Calves, ankle and foot');
    for (const g of regions) expect(g.items.length).toBeGreaterThan(0);
  });

  it('returns no groups at all when nothing matches', () => {
    const none = filterMuscles(index, 'zzzqqq');
    expect(none.matches).toBe(0);
    expect(none.regions).toEqual([]);
  });

  it('folds a null or undefined query to empty', () => {
    expect(foldQuery(null)).toBe('');
    expect(foldQuery(undefined)).toBe('');
  });
});

describe('findBySlug', () => {
  const index = buildMuscleIndex(MUSCLES);

  it('resolves a live slug and rejects everything else', () => {
    expect(findBySlug(index, 'soleus').name).toBe('Soleus');
    expect(findBySlug(index, 'not-a-muscle')).toBeNull();
    expect(findBySlug(index, null)).toBeNull();
    expect(findBySlug(index, '')).toBeNull();
  });

  it('round-trips every one of the 118 slugs', () => {
    for (const m of index.all) {
      expect(findBySlug(index, m.slug).i).toBe(m.i);
    }
  });
});
