import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data generators for testing
import { Project, Chart, Yarn, StitchType, StitchInfo, Round } from '../types'

export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'test-project-1',
  name: 'Test Knitting Project',
  source: 'Test source',
  notes: 'Test notes',
  yarns: [],
  sessions: [],
  charts: [],
  createdDate: new Date('2023-01-01'),
  lastModified: new Date('2023-01-01'),
  isCompleted: false,
  ...overrides
})

export const createMockYarn = (overrides: Partial<Yarn> = {}): Yarn => ({
  id: 'test-yarn-1',
  name: 'Test Yarn',
  brand: 'Test Brand',
  color: {
    name: 'Red',
    hex: '#FF0000'
  },
  ...overrides
})

export const createMockChart = (overrides: Partial<Chart> = {}): Chart => ({
  id: 'test-chart-1',
  name: 'Test Chart',
  description: 'Test description',
  rounds: [],
  currentRound: 1,
  currentStitch: 0,
  createdDate: new Date('2023-01-01'),
  lastModified: new Date('2023-01-01'),
  isCompleted: false,
  notes: 'Test notes',
  ...overrides
})

export const createMockStitchInfo = (overrides: Partial<StitchInfo> = {}): StitchInfo => ({
  id: 'test-stitch-1',
  type: StitchType.SINGLE,
  yarnId: 'test-yarn-1',
  count: 1,
  ...overrides
})

export const createMockRound = (overrides: Partial<Round> = {}): Round => ({
  id: 'test-round-1',
  roundNumber: 1,
  stitches: [],
  stitchGroups: [],
  notes: 'Test round',
  ...overrides
})

// Legacy aliases for backward compatibility
export const generateMockProject = createMockProject
export const generateMockChart = createMockChart
export const generateMockYarn = createMockYarn

export const createMockStitch = (overrides = {}) => ({
  id: 'test-stitch-1',
  type: 'k',
  count: 1,
  isCompleted: false,
  completedAt: null,
  ...overrides
})

// Zustand store testing utilities
export const createMockStoreState = (initialState = {}) => ({
  // Default state structure
  projects: [],
  currentProject: null,
  charts: [],
  currentChart: null,
  patterns: [],
  progress: {
    currentRound: 0,
    currentStitch: 0,
    completedRounds: 0,
    completedStitches: 0
  },
  sync: {
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    error: null
  },
  ...initialState
})

// Firebase mock utilities
export const createMockFirebaseUser = (overrides = {}) => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  ...overrides
})

// Date testing utilities
export const mockDate = (dateString: string) => {
  const mockedDate = new Date(dateString)
  vi.setSystemTime(mockedDate)
  return mockedDate
}

export const restoreDate = () => {
  vi.useRealTimers()
}