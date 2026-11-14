import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { i18n } from '@lingui/core';
import { messages as en } from '../../locales/en.po';
import { messages as es } from '../../locales/es.po';
import { messages as viewsEn } from '../../locales/views/en.po';
import { messages as viewsEs } from '../../locales/views/es.po';
import {
  computePersonalBaselines,
  computeReadiness,
  readinessStatusText,
} from '../../utils/recoveryAnalytics.js';

// i18n Phase 2a: every settled dashboard view renders Spanish from the views
// catalog, and the same render in English is unchanged. Charts are stubbed so
// their axis formatter is observable: jsdom gives ResponsiveContainer no size,
// so the real one draws nothing.

const mocks = vi.hoisted(() => ({
  vitals: null,
  anchors: null,
  sessions: [],
  tss: [],
  bp: null,
  labs: null,
  injuries: null,
  insert: null,
}));

vi.mock('recharts', () => {
  const Pass = ({ children }) => <div>{children}</div>;
  const Nothing = () => null;
  return {
    ResponsiveContainer: Pass,
    LineChart: Pass,
    BarChart: Pass,
    Line: Nothing,
    Bar: Nothing,
    ReferenceLine: Nothing,
    YAxis: Nothing,
    Tooltip: Nothing,
    XAxis: ({ tickFormatter }) => (
      <span data-testid="x-tick">
        {tickFormatter ? tickFormatter('06/07') : '06/07'}
      </span>
    ),
  };
});
vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }),
    },
    from: () => ({ insert: (...a) => mocks.insert(...a) }),
  },
}));
vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));
vi.mock('../../hooks/useVitals.js', () => ({ useVitals: () => mocks.vitals }));
vi.mock('../../hooks/useVitalsSync.js', () => ({
  useVitalsSync: () => ({ mutate: () => {}, isPending: false }),
}));
vi.mock('../../hooks/useAnchors.js', () => ({
  useAnchors: () => mocks.anchors,
}));
vi.mock('../../hooks/useSessions.js', () => ({
  useSessions: () => ({ data: mocks.sessions, isLoading: false }),
}));
vi.mock('../../hooks/useTSSHistory.js', () => ({
  useTSSHistory: () => ({ data: mocks.tss, isLoading: false }),
}));
vi.mock('../../hooks/useBpReadings.js', () => ({
  useBpReadings: () => mocks.bp,
}));
vi.mock('../../hooks/useLabResults.js', () => ({
  useLabResults: () => mocks.labs,
}));
vi.mock('../../hooks/useInjuries.js', () => ({
  useInjuries: () => mocks.injuries,
}));
// Out of scope here (their own PRs), and heavy: stubbed out.
vi.mock('../../views/ErgLiveView.jsx', () => ({ default: () => null }));
vi.mock('../../StrengthLogger.jsx', () => ({ default: () => null }));
vi.mock('../../views/mobile/MobileStrength.jsx', () => ({
  default: () => null,
}));
vi.mock('../../components/StravaConnectPanel.jsx', () => ({
  default: () => null,
}));

import OverviewView from '../../views/OverviewView.jsx';
import CalendarView from '../../views/CalendarView.jsx';
import PlanView from '../../views/PlanView.jsx';
import LogView from '../../views/LogView.jsx';
import RecoveryView from '../../views/RecoveryView.jsx';
import LogEntry from '../../components/LogEntry.jsx';
import LogSessionForm from '../../components/LogSessionForm.jsx';
import LoadTooltip from '../../components/LoadTooltip.jsx';
import HealthRecordCard from '../../components/HealthRecordCard.jsx';
import WorkoutItem from '../../components/WorkoutItem.jsx';
import MobileToday from '../../views/mobile/MobileToday.jsx';
import MobileTrain from '../../views/mobile/MobileTrain.jsx';
import MobileProgress from '../../views/mobile/MobileProgress.jsx';
import MobileAnalytics from '../../views/mobile/MobileAnalytics.jsx';
import MobileSessionLog from '../../views/mobile/MobileSessionLog.jsx';
import MobileRecovery from '../../views/mobile/MobileRecovery.jsx';

