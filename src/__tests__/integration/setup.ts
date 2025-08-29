import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import React from 'react'

// Mock Firebase Auth and Firestore
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn()
  }))
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  enableNetwork: vi.fn(),
  disableNetwork: vi.fn(),
  connectFirestoreEmulator: vi.fn()
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn()
}))

// Mock Lottie animations
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: vi.fn(({ children }) => children || null)
}))

// Mock React Router
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/', search: '', hash: '', state: null, key: 'default' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({}),
    useRoutes: () => null,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    MemoryRouter: ({ children }: { children: React.ReactNode }) => children,
    Routes: ({ children }: { children: React.ReactNode }) => children,
    Route: ({ children }: { children: React.ReactNode }) => children,
    Navigate: () => null,
    Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
    NavLink: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children)
  }
})

// MSW Server setup for integration tests
export const integrationServer = setupServer(
  // Firebase Auth endpoints
  http.post('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken', () => {
    return HttpResponse.json({
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: '3600',
      localId: 'test-user-123'
    })
  }),

  // Firebase Firestore endpoints
  http.post('https://firestore.googleapis.com/v1/projects/*/databases/(default)/documents:batchGet', () => {
    return HttpResponse.json({
      found: [],
      missing: []
    })
  }),

  // Mock Google APIs
  http.get('https://www.google.com/favicon.ico', () => {
    return new HttpResponse(null, { status: 200 })
  }),

  // Mock network connectivity check
  http.head('https://httpbin.org/status/200', () => {
    return new HttpResponse(null, { status: 200 })
  })
)

// Global test utilities
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString()
  },
  providerData: [],
  providerId: 'firebase',
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve('mock-token')),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn()
}

export const mockProject = {
  id: 'test-project-1',
  name: 'Test Project',
  source: 'Test pattern source',
  notes: 'A test knitting project',
  createdDate: new Date(),
  lastModified: new Date(),
  currentChartId: 'chart-1',
  charts: [{
    id: 'chart-1',
    name: 'Main Chart',
    description: 'Main chart description',
    rounds: [],
    currentRound: 1,
    currentStitch: 1,
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false,
    notes: ''
  }],
  yarns: [],
  sessions: [],
  isCompleted: false
}

// Test environment setup
beforeAll(() => {
  integrationServer.listen({ onUnhandledRequest: 'warn' })
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
})

afterAll(() => {
  integrationServer.close()
})

beforeEach(() => {
  integrationServer.resetHandlers()
  mockNavigate.mockClear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Helper to wait for async operations
export const waitForAsyncUpdates = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to simulate user interactions
export const simulateDelay = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms))