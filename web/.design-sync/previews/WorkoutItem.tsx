import { WorkoutItem } from 'splitiq';

const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, maxWidth: 620 }}>
    {children}
  </div>
);

export const ProgrammeWeek = () => (
  <Stack>
    <WorkoutItem
      session={{ label: 'Upper 1', done: true, slot: 'AM', note: 'Bench + pull focus' }}
      rail={{ top: 'MON', big: '1', bottom: 'wk4' }}
    />
    <WorkoutItem
      session={{ label: 'UT2 60min', done: true, slot: 'PM' }}
      rail={{ top: 'TUE', big: '2', bottom: 'wk4' }}
    />
    <WorkoutItem
      session={{ label: 'Lower 1 - RDL led', slot: 'AM', note: 'RDL 4x6 @ RPE 7. Stop at any hamstring signal.' }}
      rail={{ top: 'WED', big: '3', bottom: 'wk4' }}
      highlight
    />
    <WorkoutItem
      session={{ label: 'Z2 spin 40min', slot: 'PM' }}
      rail={{ top: 'THU', big: '4', bottom: 'wk4' }}
    />
    <WorkoutItem session={null} rail={{ top: 'FRI', big: '5', bottom: 'wk4' }} />
  </Stack>
);

export const TodayWithDetail = () => (
  <Stack>
    <WorkoutItem
      session={{
        label: 'Lower 2 - quad unilateral',
        slot: 'AM',
        note: 'Split squat 3x8 each side, leg press back-off.',
        fuel: 'Oats + whey pre',
        meal: { pre: 'Banana', post: 'Rice + chicken' },
      }}
      rail={{ top: 'SAT', big: '6', bottom: 'wk4' }}
      highlight
    />
  </Stack>
);

export const AccentByLabel = () => (
  <Stack>
    <WorkoutItem session={{ label: 'Upper 1' }} rail={{ top: 'MON', big: '1' }} />
    <WorkoutItem session={{ label: 'Lower 1' }} rail={{ top: 'TUE', big: '2' }} />
    <WorkoutItem session={{ label: 'Rate ladder 8x500m' }} rail={{ top: 'WED', big: '3' }} />
    <WorkoutItem session={{ label: 'VO2 intervals 5x4min' }} rail={{ top: 'THU', big: '4' }} />
    <WorkoutItem session={{ label: 'UT2 60min' }} rail={{ top: 'FRI', big: '5' }} />
    <WorkoutItem session={{ label: 'Yoga + foam roll' }} rail={{ top: 'SAT', big: '6' }} />
  </Stack>
);

export const WithoutRail = () => (
  <Stack>
    <WorkoutItem session={{ label: 'Upper 1', done: true, slot: 'AM' }} />
    <WorkoutItem session={{ label: 'UT2 60min', slot: 'PM' }} />
    <WorkoutItem session={null} />
  </Stack>
);
