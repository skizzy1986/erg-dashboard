import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// jsdom doesn't implement scrollIntoView — mock it globally
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

// Mock the useCoach hook so CoachView is testable in isolation
const mockSendMessage = vi.fn();
const mockSetModel = vi.fn();
const mockClearHistory = vi.fn();

const mockCoachState = {
  messages: [],
  // messagesReady defaults to false so auto-brief doesn't fire in most tests
  messagesReady: false,
  streamingContent: '',
  isStreaming: false,
  error: null,
  model: 'sonnet',
  setModel: mockSetModel,
  sendMessage: mockSendMessage,
  clearHistory: mockClearHistory,
  vitals: { latest: null, readinessScore: 0, readinessLabel: 'FATIGUED' },
  tssQuery: { data: [] },
  todayPlanned: null,
};

vi.mock('../../hooks/useCoach.js', () => ({
  useCoach: () => mockCoachState,
}));

vi.mock('../../utils/trainingLoad.js', () => ({
  calcTrainingLoad: () => [],
}));

import CoachView from '../CoachView.jsx';

function resetCoachState(overrides = {}) {
  Object.assign(
    mockCoachState,
    {
      messages: [],
      messagesReady: false,
      streamingContent: '',
      isStreaming: false,
      error: null,
      model: 'sonnet',
      todayPlanned: null,
    },
    overrides
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCoachState();
  localStorage.clear();
});

describe('CoachView', () => {
  it('renders starter prompt chips when messages is empty', () => {
    // Jul 14 2026 = home week (weekNum 3), CP test already past — static fallback chips render
    vi.useFakeTimers({ now: new Date(2026, 6, 14) });
    render(<CoachView />);
    expect(screen.getByText("How's my training load looking?")).toBeTruthy();
    expect(screen.getByText('What should I focus on this week?')).toBeTruthy();
    expect(screen.getByText('Is it safe to add intensity today?')).toBeTruthy();
  });

  it('calls sendMessage when a starter chip is clicked', () => {
    // Jul 14 ensures static fallback chips are present
    vi.useFakeTimers({ now: new Date(2026, 6, 14) });
    render(<CoachView />);
    fireEvent.click(screen.getByText("How's my training load looking?"));
    expect(mockSendMessage).toHaveBeenCalledWith(
      "How's my training load looking?"
    );
  });

  it('does not show starter chips when messages exist', () => {
    resetCoachState({
      messages: [{ role: 'user', content: 'Hello' }],
    });
    render(<CoachView />);
    expect(screen.queryByText("How's my training load looking?")).toBeNull();
  });

  it('renders user message bubbles', () => {
    resetCoachState({
      messages: [{ role: 'user', content: 'What is my TSB?' }],
    });
    render(<CoachView />);
    expect(screen.getByText('What is my TSB?')).toBeTruthy();
  });

  it('renders assistant message bubbles', () => {
    resetCoachState({
      messages: [{ role: 'assistant', content: 'Your TSB is -8.' }],
    });
    render(<CoachView />);
    expect(screen.getByText('Your TSB is -8.')).toBeTruthy();
  });

  it('shows streaming content with cursor while isStreaming', () => {
    resetCoachState({
      streamingContent: 'Your training load is',
      isStreaming: true,
    });
    render(<CoachView />);
    expect(screen.getByText('Your training load is')).toBeTruthy();
    expect(screen.getByText('▌')).toBeTruthy();
  });

  it('does not show cursor when not streaming', () => {
    resetCoachState({ streamingContent: '', isStreaming: false });
    render(<CoachView />);
    expect(screen.queryByText('▌')).toBeNull();
  });

  it('disables send button while isStreaming', () => {
    resetCoachState({ isStreaming: true });
    render(<CoachView />);
    const sendBtn = screen.getByRole('button', { name: 'SEND' });
    expect(sendBtn.disabled).toBe(true);
  });

  it('calls sendMessage when form is submitted via send button', () => {
    render(<CoachView />);
    const textarea = screen.getByPlaceholderText(/Ask your coach/);
    fireEvent.change(textarea, { target: { value: 'How do I improve CTL?' } });
    fireEvent.click(screen.getByRole('button', { name: 'SEND' }));
    expect(mockSendMessage).toHaveBeenCalledWith('How do I improve CTL?');
  });

  it('calls sendMessage when Enter pressed without Shift', () => {
    render(<CoachView />);
    const textarea = screen.getByPlaceholderText(/Ask your coach/);
    fireEvent.change(textarea, { target: { value: 'Quick question' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockSendMessage).toHaveBeenCalledWith('Quick question');
  });

  it('does not call sendMessage on Shift+Enter', () => {
    render(<CoachView />);
    const textarea = screen.getByPlaceholderText(/Ask your coach/);
    fireEvent.change(textarea, { target: { value: 'Multi-line' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('shows error banner when error is set', () => {
    resetCoachState({ error: 'Failed to connect' });
    render(<CoachView />);
    expect(screen.getByText('Failed to connect')).toBeTruthy();
  });

  it('calls setModel when model toggle clicked', () => {
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'QUICK' }));
    expect(mockSetModel).toHaveBeenCalledWith('haiku');
  });

  it('calls clearHistory with confirm guard', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'CLEAR' }));
    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('does not call clearHistory when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'CLEAR' }));
    expect(mockClearHistory).not.toHaveBeenCalled();
  });

  it('renders COACH label before assistant messages', () => {
    resetCoachState({
      messages: [{ role: 'assistant', content: 'Your TSB is on track.' }],
    });
    render(<CoachView />);
    // "COACH" appears in both the tab header and the message label
    expect(screen.getAllByText('COACH').length).toBeGreaterThanOrEqual(2);
  });

  it('renders session banner when todayPlanned is set and no messages', () => {
    resetCoachState({
      todayPlanned: {
        type: 'Z2 Aerobic',
        label: '60min UT1',
        status: 'planned',
      },
    });
    render(<CoachView />);
    expect(screen.getByText('TODAY')).toBeTruthy();
    expect(screen.getByText('Z2 Aerobic — 60min UT1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'DISCUSS →' })).toBeTruthy();
  });

  it('hides session banner when messages exist', () => {
    resetCoachState({
      todayPlanned: {
        type: 'Z2 Aerobic',
        label: '60min UT1',
        status: 'planned',
      },
      messages: [{ role: 'user', content: 'Hello' }],
    });
    render(<CoachView />);
    expect(screen.queryByText('TODAY')).toBeNull();
  });

  it('DISCUSS button sends session discuss message', () => {
    resetCoachState({
      todayPlanned: {
        type: 'Z2 Aerobic',
        label: '60min UT1',
        status: 'planned',
      },
    });
    render(<CoachView />);
    fireEvent.click(screen.getByRole('button', { name: 'DISCUSS →' }));
    expect(mockSendMessage).toHaveBeenCalledWith(
      "Talk me through today's session"
    );
  });

  it('auto-brief fires on first open of day when messages are empty', () => {
    resetCoachState({ messagesReady: true, messages: [] });
    render(<CoachView />);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage.mock.calls[0][0]).toMatch(/morning training brief/);
  });

  it('auto-brief does not fire twice on same day', () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('coach_brief_date', today);
    resetCoachState({ messagesReady: true, messages: [] });
    render(<CoachView />);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('auto-brief does not fire when messages already exist', () => {
    resetCoachState({
      messagesReady: true,
      messages: [{ role: 'assistant', content: 'Ready to train.' }],
    });
    render(<CoachView />);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
