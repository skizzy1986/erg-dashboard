import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuideDialog from '../components/GuideDialog.jsx';

function Harness({ initial = 'phases', wide = true }) {
  const [pane, setPane] = useState(null);
  return (
    <>
      <button type="button" onClick={() => setPane(initial)}>
        Open guide
      </button>
      <GuideDialog
        open={pane !== null}
        pane={pane}
        onPaneChange={setPane}
        onClose={() => setPane(null)}
        kv={{ er: '90°' }}
        metrics={null}
        wide={wide}
      />
    </>
  );
}

const open = async (user, props) => {
  render(<Harness {...props} />);
  const opener = screen.getByRole('button', { name: 'Open guide' });
  await user.click(opener);
  return opener;
};

describe('GuideDialog', () => {
  it('renders nothing while closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('exposes dialog, tablist, tabs and a labelled tabpanel', async () => {
    const user = userEvent.setup();
    await open(user);
    const dialog = screen.getByRole('dialog', { name: 'Coaching guide' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const tabs = within(dialog).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Phases',
      'Metrics and targets',
      'Measured rep',
      'Method and limits',
      'Sources',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel', { name: 'Phases' });
    expect(tabs[0]).toHaveAttribute('aria-controls', panel.id);
    expect(document.activeElement).toBe(tabs[0]);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('moves between panes with arrows, Home and End, wrapping', async () => {
    const user = userEvent.setup();
    await open(user);
    const tab = (name) => screen.getByRole('tab', { name });
    await user.keyboard('{ArrowRight}');
    expect(tab('Metrics and targets')).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tab('Metrics and targets'));
    expect(screen.getByRole('table')).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(tab('Sources'));
    expect(
      screen.getByRole('tabpanel', { name: 'Sources' })
    ).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(tab('Phases'));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tab('Sources'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(tab('Phases'));
    await user.keyboard('a');
    expect(document.activeElement).toBe(tab('Phases'));
  });

  it('selects a pane on click', async () => {
    const user = userEvent.setup();
    await open(user);
    await user.click(screen.getByRole('tab', { name: 'Method and limits' }));
    expect(screen.getByText('What would make it measured')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Measured rep' }));
    expect(screen.getByText('Compare a measured rep')).toBeInTheDocument();
  });

  it('traps Tab focus inside the dialog in both directions', async () => {
    const user = userEvent.setup();
    await open(user, { initial: 'measured' });
    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    const panel = screen.getByRole('tabpanel');
    expect(document.activeElement).toBe(panel);
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(close);
    // Focus escaped somehow (e.g. a click on the page): Tab brings it back.
    document.body.focus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
      true
    );
  });

  it('makes the page behind it inert while open, and restores it', async () => {
    const user = userEvent.setup();
    const opener = await open(user);
    expect(opener).toHaveAttribute('inert');
    expect(screen.getByRole('dialog').closest('[inert]')).toBeNull();
    await user.keyboard('{Escape}');
    expect(opener).not.toHaveAttribute('inert');
    expect(opener).toHaveFocus();
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    const opener = await open(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes from the Close button and the backdrop', async () => {
    const user = userEvent.setup();
    const opener = await open(user, { wide: false });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    await user.click(opener);
    await user.click(screen.getByTestId('guide-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('falls back to the first pane for an unknown id', async () => {
    const user = userEvent.setup();
    await open(user, { initial: 'bogus' });
    expect(screen.getByRole('tab', { name: 'Phases' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('renders the metrics as cards on a phone, with model values', () => {
    render(
      <GuideDialog
        open
        pane="metrics"
        onPaneChange={() => {}}
        onClose={() => {}}
        kv={{ fpkx: '1.38×' }}
        metrics={Array.from({ length: 18 }, (_, i) => `value ${i}`)}
        wide={false}
      />
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('value 17')).toBeInTheDocument();
    expect(
      screen.getByText(/The dynamic peak is up to/).closest('dd').textContent
    ).toContain('up to 1.38× these values');
  });

  it('lists every source with new-tab links', async () => {
    render(
      <GuideDialog
        open
        pane="sources"
        onPaneChange={() => {}}
        onClose={() => {}}
        wide
      />
    );
    const items = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(items).toHaveLength(15);
    const link = screen.getAllByRole('link', { name: /PubMed/ })[0];
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.textContent).toContain('opens in a new tab');
  });
});
