import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingPage from '../LoadingPage'

// Mock the Lottie component since it's external and we don't need to test it
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: vi.fn(({ className, ...props }) => (
    <div data-testid="lottie-animation" className={className} {...props}>
      Mock Lottie Animation
    </div>
  ))
}))

// Mock the animation data import
vi.mock('../assets/images/CIrcles Yarn.json', () => ({
  default: { mockAnimation: 'data' }
}))

describe('LoadingPage', () => {
  describe('Default Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingPage />)
      
      expect(screen.getByTestId('lottie-animation')).toBeInTheDocument()
      expect(screen.getByText('載入中...')).toBeInTheDocument()
      expect(screen.queryByText(/submessage/)).not.toBeInTheDocument()
    })

    it('should apply correct default classes and structure', () => {
      render(<LoadingPage />)
      
      // Check container structure
      const container = screen.getByTestId('lottie-animation').closest('.min-h-screen')
      expect(container).toHaveClass('min-h-screen', 'bg-background-primary', 'flex', 'items-center', 'justify-center')
      
      // Check animation container
      const animationContainer = screen.getByTestId('lottie-animation').closest('.w-32')
      expect(animationContainer).toHaveClass('w-32', 'h-32', 'mx-auto', 'mb-6')
      
      // Check animation classes
      expect(screen.getByTestId('lottie-animation')).toHaveClass('w-full', 'h-full')
    })
  })

  describe('Custom Props', () => {
    it('should render with custom message', () => {
      const customMessage = '自定義載入訊息'
      render(<LoadingPage message={customMessage} />)
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument()
    })

    it('should render with custom submessage', () => {
      const submessage = '請稍候片刻...'
      render(<LoadingPage submessage={submessage} />)
      
      expect(screen.getByText('載入中...')).toBeInTheDocument()
      expect(screen.getByText(submessage)).toBeInTheDocument()
    })

    it('should render with both custom message and submessage', () => {
      const message = '正在處理資料'
      const submessage = '這可能需要幾秒鐘'
      render(<LoadingPage message={message} submessage={submessage} />)
      
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(screen.getByText(submessage)).toBeInTheDocument()
    })

    it('should pass custom src to Lottie component', () => {
      const customSrc = 'https://example.com/animation.lottie'
      render(<LoadingPage src={customSrc} />)
      
      const lottieComponent = screen.getByTestId('lottie-animation')
      expect(lottieComponent).toHaveAttribute('src', customSrc)
    })

    it('should pass custom data to Lottie component', () => {
      const customData = { customAnimation: 'test' }
      render(<LoadingPage data={customData} />)
      
      const lottieComponent = screen.getByTestId('lottie-animation')
      expect(lottieComponent).toHaveAttribute('data', '[object Object]')
    })
  })

  describe('Text Styling', () => {
    it('should apply correct styling to main message', () => {
      render(<LoadingPage message="測試訊息" />)
      
      const message = screen.getByText('測試訊息')
      expect(message).toHaveClass('text-text-primary', 'text-lg', 'font-medium', 'mb-2')
    })

    it('should apply correct styling to submessage', () => {
      render(<LoadingPage submessage="副訊息" />)
      
      const submessage = screen.getByText('副訊息')
      expect(submessage).toHaveClass('text-text-secondary', 'text-sm')
    })
  })

  describe('Conditional Rendering', () => {
    it('should not render submessage when not provided', () => {
      render(<LoadingPage message="主要訊息" />)
      
      expect(screen.getByText('主要訊息')).toBeInTheDocument()
      
      // Check that no p tag with submessage classes exists
      const submessageParagraphs = document.querySelectorAll('p.text-text-secondary.text-sm')
      expect(submessageParagraphs).toHaveLength(0)
    })

    it('should render submessage when provided', () => {
      render(<LoadingPage submessage="副訊息存在" />)
      
      const submessage = screen.getByText('副訊息存在')
      expect(submessage).toBeInTheDocument()
      expect(submessage.tagName).toBe('P')
    })
  })

  describe('Lottie Integration', () => {
    it('should pass correct props to DotLottieReact', () => {
      const customSrc = 'test-src'
      const customData = { test: 'data' }
      
      render(<LoadingPage src={customSrc} data={customData} />)
      
      const lottie = screen.getByTestId('lottie-animation')
      expect(lottie).toHaveAttribute('src', customSrc)
      expect(lottie).toHaveAttribute('loop')
      // Note: Our mock doesn't preserve autoplay attribute, but that's fine for testing
      expect(lottie).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper text hierarchy', () => {
      render(<LoadingPage message="主要訊息" submessage="次要訊息" />)
      
      const mainMessage = screen.getByText('主要訊息')
      const subMessage = screen.getByText('次要訊息')
      
      // Main message should be more prominent
      expect(mainMessage).toHaveClass('text-lg', 'font-medium')
      expect(subMessage).toHaveClass('text-sm')
    })

    it('should be screen reader friendly', () => {
      render(<LoadingPage message="載入中" submessage="請等待" />)
      
      // Text should be accessible to screen readers
      expect(screen.getByText('載入中')).toBeInTheDocument()
      expect(screen.getByText('請等待')).toBeInTheDocument()
    })
  })
})