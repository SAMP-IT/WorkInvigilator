import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('Badge Component', () => {
  it('should render badge with text', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('should apply success variant styles', () => {
    const { container } = render(<Badge variant="success">Success</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('bg-success/10')
  })

  it('should apply warning variant styles', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('bg-warn/10')
  })

  it('should apply danger variant styles', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('bg-danger/10')
  })

  it('should apply info variant styles', () => {
    const { container } = render(<Badge variant="info">Info</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('bg-info/10')
  })

  it('should apply outline variant styles', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('border')
  })

  it('should apply small size styles', () => {
    const { container } = render(<Badge size="sm">Small</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('text-xs')
  })

  it('should apply default variant when no variant specified', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.firstChild
    expect(badge).toHaveClass('bg-surface')
  })
})
