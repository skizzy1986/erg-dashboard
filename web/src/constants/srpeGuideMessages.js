import { msg } from '@lingui/core/macro';

// What trainingConfig.js's SRPE_GUIDE says on screen, row for row (keyed by
// its `range`). SRPE_GUIDE keeps its English shape and values, because other
// views read it as data; a view renders i18n._(SRPE_GUIDE_MESSAGES[range].label).
// `zone` is only there for the zones that are words; UT2, UT1 and AT/TR are
// codes and read the same in both languages.
// Pinned against SRPE_GUIDE in src/i18n/__tests__/descriptors.test.js. Kept
// out of trainingConfig.js because plain Node imports that file (check:zones),
// and a macro import cannot run there.
export const SRPE_GUIDE_MESSAGES = {
  '1-2': {
    label: msg({ message: 'Very easy', comment: 'sRPE scale, effort 1-2' }),
    anchor: msg({
      message: 'Could do all day. Full conversation, nose-breathing.',
      comment: 'sRPE scale, effort 1-2: the talk test',
    }),
    zone: msg({ message: 'Recovery', comment: 'Training zone name' }),
  },
  '3-4': {
    label: msg({ message: 'Easy (UT2)', comment: 'sRPE scale, effort 3-4' }),
    anchor: msg({
      message: 'Full conversation = 3. Comfortable, sustainable for hours.',
      comment: 'sRPE scale, effort 3-4: the talk test',
    }),
  },
  '5-6': {
    label: msg({ message: 'Steady (UT1)', comment: 'sRPE scale, effort 5-6' }),
    anchor: msg({
      message:
        'Talking in sentences but aware of breathing. Working but controlled.',
      comment: 'sRPE scale, effort 5-6: the talk test',
    }),
  },
  '7-8': {
    label: msg({
      message: 'Hard (threshold)',
      comment: 'sRPE scale, effort 7-8',
    }),
    anchor: msg({
      message: 'Short phrases only. Genuinely taxing. Threshold/AT.',
      comment: 'sRPE scale, effort 7-8: the talk test',
    }),
  },
  '9-10': {
    label: msg({ message: 'Max', comment: 'sRPE scale, effort 9-10' }),
    anchor: msg({
      message: 'Words impossible. All-out. Race/test efforts only.',
      comment: 'sRPE scale, effort 9-10: the talk test',
    }),
    zone: msg({ message: 'Sprint', comment: 'Training zone name' }),
  },
};
