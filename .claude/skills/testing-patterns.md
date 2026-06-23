---
name: testing-patterns
description: >
  Vitest and React Testing Library patterns for this project. Read when writing
  tests for utils, hooks, or components. Covers mock patterns for Supabase,
  test file structure, and common assertions.
---

## Test Stack

- **Vitest** — test runner (configured in vite.config.js)
- **React Testing Library** — component rendering and interaction
- **@testing-library/jest-dom** — DOM matchers (`toBeInTheDocument`, etc.)
- **@testing-library/user-event** — realistic user interaction simulation

## File Structure

```
src/
  utils/
    __tests__/
      formatting.test.js
      analysis.test.js
      schedule.test.js
  hooks/
    __tests__/
      useSessions.test.js
  components/
    __tests__/
      LogEntry.test.jsx
      LogSessionForm.test.jsx
```

## Mocking Supabase

```js
// At the top of any test that touches Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))
  }
}))
```

## Util Function Tests (pure functions — simplest)

```js
import { describe, it, expect } from 'vitest'
import { fmtPace } from '../formatting'

describe('fmtPace', () => {
  it('formats seconds to m:ss.s', () => {
    expect(fmtPace(118)).toBe('1:58.0')
  })
  it('handles zero', () => {
    expect(fmtPace(0)).toBe('0:00.0')
  })
})
```

## Hook Tests

```js
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessions } from '../useSessions'

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: '1', date: '2025-06-01', type: 'erg' }],
        error: null
      })
    }))
  }
}))

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('useSessions', () => {
  it('returns sessions from Supabase', async () => {
    const { result } = renderHook(() => useSessions(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})
```

## Component Tests

```js
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogEntry from '../LogEntry'

const mockSession = {
  date: '2025-06-01',
  type: 'erg',
  label: 'Z2 Aerobic',
  duration: 60,
  srpe: 4,
}

describe('LogEntry', () => {
  it('renders the session label', () => {
    render(<LogEntry entry={mockSession} done={true} />)
    expect(screen.getByText('Z2 Aerobic')).toBeInTheDocument()
  })

  it('expands on click', async () => {
    const user = userEvent.setup()
    render(<LogEntry entry={mockSession} done={true} />)
    await user.click(screen.getByText('Z2 Aerobic'))
    expect(screen.getByText('60 min')).toBeInTheDocument()
  })
})
```

## Vitest Config (add to vite.config.js)

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
  }
})
```

```js
// src/test-setup.js
import '@testing-library/jest-dom'
```
