import { BottomTabBar, THEME } from 'splitiq';

// BottomTabBar is position:fixed. The preview card's cell already establishes a
// containing block (transform), so the bar pins to the cell rather than the
// page — which is how it reads inside a phone frame in the real app.
const Phone = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      transform: 'translateZ(0)',
      height: 150,
      background: THEME.bg,
      border: `1px solid ${THEME.border}`,
      borderRadius: 10,
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: '14px 16px', fontSize: 11, color: THEME.muted, letterSpacing: 1 }}>
      APP CONTENT
    </div>
    {children}
  </div>
);

export const LogTabActive = () => (
  <Phone>
    <BottomTabBar activeTab="log" onTabChange={() => {}} />
  </Phone>
);

export const LiveTabActive = () => (
  <Phone>
    <BottomTabBar activeTab="erg" onTabChange={() => {}} />
  </Phone>
);
