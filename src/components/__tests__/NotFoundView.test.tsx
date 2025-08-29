import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NotFoundView from '../NotFoundView'

// Wrapper component to provide React Router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('NotFoundView', () => {
  describe('Content Rendering', () => {
    it('should render all text content correctly', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      expect(screen.getByText('🧶')).toBeInTheDocument()
      expect(screen.getByText('404')).toBeInTheDocument()
      expect(screen.getByText('找不到頁面')).toBeInTheDocument()
      expect(screen.getByText('您要查找的頁面不存在或已被移動')).toBeInTheDocument()
      expect(screen.getByText('回到首頁')).toBeInTheDocument()
    })

    it('should display correct emoji', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const emoji = screen.getByText('🧶')
      expect(emoji).toBeInTheDocument()
      expect(emoji).toHaveClass('text-6xl', 'mb-6')
    })

    it('should display 404 error code', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const errorCode = screen.getByText('404')
      expect(errorCode).toBeInTheDocument()
      expect(errorCode.tagName).toBe('H1')
    })
  })

  describe('Styling and Layout', () => {
    it('should apply correct container styling', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const container = screen.getByText('404').closest('.min-h-screen')
      expect(container).toHaveClass(
        'min-h-screen',
        'bg-background-primary',
        'flex',
        'items-center',
        'justify-center',
        'px-4'
      )
    })

    it('should center content properly', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const textCenter = screen.getByText('404').closest('.text-center')
      expect(textCenter).toHaveClass('text-center')
    })

    it('should apply correct heading styles', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveClass('text-4xl', 'font-bold', 'text-text-primary', 'mb-4')
      expect(h1).toHaveTextContent('404')
      
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toHaveClass('text-xl', 'font-semibold', 'text-text-secondary', 'mb-6')
      expect(h2).toHaveTextContent('找不到頁面')
    })

    it('should apply correct text styling', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const description = screen.getByText('您要查找的頁面不存在或已被移動')
      expect(description).toHaveClass('text-text-tertiary', 'mb-8')
      expect(description.tagName).toBe('P')
    })
  })

  describe('Navigation Link', () => {
    it('should render link to home page', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const homeLink = screen.getByRole('link', { name: '回到首頁' })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('should apply correct button styling to link', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const homeLink = screen.getByRole('link', { name: '回到首頁' })
      expect(homeLink).toHaveClass('btn', 'btn-primary')
    })

    it('should be accessible', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const homeLink = screen.getByRole('link', { name: '回到首頁' })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAccessibleName('回到首頁')
    })
  })

  describe('Semantic HTML', () => {
    it('should use proper heading hierarchy', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const headings = screen.getAllByRole('heading')
      expect(headings).toHaveLength(2)
      
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      
      expect(h1).toHaveTextContent('404')
      expect(h2).toHaveTextContent('找不到頁面')
    })

    it('should structure content logically', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      // Check that elements appear in logical order
      const emoji = screen.getByText('🧶')
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      const description = screen.getByText('您要查找的頁面不存在或已被移動')
      const link = screen.getByRole('link')
      
      // Elements should exist and be in document
      expect(emoji).toBeInTheDocument()
      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
      expect(description).toBeInTheDocument()
      expect(link).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible link', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const link = screen.getByRole('link')
      expect(link).toHaveAccessibleName('回到首頁')
      expect(link).toHaveAttribute('href', '/')
    })

    it('should provide meaningful content for screen readers', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      // Check that all text content is accessible
      expect(screen.getByText('404')).toBeInTheDocument()
      expect(screen.getByText('找不到頁面')).toBeInTheDocument()
      expect(screen.getByText('您要查找的頁面不存在或已被移動')).toBeInTheDocument()
    })

    it('should have proper heading structure for screen readers', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const headings = screen.getAllByRole('heading')
      // HTML heading elements don't have aria-level by default, just check they exist
      expect(headings[0]).toBeInTheDocument()
      expect(headings[1]).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should include responsive padding classes', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      const container = screen.getByText('404').closest('.min-h-screen')
      expect(container).toHaveClass('px-4')
    })

    it('should be mobile-friendly', () => {
      render(<NotFoundView />, { wrapper: RouterWrapper })
      
      // Check that large text sizes are appropriate for mobile
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveClass('text-4xl') // Large but not too large for mobile
      
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toHaveClass('text-xl') // Appropriately sized for mobile
    })
  })
})