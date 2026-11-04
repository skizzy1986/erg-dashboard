import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadStatus, { statusText } from '../components/LoadStatus.jsx';
import CapabilityNotice, {
  CAPABILITY_MESSAGES,
} from '../components/CapabilityNotice.jsx';
import FormCheck from '../components/FormCheck.jsx';
import AttributionFooter from '../components/AttributionFooter.jsx';
import SquatHeader from '../components/SquatHeader.jsx';
import RichText from '../components/RichText.jsx';
import { summariseRep } from '../utils/repSummary.js';

const manifest = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/squat/assets/squat-manifest.json'),
    'utf8'
  )
);
const summary = summariseRep(manifest.meta);

describe('LoadStatus', () => {
  it('shows download progress in MB in a live region', () => {
    render(
      <LoadStatus stage="fetching" loaded={1_200_000} total={2_202_168} />
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status.textContent).toBe('Downloading anatomy 1.2 / 2.2 MB');
    expect(screen.getByTestId('load-bar').style.width).toBe('54%');
  });

  it.each([
    ['decoding', 'Unpacking'],
    ['building', 'Building model'],
    ['ready', 'Model loaded — 3D view coming next'],
  ])('names the %s stage', (stage, label) => {
    render(<LoadStatus stage={stage} loaded={0} total={1} />);
    expect(screen.getByRole('status').textContent).toBe(label);
  });

  it('shows the error with a working Retry', async () => {
    const onRetry = vi.fn();
    render(
      <LoadStatus
        stage="error"
        loaded={0}
        total={1}
        error="It broke."
        onRetry={onRetry}
      />
    );
    expect(screen.getByText('It broke.')).toBeInTheDocument();
    expect(screen.queryByTestId('load-bar')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has text for every stage, and none for an unknown one', () => {
    expect(statusText({ stage: 'fetching', loaded: 0, total: 2e6 })).toBe(
      'Downloading anatomy 0.0 / 2.0 MB'
    );
    expect(statusText({ stage: 'error', error: 'x' })).toBe('x');
    expect(statusText({ stage: 'unsupported' })).toBe('');
  });
});

describe('CapabilityNotice', () => {
  it('renders nothing when everything is supported', () => {
    const { container } = render(
      <CapabilityNotice
        capabilities={{ webgl: true, decompression: true, worker: true }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('explains each missing capability and that the rest still works', () => {
    render(
      <CapabilityNotice
        capabilities={{ webgl: false, decompression: false, worker: true }}
      />
    );
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByText(CAPABILITY_MESSAGES.webgl)).toBeInTheDocument();
    expect(
      screen.getByText(CAPABILITY_MESSAGES.decompression)
    ).toBeInTheDocument();
    expect(screen.queryByText(CAPABILITY_MESSAGES.worker)).toBeNull();
    expect(screen.getByText(/still work/)).toBeInTheDocument();
  });
});

describe('FormCheck', () => {
  it('presents ten items as the modelled reference ideal', () => {
    render(<FormCheck summary={summary} kv={summary.kv} />);
    expect(
      screen.getByRole('heading', { name: 'Form check' })
    ).toBeInTheDocument();
    expect(screen.getByText('Reference ideal — modelled')).toBeInTheDocument();
    expect(screen.getByText('10 of 10 on target')).toBeInTheDocument();
    expect(screen.getByText(/not a measurement of you/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(
      screen.getByText('1.63 s down, 0.92 s up, 0.61 m/s mean drive')
    ).toBeInTheDocument();
    expect(screen.queryByText(/your result/i)).toBeNull();
    expect(screen.queryByText(/9 of 9/)).toBeNull();
  });

  it('shows placeholders before the model arrives, and says when it cannot', () => {
    const { rerender } = render(<FormCheck summary={null} />);
    expect(screen.getAllByText('Loading model value…')).toHaveLength(10);
    expect(screen.queryByText(/on target$/)).toBeNull();
    rerender(<FormCheck summary={null} unavailable />);
    expect(screen.getAllByText('Model value unavailable')).toHaveLength(10);
  });
});

describe('AttributionFooter', () => {
  it('credits BodyParts3D and OpenSim, and opens Sources', async () => {
    const onSources = vi.fn();
    render(<AttributionFooter onSources={onSources} />);
    const link = screen.getByRole('link', {
      name: 'Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP',
    });
    expect(link).toHaveAttribute('href', 'https://lifesciencedb.jp/bp3d/');
    expect(screen.getByRole('contentinfo').textContent).toBe(
      'Anatomy: BodyParts3D © DBCLS, CC BY-SA 2.1 JP · Muscle paths: OpenSim models · Sources'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sources' }));
    expect(onSources).toHaveBeenCalled();
  });
});

describe('SquatHeader', () => {
  it('shows the wordmark, the dashboard link and a theme switch', async () => {
    const onThemeChange = vi.fn();
    render(<SquatHeader preference="system" onThemeChange={onThemeChange} />);
    expect(screen.getByText('SPLITIQ')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open SplitIQ/ })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('shortens the link on a phone', () => {
    render(<SquatHeader preference="dark" onThemeChange={() => {}} compact />);
    expect(screen.getByRole('link').textContent).toMatch(/^SplitIQ/);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

describe('RichText', () => {
  it('renders each segment kind and an ellipsis for a missing value', () => {
    const { container } = render(
      <p>
        <RichText
          segments={[
            'a ',
            { k: 'x' },
            ' ',
            { k: 'y' },
            { b: 'B' },
            { i: 'I' },
            { code: 'C' },
            { z: 1 },
          ]}
          kv={{ x: '1 s' }}
        />
      </p>
    );
    expect(container.textContent).toBe('a 1 s …BIC');
    expect(container.querySelector('strong').textContent).toBe('B');
    expect(container.querySelector('em').textContent).toBe('I');
    expect(container.querySelector('code').textContent).toBe('C');
  });
});
