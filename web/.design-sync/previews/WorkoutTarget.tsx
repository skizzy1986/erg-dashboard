import { WorkoutTarget } from 'splitiq';

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: 20, maxWidth: 560 }}>{children}</div>
);

export const TodaysTarget = () => (
  <Frame>
    <WorkoutTarget
      session={{
        label: 'UT1 45min @ 150-160W',
        duration: 45,
        srpe: 5,
        notes: 'Rate 20-22. Hold the low end for the first 15min, then settle.',
      }}
    />
  </Frame>
);

export const StrengthTarget = () => (
  <Frame>
    <WorkoutTarget
      session={{
        label: 'Lower 1 - RDL led',
        duration: 55,
        srpe: 7,
        notes: 'RDL 4x6 @ RPE 7, split squat 3x8 each side. Stop at any hamstring signal.',
      }}
    />
  </Frame>
);

export const NoPlannedSession = () => (
  <Frame>
    <WorkoutTarget session={null} />
  </Frame>
);
