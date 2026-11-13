import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HealthRecordCard from '../HealthRecordCard.jsx';

const q = (over = {}) => ({
  isPending: false,
  isError: false,
  isPaused: false,
  data: [],
  ...over,
});

const renderCard = (query, { isEmpty = false, footer } = {}) =>
  render(
    <HealthRecordCard
      title="BLOOD PRESSURE"
      accent="var(--color-critical)"
      query={query}
      isEmpty={isEmpty}
      emptyText="No blood pressure readings yet."
      footer={footer}
    >
      <div>118/76 mmHg</div>
    </HealthRecordCard>
  );

describe('HealthRecordCard', () => {
  it('labels the card region with its title', () => {
    renderCard(q());
    expect(
      screen.getByRole('region', { name: 'BLOOD PRESSURE' })
    ).toBeInTheDocument();
  });

  it('says offline, not loading, when the first fetch is paused', () => {
    renderCard(q({ isPending: true, isPaused: true, data: undefined }));
    expect(screen.getByText(/Offline: no saved data yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
  });

  it('says loading while the first fetch is in flight', () => {
    renderCard(q({ isPending: true, data: undefined }));
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('118/76 mmHg')).not.toBeInTheDocument();
  });

  it('raises an alert when the read failed with nothing to show', () => {
    renderCard(q({ isError: true, data: undefined }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load blood pressure."
    );
  });

  it('shows the empty text when the read returned nothing', () => {
    renderCard(q(), { isEmpty: true });
    expect(
      screen.getByText('No blood pressure readings yet.')
    ).toBeInTheDocument();
    expect(screen.queryByText('118/76 mmHg')).not.toBeInTheDocument();
  });

  it('renders the rows when there is data', () => {
    renderCard(q({ data: [{}] }));
    expect(screen.getByText('118/76 mmHg')).toBeInTheDocument();
    expect(screen.queryByText(/showing earlier data/)).not.toBeInTheDocument();
  });

  it('keeps earlier rows on a failed refetch and says so', () => {
    renderCard(q({ isError: true, data: [{}] }));
    expect(screen.getByText('118/76 mmHg')).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't refresh, showing earlier data.")
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the footer in every state', () => {
    renderCard(q({ isPending: true, data: undefined }), {
      footer: <p>limits</p>,
    });
    expect(screen.getByText('limits')).toBeInTheDocument();
  });
});
