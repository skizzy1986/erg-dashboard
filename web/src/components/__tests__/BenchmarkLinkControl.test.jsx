import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BenchmarkLinkControl from '../BenchmarkLinkControl.jsx';

// Deliberately NOT in date order: the server sorts sessions.date as TEXT, so
// this is the shape of payload the control actually receives.
const SESSIONS = [
  {
    id: 61,
    date: '7/5/26',
    label: 'CP RETEST — 1min + 4min max',
    status: 'completed',
    benchmark_key: null,
  },
  {
    id: 45,
    date: '6/23/26',
    label: 'CP Test - 4min MAX (GATED)',
    status: 'completed',
    benchmark_key: 'cp-test-1',
  },
  {
    id: 70,
    date: '8/3/26',
    label: 'PM — 5,000m',
    status: 'logged',
    benchmark_key: null,
  },
  {
    id: 80,
    date: '8/20/26',
    label: 'Planned 5k',
    status: 'planned',
    benchmark_key: null,
  },
  {
    id: 81,
    date: '8/19/26',
    label: 'Abandoned 5k',
    status: 'cancelled',
    benchmark_key: null,
  },
];

function renderControl(props = {}) {
  return render(
    <BenchmarkLinkControl
      benchmarkKey="5k-tt"
      benchmarkName="5k Time Trial"
      linkedSessionId={null}
      sessions={SESSIONS}
      onLink={() => {}}
      {...props}
    />
  );
}

describe('BenchmarkLinkControl', () => {
  it('reads LINK when nothing is linked and LINKED ✓ when a session holds it', () => {
    const { unmount } = renderControl();
    expect(screen.getByRole('button')).toHaveTextContent('LINK');
    expect(screen.getByRole('button')).not.toHaveTextContent('LINKED');
    unmount();

    renderControl({ linkedSessionId: 70 });
    expect(screen.getByRole('button')).toHaveTextContent('LINKED ✓');
  });

  // The candidate list is the only place a planned or cancelled row could leak
  // back in as an offerable "completion", so the filter is asserted directly.
  it('offers only completed sessions, newest first', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button'));

    const labels = screen
      .getAllByRole('option')
      .map((o) => o.textContent.trim());
    expect(labels).toEqual([
      '— not done —',
      '8/3/26 — PM — 5,000m',
      '7/5/26 — CP RETEST — 1min + 4min max',
      '6/23/26 — CP Test - 4min MAX (GATED) (linked: cp-test-1)',
    ]);
    expect(labels.join('|')).not.toContain('Planned 5k');
    expect(labels.join('|')).not.toContain('Abandoned 5k');
  });

  // sessions.date is TEXT and unpadded, so two pieces on one day are
  // indistinguishable by date alone. The later row of that day is the one more
  // likely to be the test, so the higher id sorts first.
  it('breaks a same-date tie on the higher id', async () => {
    const user = userEvent.setup();
    renderControl({
      sessions: [
        { id: 90, date: '8/3/26', label: 'AM shakeout', status: 'completed' },
        { id: 91, date: '8/3/26', label: 'PM 5,000m', status: 'completed' },
      ],
    });
    await user.click(screen.getByRole('button'));

    expect(
      screen.getAllByRole('option').map((o) => o.textContent.trim())
    ).toEqual(['— not done —', '8/3/26 — PM 5,000m', '8/3/26 — AM shakeout']);
  });

  // Client-side half of AC4. It stays visible rather than being filtered out so
  // "where did session 45 go?" is never a question.
  it('renders a session claimed by another benchmark as disabled and says which', async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole('button'));

    const claimed = screen.getByRole('option', { name: /cp-test-1/ });
    expect(claimed).toBeDisabled();
    expect(claimed.textContent).toContain('(linked: cp-test-1)');
    expect(
      screen.getByRole('option', { name: /PM — 5,000m/ })
    ).not.toBeDisabled();
  });

  it('calls onLink with the session id on select and with null on "— not done —"', async () => {
    const user = userEvent.setup();
    const onLink = vi.fn();
    renderControl({ onLink, linkedSessionId: 70 });
    await user.click(screen.getByRole('button'));

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '61');
    expect(onLink).toHaveBeenCalledWith(61);

    await user.selectOptions(select, '');
    expect(onLink).toHaveBeenLastCalledWith(null);
  });

  // A 23505 is "another session already claims this benchmark". It must reach
  // the reader, and the select must still be there to retry against.
  it('renders the error inline and leaves the select open', () => {
    renderControl({ error: 'Another session already claims this benchmark' });
    expect(
      screen.getByText('Another session already claims this benchmark')
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('disables the button and the select while busy', async () => {
    const user = userEvent.setup();
    renderControl({ busy: true, error: 'nope' });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();

    // A disabled toggle cannot be clicked open or shut.
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
