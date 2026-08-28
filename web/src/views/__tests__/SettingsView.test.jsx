import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const panelMock = vi.fn();

vi.mock('../../components/StravaConnectPanel.jsx', () => ({
  default: (props) => {
    panelMock(props);
    return <div data-testid="strava-panel" />;
  },
}));

import SettingsView from '../SettingsView.jsx';

beforeEach(() => {
  panelMock.mockReset();
});

describe('SettingsView', () => {
  it('renders the Strava panel under an Integrations heading', () => {
    render(<SettingsView />);
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByTestId('strava-panel')).toBeInTheDocument();
  });

  it('threads onSynced through to the panel', () => {
    const onSynced = vi.fn();
    render(<SettingsView onSynced={onSynced} />);
    expect(panelMock).toHaveBeenCalledWith(
      expect.objectContaining({ onSynced })
    );
  });

  it('surfaces the OAuth callback notice when one is passed', () => {
    render(
      <SettingsView notice={{ tone: 'positive', text: 'Strava connected.' }} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Strava connected.');
  });

  it('falls back to neutral colours for an unrecognised notice tone', () => {
    render(<SettingsView notice={{ tone: 'nonsense', text: 'Hmm.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Hmm.');
  });

  it('renders no notice region when there is nothing to say', () => {
    render(<SettingsView />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
