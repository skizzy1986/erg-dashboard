import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareLink from '../components/ShareLink.jsx';
import { captureError } from '../../utils/sentry.js';
import {
  SHARE_BLOCKED,
  SHARE_COPIED,
  SHARE_COPIED_MS,
  SHARE_UNAVAILABLE,
  SHARE_WAITING,
} from '../constants/share.js';

vi.mock('../../utils/sentry.js', () => ({ captureError: vi.fn() }));

const LINK = 'https://x.test/squat#t=1.00&paused';
const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING
const button = () =>
  screen.getByRole('button', { name: 'Copy link to this view' });
const statusLine = () => screen.getByTestId('share-status');
const field = () =>
  screen.queryByRole('textbox', { name: 'Link to this view' });

const refuse = (name) =>
  vi
    .spyOn(window.navigator.clipboard, 'writeText')
    .mockRejectedValue(Object.assign(new Error('x'), { name }));

function setup({ wide = false, ready = true, getLink = () => LINK } = {}) {
  const user = userEvent.setup();
  const utils = render(
    <ShareLink getLink={getLink} ready={ready} wide={wide} />
  );
  return { user, ...utils };
}

beforeEach(() => captureError.mockClear());
afterEach(() => vi.restoreAllMocks());

describe('Copy link (criterion 1)', () => {
  it('is laid out from the first paint, disabled with a reason until ready', () => {
    const { rerender } = setup({ ready: false });
    expect(button()).toBeDisabled();
    expect(button()).toHaveAccessibleDescription(SHARE_WAITING);
    // The visible label is inside the accessible name (WCAG 2.5.3).
    expect(button()).toHaveTextContent('Copy link');
    rerender(<ShareLink getLink={() => LINK} ready wide={false} />);
    expect(button()).toBeEnabled();
    expect(button()).not.toHaveAccessibleDescription();
    expect(button().style.minHeight).toBe('44px');
  });

  it('carries an h3, and its live region is mounted from the first paint', () => {
    for (const wide of [false, true]) {
      const { unmount } = setup({ wide, ready: false });
      expect(
        screen.getByRole('heading', { level: 3, name: 'Share' })
      ).toBeInTheDocument();
      expect(statusLine()).toHaveAttribute('role', 'status');
      expect(statusLine()).toHaveAttribute('aria-live', 'polite');
      expect(statusLine()).toHaveAttribute('aria-atomic', 'true');
      expect(statusLine()).toHaveTextContent('');
      unmount();
    }
  });
});

