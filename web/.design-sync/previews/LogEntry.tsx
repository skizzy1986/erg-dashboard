import { LogEntry } from 'splitiq';

const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, maxWidth: 620 }}>
    {children}
  </div>
);

export const ErgSession = () => (
  <Stack>
    <LogEntry
      entry={{
        type: 'Z2 Aerobic',
        _isErg: true,
        label: 'UT2 60min steady',
        date: '6/19',
        duration: '60min',
        srpe: 5,
        distance_m: 13850,
        avg_watts: 138,
        avg_hr: 132,
        coachNote: 'Held 20spm throughout. Hamstring quiet.',
      }}
    />
  </Stack>
);

export const StrengthSession = () => (
  <Stack>
    <LogEntry
      entry={{
        type: 'Upper Strength',
        label: 'Upper 1',
        date: '6/18',
        duration: '48min',
        srpe: 7,
        prs: 2,
        exercises: [
          { name: 'Bench Press', weight: '80kg', volume: '2400', e1rm: '95', pr: true },
          { name: 'Chest-Supported Row', weight: '60kg', volume: '2160', e1rm: '74' },
          { name: 'Overhead Press', weight: '45kg', volume: '1080', e1rm: '55', pr: true },
        ],
      }}
    />
  </Stack>
);

export const PlannedSession = () => (
  <Stack>
    <LogEntry
      entry={{
        type: 'Z2 Aerobic',
        _isErg: true,
        status: 'planned',
        label: 'UT1 45min @ 150-160W',
        date: '6/21',
        duration: '45min',
        distance_m: null,
        avg_watts: null,
        avg_hr: null,
        coachNote: 'Rate 20-22. Back off if TSB drops below -20.',
      }}
    />
  </Stack>
);

export const SessionTypes = () => (
  <Stack>
    <LogEntry entry={{ type: 'Z2 Aerobic', _isErg: true, label: 'UT2 60min', date: '6/19', duration: '60min', srpe: 5, distance_m: 13850, avg_watts: 138, avg_hr: 132 }} />
    <LogEntry entry={{ type: 'Lower Strength', label: 'Lower 2 - quad unilateral', date: '6/17', duration: '52min', srpe: 7 }} />
    <LogEntry entry={{ type: 'Cycling', label: 'Z2 spin 40min', date: '6/16', duration: '40min', srpe: 4 }} />
    <LogEntry entry={{ type: 'Rest', label: 'Rest day', date: '6/15' }} />
  </Stack>
);

export const CompletedAndFaded = () => (
  <Stack>
    <LogEntry
      entry={{ type: 'Upper Strength', label: 'Upper 2', date: '6/14', duration: '45min', srpe: 6, prs: 1 }}
      done
    />
    <LogEntry
      entry={{ type: 'Z2 Aerobic', _isErg: true, label: 'UT2 50min', date: '6/13', duration: '50min', srpe: 5, distance_m: 11400, avg_watts: 134, avg_hr: 128 }}
      done
    />
  </Stack>
);
