import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { COMPLETED_STATUSES } from '../../constants/sessionStatus.js';

// Mock the supabase client before importing the component under test.
const insertMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('../../supabaseClient.js', () => ({
  supabase: {
    auth: { getUser: (...args) => getUserMock(...args) },
    from: () => ({ insert: (...args) => insertMock(...args) }),
  },
}));

import LogSessionForm from '../LogSessionForm.jsx';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithClient(ui, client) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

beforeEach(() => {
  insertMock.mockReset();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  insertMock.mockResolvedValue({ error: null });
});

describe('LogSessionForm', () => {
  it('renders the collapsed trigger button initially', () => {
    renderWithClient(<LogSessionForm />, makeClient());
    expect(screen.getByText(/LOG A STRENGTH SESSION/i)).toBeInTheDocument();
  });

  it('expands the form when the trigger is clicked', () => {
    renderWithClient(<LogSessionForm />, makeClient());
    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    expect(screen.getByText('LOG STRENGTH SESSION')).toBeInTheDocument();
    expect(screen.getByText('SUBMIT SESSION')).toBeInTheDocument();
  });

  it('validates that a label is required before saving', () => {
    renderWithClient(<LogSessionForm />, makeClient());
    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    fireEvent.click(screen.getByText('SUBMIT SESSION'));
    expect(screen.getByText(/Add a session label/i)).toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('validates that at least one exercise is required', () => {
    renderWithClient(<LogSessionForm />, makeClient());
    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.click(screen.getByText('SUBMIT SESSION'));
    expect(screen.getByText(/Add at least one exercise/i)).toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts a session and invalidates the sessions query on a successful save', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const onSaved = vi.fn();
    renderWithClient(<LogSessionForm onSaved={onSaved} />, client);

    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), {
      target: { value: 'Squat' },
    });
    fireEvent.click(screen.getByText('SUBMIT SESSION'));

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['erg-sessions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tss-history'] });
    expect(onSaved).toHaveBeenCalledTimes(1);

    const row = insertMock.mock.calls[0][0];
    expect(row.type).toBe('Strength');
    expect(row.label).toBe('Lower 2');
    expect(row.user_id).toBe('user-123');
    expect(row.exercises).toEqual([expect.objectContaining({ name: 'Squat' })]);
  });

  // The column is nullable with no default, so omitting status wrote NULL —
  // which is not in COMPLETED_STATUSES. The row showed up in the log and was
  // invisible to CTL/ATL/TSB and to the benchmark matcher. Assert membership of
  // the list the consumers actually gate on, not just the literal: a future
  // edit to either side has to keep them agreeing.
  it('saves a status the load and benchmark consumers count as completed', async () => {
    const client = makeClient();
    renderWithClient(<LogSessionForm />, client);

    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), {
      target: { value: 'Squat' },
    });
    fireEvent.click(screen.getByText('SUBMIT SESSION'));

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const row = insertMock.mock.calls[0][0];
    expect(row.status).toBe('completed');
    expect(COMPLETED_STATUSES).toContain(row.status);
  });

  it('surfaces an error message and does not invalidate when the insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'db down' } });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(<LogSessionForm />, client);

    fireEvent.click(screen.getByText(/LOG A STRENGTH SESSION/i));
    fireEvent.change(screen.getByPlaceholderText('Lower 2'), {
      target: { value: 'Lower 2' },
    });
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), {
      target: { value: 'Squat' },
    });
    fireEvent.click(screen.getByText('SUBMIT SESSION'));

    await screen.findByText(/Save failed: db down/i);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
