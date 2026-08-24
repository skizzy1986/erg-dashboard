import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureError } from '../sentry.js';
import {
  handleQueryError,
  handleMutationError,
} from '../queryErrorHandlers.js';

vi.mock('../sentry.js', () => ({ captureError: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('handleQueryError', () => {
  it('reports the error tagged with the query key', () => {
    const error = new Error('select failed');
    handleQueryError(error, { queryKey: ['sessions', 2026] });

    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'query',
      queryKey: ['sessions', 2026],
    });
  });

  it('still reports when the query is missing', () => {
    const error = new Error('boom');
    handleQueryError(error, undefined);

    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'query',
      queryKey: undefined,
    });
  });
});

describe('handleMutationError', () => {
  it('reports the error tagged with the mutation key', () => {
    const error = new Error('insert failed');
    handleMutationError(error, { id: 1 }, undefined, {
      options: { mutationKey: ['logSession'] },
    });

    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'mutation',
      mutationKey: ['logSession'],
    });
  });

  it('still reports when the mutation carries no key', () => {
    const error = new Error('boom');
    handleMutationError(error, undefined, undefined, undefined);

    expect(captureError).toHaveBeenCalledWith(error, {
      source: 'react-query',
      kind: 'mutation',
      mutationKey: undefined,
    });
  });
});