const ALL_ES = { ...en, ...viewsEn, ...es, ...viewsEs };

// Both dashboard catalogs, as a Spanish visitor with the shell loaded has.
const inSpanish = () => {
  i18n.load('es', ALL_ES);
  i18n.activate('es');
};

const withClient = (ui) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {ui}
  </QueryClientProvider>
);

// Render the same UI in English and in Spanish, each in its own tree.
function both(ui) {
  const english = render(withClient(ui));
  const enText = english.container.textContent;
  english.unmount();
  inSpanish();
  const spanish = render(withClient(ui));
  return { enText, esText: spanish.container.textContent };
}

const settled = (rows = []) => ({
  rows,
  data: rows,
  isPending: false,
  isError: false,
  isPaused: false,
});

const VITALS_ROW = {
  date: '2026-06-20',
  rhr: 50,
  hrv: 40,
  sleep: 8,
  sleepScore: 85,
};

function setVitals(row = VITALS_ROW) {
  const personalBaselines = computePersonalBaselines([row]);
  const readiness = computeReadiness(row, personalBaselines, -5);
  mocks.vitals = {
    latest: row,
    readiness,
    readinessScore: readiness.score,
    readinessLabel: readiness.status,
    personalBaselines,
    tsbNow: -5,
    vitalsHistory: [{ ...row, bodyweight: null }],
    history: [],
    hasPersonalBaselines: false,
    isLoading: false,
  };
}

