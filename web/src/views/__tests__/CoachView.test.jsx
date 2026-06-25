import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// jsdom doesn't implement scrollIntoView — mock it globally
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// Mock the useCoach hook so CoachView is testable in isolation
const mockSendMessage = vi.fn();
const mockSetModel = vi.fn();
const mockClearHistory = vi.fn();

const mockCoachState = {
  messages: [],
  streamingContent: '',
  isStreaming: false,
  error: null,
  model: 'sonnet',
  setModel: mockSetModel,
  sendMessage: mockSendMessage,
  clearHistory: mockClearHistory,
  vitals: { latest: null, readinessScore: 0, readinessLabel: 'FATIGUED' },
  tssQuery: { data: [] },
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
      streamingContent: '',
      isStreaming: false,
      error: null,
      model: 'sonnet',
    },
    overrides
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetCoachState();
});

describe('CoachView', () => {
  it('renders starter prompt chips when messages is empty', () => {
    render(<CoachView />);
    expect(screen.getByText("How's my training load looking?")).toBeTruthy();
    expect(screen.getByText('What should I focus on this week?')).toBeTruthy();
    expect(screen.getByText('Is it safe to add intensity today?')).toBeTruthy();
  });

  it('calls sendMessage when a starter chip is clicked', () => {
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
});