describe('copying (criteria 2, 3, 4)', () => {
  it('writes the link in the press itself, and says so', async () => {
    const order = [];
    const getLink = vi.fn(() => {
      order.push('build');
      return LINK;
    });
    const { user } = setup({ getLink });
    const write = vi
      .spyOn(window.navigator.clipboard, 'writeText')
      .mockImplementation(async () => {
        order.push('write');
      });
    fireEvent.click(button());
    // No await between the build and the write: still inside the click.
    expect(order).toEqual(['build', 'write']);
    expect(write).toHaveBeenCalledWith(LINK);
    write.mockRestore();
    await user.click(button());
    expect(await window.navigator.clipboard.readText()).toBe(LINK);
    expect(await screen.findByText(SHARE_COPIED)).toBe(statusLine());
    expect(field()).toBeNull();
    expect(captureError).not.toHaveBeenCalled();
  });

  it('clears "Link copied." after about four seconds', async () => {
    vi.useFakeTimers();
    try {
      render(<ShareLink getLink={() => LINK} ready wide={false} />);
      vi.spyOn(window.navigator, 'clipboard', 'get').mockReturnValue({
        writeText: () => Promise.resolve(),
      });
      fireEvent.click(button());
      await act(async () => {});
      expect(statusLine()).toHaveTextContent(SHARE_COPIED);
      act(() => vi.advanceTimersByTime(SHARE_COPIED_MS - 100));
      expect(statusLine()).toHaveTextContent(SHARE_COPIED);
      act(() => vi.advanceTimersByTime(200));
      expect(statusLine()).toHaveTextContent('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refused: opens the field, focused and fully selected, unreported', async () => {
    const { user } = setup();
    refuse('NotAllowedError');
    await user.click(button());
    expect(await screen.findByText(SHARE_BLOCKED)).toBe(statusLine());
    expect(field()).toHaveValue(LINK);
    expect(field()).toHaveAttribute('readonly');
    expect(document.activeElement).toBe(field());
    expect(field().selectionStart).toBe(0);
    expect(field().selectionEnd).toBe(LINK.length);
    expect(captureError).not.toHaveBeenCalled();

    // Close returns focus to Copy link, and the message goes with the field.
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(field()).toBeNull();
    expect(document.activeElement).toBe(button());
    expect(statusLine()).toHaveTextContent('');
  });

  it('Escape in the field closes it and returns focus', async () => {
    const { user } = setup({ wide: true });
    refuse('NotAllowedError');
    await user.click(button());
    await screen.findByText(SHARE_BLOCKED);
    await user.keyboard('{Escape}');
    expect(field()).toBeNull();
    expect(document.activeElement).toBe(button());
  });

  it('absent API (or an insecure context): the field, unreported', async () => {
    const { user } = setup();
    Object.defineProperty(window.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    await user.click(button());
    expect(await screen.findByText(SHARE_UNAVAILABLE)).toBe(statusLine());
    expect(field()).toHaveValue(LINK);
    expect(document.activeElement).toBe(field());
    expect(captureError).not.toHaveBeenCalled();
  });

  it('any other rejection is a defect: reported, and the field still opens', async () => {
    const { user } = setup();
    refuse('TypeError');
    await user.click(button());
    expect(await screen.findByText(SHARE_BLOCKED)).toBe(statusLine());
    expect(field()).toHaveValue(LINK);
    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      where: 'ShareLink',
      stage: 'write',
    });
  });

  it('a synchronous throw from writeText is reported too', async () => {
    const { user } = setup();
    vi.spyOn(window.navigator.clipboard, 'writeText').mockImplementation(() => {
      throw new Error('boom');
    });
    await user.click(button());
    expect(await screen.findByText(SHARE_BLOCKED)).toBeInTheDocument();
    expect(field()).toHaveValue(LINK);
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      where: 'ShareLink',
      stage: 'write',
    });
  });

  it('a link that cannot be built is reported, and the page URL is offered', async () => {
    window.history.replaceState(null, '', '/squat?x=1#t=1.00');
    const { user } = setup({
      getLink: () => {
        throw new Error('no view');
      },
    });
    await user.click(button());
    expect(await screen.findByText(SHARE_BLOCKED)).toBeInTheDocument();
    expect(field()).toHaveValue(`${window.location.origin}/squat#t=1.00`);
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      where: 'ShareLink',
      stage: 'build',
    });
    window.history.replaceState(null, '', '/');
  });

  it('two quick presses: one field, the last message, a blank between', async () => {
    setup();
    const seen = [];
    const obs = new window.MutationObserver(() =>
      seen.push(statusLine().textContent)
    );
    obs.observe(statusLine(), {
      childList: true,
      subtree: true,
      characterData: true,
    });
    let resolve;
    const write = vi
      .spyOn(window.navigator.clipboard, 'writeText')
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          })
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('x'), { name: 'NotAllowedError' })
      );
    fireEvent.click(button());
    fireEvent.click(button());
    await screen.findByText(SHARE_BLOCKED);
    // The first press succeeds last, and is ignored: no "Link copied.".
    await act(async () => resolve());
    expect(write).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(statusLine()).toHaveTextContent(SHARE_BLOCKED);
    expect(captureError).not.toHaveBeenCalled();
    // A third press re-announces the same text: blank, then the message.
    seen.length = 0;
    refuse('NotAllowedError');
    fireEvent.click(button());
    await act(async () => {});
    obs.disconnect();
    expect(seen[0]).toBe('');
    expect(seen.at(-1)).toBe(SHARE_BLOCKED);
  });

  it('a success while the field is open closes it', async () => {
    const { user } = setup();
    const spy = refuse('NotAllowedError');
    await user.click(button());
    await screen.findByText(SHARE_BLOCKED);
    spy.mockResolvedValue(undefined);
    await user.click(button());
    expect(await screen.findByText(SHARE_COPIED)).toBeInTheDocument();
    expect(field()).toBeNull();
  });
});

describe('placement (Gate 2, G2-1)', () => {
  it('desktop: the panel is visually hidden when idle, never unmounted, and overlays when shown', async () => {
    const { user } = setup({ wide: true });
    const panel = screen.getByTestId('share-panel');
    expect(panel).toContainElement(statusLine());
    // srOnly: out of flow, one pixel.
    expect(panel.style.position).toBe('absolute');
    expect(panel.style.width).toBe('1px');
    refuse('NotAllowedError');
    await user.click(button());
    await screen.findByText(SHARE_BLOCKED);
    expect(screen.getByTestId('share-panel')).toBe(panel);
    expect(panel.style.width).toBe('');
    expect(panel.style.position).toBe('absolute');
    expect(panel.style.bottom).toBe('calc(100% + 8px)');
    expect(panel.style.left).toBe('0px');
    expect(panel.style.right).toBe('0px');
    expect(panel).toContainElement(field());
    // The message reads before the field it says is "below".
    expect(
      statusLine().compareDocumentPosition(field()) & FOLLOWING
    ).toBeTruthy();
  });

  it('phone: everything in flow, the message before the field', async () => {
    const { user } = setup({ wide: false });
    expect(screen.queryByTestId('share-panel')).toBeNull();
    refuse('NotAllowedError');
    await user.click(button());
    await screen.findByText(SHARE_BLOCKED);
    expect(field().style.position).toBe('');
    expect(field().style.minHeight).toBe('44px');
    expect(screen.getByRole('button', { name: 'Close' }).style.minHeight).toBe(
      '44px'
    );
    expect(
      statusLine().compareDocumentPosition(field()) & FOLLOWING
    ).toBeTruthy();
  });
});
