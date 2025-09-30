import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent } from '../Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card with children', () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('should apply elevated variant styles', () => {
      const { container } = render(<Card elevated>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('shadow-card')
    })

    it('should apply default styles when no props provided', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstChild
      expect(card).toHaveClass('bg-surface')
      expect(card).toHaveClass('rounded-lg')
    })
  })

  describe('CardHeader', () => {
    it('should render card header with children', () => {
      render(<CardHeader>Header Content</CardHeader>)
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('should have correct margin', () => {
      const { container } = render(<CardHeader>Header</CardHeader>)
      const header = container.firstChild
      expect(header).toHaveClass('mb-4')
    })
  })

  describe('CardTitle', () => {
    it('should render card title with children', () => {
      render(<CardTitle>Title Content</CardTitle>)
      expect(screen.getByText('Title Content')).toBeInTheDocument()
    })

    it('should have correct typography styles', () => {
      const { container } = render(<CardTitle>Title</CardTitle>)
      const title = container.firstChild
      expect(title).toHaveClass('text-lg')
      expect(title).toHaveClass('font-semibold')
    })
  })

  describe('CardContent', () => {
    it('should render card content with children', () => {
      render(<CardContent>Content Text</CardContent>)
      expect(screen.getByText('Content Text')).toBeInTheDocument()
    })

    it('should have correct typography styles', () => {
      const { container } = render(<CardContent>Content</CardContent>)
      const content = container.firstChild
      expect(content).toHaveClass('text-sm')
      expect(content).toHaveClass('text-ink-mid')
    })
  })

  describe('Card Composition', () => {
    it('should render a complete card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>Test Content</CardContent>
        </Card>
      )

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })
  })
})