// Pinned: Thursday 2 January 2031, local time.
const NOW = new Date(2031, 0, 2, 9);
const mdy = (offset) => {
  const d = new Date(2031, 0, 2 + offset);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  setVitals();
  mocks.anchors = {
    anchors: {
      current_phase: { value: 'base' },
      current_block: { value: 'block 2' },
    },
    cp: 205,
    ftp: 250,
    cpAvailable: true,
  };
  mocks.sessions = [];
  mocks.tss = [];
  mocks.bp = settled();
  mocks.labs = settled();
  mocks.injuries = settled();
  mocks.insert = vi.fn().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Overview in Spanish', () => {
  const ui = (
    <OverviewView
      latest={{ tsb: -5, ctl: 62, atl: 67 }}
      tsbColor="currentColor"
      loadData={[{ date: '06/07', ctl: 55, atl: 60, tsb: -5, tss: 50 }]}
      loggedSessions={[]}
      latestErg={{ avg_watts: 150 }}
      totalErgDist={12000}
      totalSessions={3}
      isWide
    />
  );

  it('renders its headings, tiles, readiness status and band in Spanish', () => {
    inSpanish();
    render(ui);
    for (const text of [
      'DISPOSICIÓN',
      'LISTO',
      'SESIONES REGISTRADAS',
      'DISTANCIA EN ERGÓMETRO',
      'CARGA DE ENTRENAMIENTO',
      'CP de remo 205W · FTP de bici 250W',
      'Estado físico',
      'Fatiga',
      'Forma',
      '⚡ Neutral: carga reciente y estado físico en equilibrio',
      'SESIONES RECIENTES',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Disposición')).toBeInTheDocument();
    // The phase pill is data: its words stay as stored, only its name moves.
    expect(screen.getByLabelText('Fase de entrenamiento')).toHaveTextContent(
      'BASE · BLOCK 2'
    );
    expect(screen.getByTestId('x-tick')).toHaveTextContent('07/06');
  });

  it('keeps English exactly as it was', () => {
    render(ui);
    for (const text of [
      'READINESS',
      'READY',
      'SESSIONS LOGGED',
      'Rowing CP 205W · bike FTP 250W',
      '⚡ Neutral — recent load and fitness balanced',
      'RECENT SESSIONS',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByTestId('x-tick')).toHaveTextContent('06/07');
    expect(screen.getByLabelText('Training phase')).toHaveTextContent(
      'BASE · BLOCK 2'
    );
  });
});

describe('Calendar in Spanish', () => {
  const ui = (
    <CalendarView
      loggedSessions={[
        { date: mdy(0), label: 'Erg 60' },
        { date: mdy(0), label: 'Upper 1' },
        { date: mdy(-1), label: 'Lower 1' },
      ]}
      plannedSessions={[{ date: mdy(1), label: 'Erg 45' }]}
      cancelledSessions={[
        { date: mdy(2), label: 'Bike' },
        { date: mdy(3), label: 'Row' },
        { date: mdy(3), label: 'Row 2' },
      ]}
    />
  );

  it('names days and months in es-CO and pluralises the badges', () => {
    inSpanish();
    render(ui);
    // NOW is Thursday 2 January 2031; the rail runs 3 days back, 13 forward.
    for (const d of ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']) {
      expect(screen.getAllByText(d).length, d).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('dic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ene').length).toBeGreaterThan(0);
    expect(screen.queryByText('ene.')).toBeNull();
    expect(screen.queryByText('Jan')).toBeNull();
    expect(screen.getByText('✓ HECHAS ×2')).toBeInTheDocument();
    expect(screen.getByText('✓ HECHA')).toBeInTheDocument();
    expect(screen.getByText('PLANIFICADA')).toBeInTheDocument();
    expect(screen.getByText('⊘ 1 CANCELADA')).toBeInTheDocument();
    expect(screen.getByText('⊘ 2 CANCELADAS')).toBeInTheDocument();
    expect(screen.getByText('● HOY')).toBeInTheDocument();
    expect(
      screen.getByText('ÚLTIMOS 3 DÍAS · HOY · PRÓXIMOS 13 ·')
    ).toBeInTheDocument();
  });

  it('keeps English exactly as it was', () => {
    const { enText, esText } = both(ui);
    for (const text of [
      'THU',
      'Jan',
      '✓ DONE ×2',
      '✓ DONE',
      'PLANNED',
      '⊘ 1 CANCELLED',
      '⊘ 2 CANCELLED',
      'LAST 3 DAYS · TODAY · NEXT 13 · ✓ done · planned · ⊘ cancelled',
    ]) {
      expect(enText).toContain(text);
    }
    expect(esText).not.toContain('CANCELLED');
  });

  it('translates its status lines', () => {
    inSpanish();
    render(<CalendarView dbStatus="error" />);
    expect(
      screen.getByText('No se pudieron cargar las sesiones.')
    ).toBeInTheDocument();
  });
});

describe('Plan and Log in Spanish', () => {
  it('Plan: banner and empty state', () => {
    const { enText, esText } = both(
      <PlanView plannedSessions={[]} loggedKeys={new Set()} />
    );
    expect(esText).toContain('EL PLAN. Próximas prescripciones del Coach');
    expect(esText).toContain('No hay sesiones planificadas próximas.');
    expect(enText).toContain(
      'THE PLAN. Upcoming prescriptions from Coach (today forward).'
    );
  });

  it('Log: the sRPE guide from its descriptors, and the banner', () => {
    const { enText, esText } = both(
      <LogView logDisplaySessions={[]} isWide={false} />
    );
    expect(esText).toContain('HISTORIAL DE SESIONES: Comparte enlaces');
    expect(esText).toContain('Muy fácil');
    expect(esText).toContain(
      '— Podrías seguir todo el día. Conversación completa, respirando por la nariz.'
    );
    expect(esText).toContain('Duro (umbral)');
    expect(esText).not.toContain('Very easy');
    expect(enText).toContain(
      'Very easy— Could do all day. Full conversation, nose-breathing.'
    );
    expect(enText).toContain('SESSION LOG: Share Concept2 links');
  });
});

describe('LogEntry in Spanish', () => {
  const entry = {
    type: 'erg',
    _isErg: true,
    label: 'Erg 60',
    date: '6/19/26',
    duration: '60:00',
    status: 'planned',
    distance_m: 12000,
    avg_watts: 150,
    avg_hr: 140,
  };

  it('shows a stored M/D/YY date day first, and its badges and metrics', () => {
    inSpanish();
    render(<LogEntry entry={entry} />);
    expect(screen.getByText(/^19\/6\/26/)).toBeInTheDocument();
    expect(screen.getByText('PLANIFICADA')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Erg 60'));
    expect(screen.getByText('DURACIÓN')).toBeInTheDocument();
    expect(screen.getByText('VATIOS PROM.')).toBeInTheDocument();
  });

  it('keeps the stored date and English as they were', () => {
    render(<LogEntry entry={entry} />);
    expect(screen.getByText(/^6\/19\/26/)).toBeInTheDocument();
    expect(screen.getByText('PLANNED')).toBeInTheDocument();
  });
});

describe('LogSessionForm in Spanish', () => {
  const open = () =>
    fireEvent.click(screen.getByText('＋ REGISTRAR UNA SESIÓN DE FUERZA'));

  it('says the date is month/day/year and validates in Spanish', () => {
    inSpanish();
    render(withClient(<LogSessionForm />));
    open();
    expect(screen.getByText('FECHA (MES/DÍA/AÑO)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('mm/dd/aa')).toBeInTheDocument();
    // What it writes is untouched: today, as sessions.date stores it.
    expect(screen.getByDisplayValue(mdy(0))).toBeInTheDocument();
    fireEvent.click(screen.getByText('ENVIAR SESIÓN'));
    expect(
      screen.getByText(
        'Agrega un nombre para la sesión (p. ej., Tren inferior 2).'
      )
    ).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Tren inferior 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.click(screen.getByText('ENVIAR SESIÓN'));
    expect(
      screen.getByText('Agrega al menos un ejercicio.')
    ).toBeInTheDocument();
  });

  it('saves in Spanish with the date exactly as typed, month first, as English does', async () => {
    const submit = async (fill) => {
      mocks.insert = vi.fn().mockResolvedValue({ error: null });
      const view = render(withClient(<LogSessionForm />));
      fill();
      await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
      view.unmount();
      return mocks.insert.mock.calls[0][0];
    };
    const enRow = await submit(() => {
      fireEvent.click(screen.getByText('＋ LOG A STRENGTH SESSION'));
      fireEvent.change(screen.getByPlaceholderText('6/19/26'), {
        target: { value: '3/4/26' },
      });
      fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
        target: { value: 'Lower 2' },
      });
      fireEvent.change(screen.getByPlaceholderText('Exercise name'), {
        target: { value: 'Squat' },
      });
      fireEvent.click(screen.getByText('SUBMIT SESSION'));
    });
    inSpanish();
    const esRow = await submit(() => {
      open();
      fireEvent.change(screen.getByPlaceholderText('mm/dd/aa'), {
        target: { value: '3/4/26' },
      });
      fireEvent.change(screen.getByPlaceholderText('Tren inferior 2'), {
        target: { value: 'Lower 2' },
      });
      fireEvent.change(screen.getByPlaceholderText('Nombre del ejercicio'), {
        target: { value: 'Squat' },
      });
      fireEvent.click(screen.getByText('ENVIAR SESIÓN'));
    });
    expect(esRow.date).toBe('3/4/26');
    expect(esRow).toEqual(enRow);
  });

  it('prefixes a failed save in Spanish and keeps the server message raw', async () => {
    mocks.insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    inSpanish();
    render(withClient(<LogSessionForm />));
    open();
    fireEvent.change(screen.getByPlaceholderText('Tren inferior 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre del ejercicio'), {
      target: { value: 'Squat' },
    });
    fireEvent.click(screen.getByText('ENVIAR SESIÓN'));
    await waitFor(() =>
      expect(screen.getByText('No se pudo guardar: boom')).toBeInTheDocument()
    );
  });

  it('keeps English exactly as it was', async () => {
    mocks.insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    render(withClient(<LogSessionForm />));
    fireEvent.click(screen.getByText('＋ LOG A STRENGTH SESSION'));
    expect(screen.getByText('DATE')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('6/19/26')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), {
      target: { value: 'Squat' },
    });
    fireEvent.click(screen.getByText('SUBMIT SESSION'));
    await waitFor(() =>
      expect(screen.getByText('Save failed: boom')).toBeInTheDocument()
    );
  });
});

describe('Recovery in Spanish', () => {
  beforeEach(() => {
    mocks.labs = settled([
      {
        id: 'l1',
        panel: 'lipid',
        collected_on: '2026-06-07',
        marker: 'LDL Cholesterol',
        value: 2.1,
        unit: 'mmol/L',
        ref_low: 0.5,
        ref_high: 3,
        ref_source: 'Lab',
      },
    ]);
    mocks.injuries = settled([
      {
        id: 'i1',
        region: 'Hamstring',
        side: 'left',
        status: 'monitoring',
        onset_on: '2026-06-07',
      },
    ]);
  });

  it('maps the readiness status code to Spanish, and dates day first', () => {
    inSpanish();
    render(<RecoveryView isWide />);
    expect(screen.getByText('LISTO')).toBeInTheDocument();
    expect(screen.getByText('Entrena según lo planeado')).toBeInTheDocument();
    expect(screen.getByText('PRESIÓN ARTERIAL')).toBeInTheDocument();
    expect(screen.getByText('SEGUIMIENTO DE LESIONES')).toBeInTheDocument();
    expect(screen.getByText('Tomada el 7/6/26')).toBeInTheDocument();
    expect(screen.getByText('ref. 0.5–3 (Lab)')).toBeInTheDocument();
    expect(screen.getByText('desde el 7/6/26')).toBeInTheDocument();
    expect(screen.getByText('FC EN REPOSO')).toBeInTheDocument();
  });

  it('keeps English exactly as it was', () => {
    render(<RecoveryView isWide />);
    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(screen.getByText('Collected 6/7/26')).toBeInTheDocument();
    expect(screen.getByText('ref 0.5–3 (Lab)')).toBeInTheDocument();
    expect(screen.getByText('since 6/7/26')).toBeInTheDocument();
  });

  it('names the lipid markers in Spanish, and keeps an unknown one as stored', () => {
    mocks.labs = settled([
      {
        id: 'l1',
        panel: 'lipid',
        collected_on: '2026-06-07',
        marker: 'LDL Cholesterol',
        value: 2.1,
        unit: 'mmol/L',
      },
      {
        id: 'l2',
        panel: 'lipid',
        collected_on: '2026-06-07',
        marker: 'ApoB',
        value: 0.9,
        unit: 'g/L',
      },
    ]);
    const { enText, esText } = both(<RecoveryView isWide />);
    for (const name of [
      'Colesterol total',
      'Colesterol LDL',
      'Colesterol HDL (hombres)',
      'Colesterol HDL (mujeres)',
      'Triglicéridos',
      'ApoB',
    ]) {
      expect(esText).toContain(name);
    }
    expect(esText).not.toMatch(/Cholesterol|Triglycerides/);
    for (const name of [
      'Total Cholesterol',
      'LDL Cholesterol',
      'HDL Cholesterol (male)',
      'HDL Cholesterol (female)',
      'Triglycerides',
      'ApoB',
    ]) {
      expect(enText).toContain(name);
    }
  });

  it('translates every readiness status code, and passes an unknown one through', () => {
    inSpanish();
    expect(
      ['READY', 'CAUTION', 'FATIGUED', 'NO DATA', 'X'].map((s) =>
        readinessStatusText(i18n, s)
      )
    ).toEqual(['LISTO', 'PRECAUCIÓN', 'FATIGADO', 'SIN DATOS', 'X']);
  });

  it('names a health card in its error line', () => {
    inSpanish();
    render(
      <HealthRecordCard
        title="PRESIÓN ARTERIAL"
        query={{ isPending: false, isError: true, data: undefined }}
      />
    );
    expect(
      screen.getByText('No se pudo cargar: presión arterial.')
    ).toBeInTheDocument();
  });
});

describe('Chart dates in Spanish', () => {
  it('the load tooltip reads day first; English keeps MM/DD', () => {
    const payload = [{ payload: { date: '06/07', ctl: 1, atl: 1, tsb: 0 } }];
    const { enText, esText } = both(<LoadTooltip active payload={payload} />);
    expect(enText).toContain('06/07');
    expect(esText).toContain('07/06');
  });
});

describe('WorkoutItem in Spanish', () => {
  it('labels today and the meal notes', () => {
    inSpanish();
    render(
      <WorkoutItem
        session={{ label: 'Erg', fuel: 'oats', meal: { pre: 'a', post: 'b' } }}
        rail={{ top: 'JUE', big: 2 }}
        highlight
      />
    );
    expect(screen.getByText('● HOY')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Erg'));
    expect(screen.getByText('🍽 ALIMENTACIÓN:')).toBeInTheDocument();
    expect(screen.getByText('Antes:')).toBeInTheDocument();
    expect(screen.getByText('Después:')).toBeInTheDocument();
  });
});

describe('Mobile in Spanish', () => {
  it('Today: header date in es-CO, readiness and band', () => {
    mocks.tss = [{ date: mdy(0), tss: 0 }];
    const { enText, esText } = both(<MobileToday />);
    const fmt = (locale) =>
      NOW.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    expect(enText).toContain(fmt('en-GB'));
    expect(esText).toContain(fmt('es-CO'));
    expect(fmt('es-CO')).not.toBe(fmt('en-GB'));
    expect(esText).toContain('DISPOSICIÓN');
    expect(esText).toContain('LISTO');
    expect(esText).toContain('Neutral: en equilibrio');
    expect(esText).toContain('ESTA SEMANA');
    expect(enText).toContain('Neutral — balanced');
  });

  it('Analytics: headings, the band and day-first session dates', () => {
    mocks.tss = [{ date: mdy(0), tss: 0 }];
    mocks.sessions = [
      { id: 1, date: '6/19/26', status: 'completed', label: 'Erg 60' },
    ];
    const { enText, esText } = both(<MobileAnalytics />);
    for (const text of [
      'FORMA / TSB',
      'ESTADO FÍSICO / CTL',
      'FATIGA / ATL',
      'TENDENCIA DE CARGA · 30 DÍAS',
      'SESIONES RECIENTES',
      'PRÓXIMAS',
      'Neutral: en equilibrio',
      '19/6/26',
    ]) {
      expect(esText).toContain(text);
    }
    expect(enText).toContain('6/19/26');
    expect(enText).toContain('FORM / TSB');
  });

  it('Session log: whole-word filter chips and a pluralised count', () => {
    mocks.sessions = [
      { id: 1, date: '6/19/26', type: 'Erg', label: 'Erg 60' },
      { id: 2, date: '6/18/26', type: 'Strength', label: 'Upper 1' },
    ];
    inSpanish();
    render(<MobileSessionLog />);
    expect(screen.getByRole('button', { name: 'Todas' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ergómetro' })
    ).toBeInTheDocument();
    expect(screen.getByText('2 registradas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fuerza' }));
    expect(screen.getByText('1 registrada')).toBeInTheDocument();
    expect(screen.getByText('FUERZA')).toBeInTheDocument();
  });

  it('Session log: English chips and count are unchanged', () => {
    mocks.sessions = [{ id: 1, date: '6/19/26', type: 'Erg', label: 'Erg' }];
    render(<MobileSessionLog />);
    for (const name of ['All', 'Erg', 'Strength']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('1 logged')).toBeInTheDocument();
  });

  it('Recovery: headings, guidance, baseline and day-first chart ticks', () => {
    const { enText, esText } = both(<MobileRecovery />);
    for (const text of [
      'RECUPERACIÓN',
      'Entrena según lo planeado',
      'vs. línea base',
      'TENDENCIA DE HRV — 14 DÍAS',
      'FC EN REPOSO',
    ]) {
      expect(esText).toContain(text);
    }
    expect(esText).toContain('07/06');
    expect(enText).toContain('vs baseline');
    expect(enText).toContain('06/07');
  });

  it('Train: the picker entries; Progress: its tabs and their name', () => {
    inSpanish();
    render(<MobileTrain onMode={() => {}} />);
    expect(screen.getByText('INICIA UNA SESIÓN')).toBeInTheDocument();
    expect(screen.getByText('Sesión de ergómetro')).toBeInTheDocument();
    expect(screen.getByText('Sesión de fuerza')).toBeInTheDocument();
    render(<MobileProgress />);
    expect(
      screen.getByRole('tablist', { name: 'Progreso' })
    ).toBeInTheDocument();
    for (const name of ['Carga', 'Historial', 'Fuerza']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    }
  });
});
