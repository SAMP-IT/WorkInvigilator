import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply primary variant styles', () => {
    const { container } = render(<Button variant="primary">Primary</Button>)
    const button = container.firstChild
    expect(button).toHaveClass('bg-primary')
  })

  it('should apply outline variant styles', () => {
    const { container } = render(<Button variant="outline">Outline</Button>)
    const button = container.firstChild
    expect(button).toHaveClass('border')
  })

  it('should apply danger variant styles', () => {
    const { container } = render(<Button variant="danger">Danger</Button>)
    const button = container.firstChild
    expect(button).toHaveClass('bg-danger')
  })

  it('should apply small size styles', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    const button = container.firstChild
    expect(button).toHaveClass('px-3')
    expect(button).toHaveClass('py-1.5')
  })

  it('should apply large size styles', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    const button = container.firstChild
    expect(button).toHaveClass('px-6')
    expect(button).toHaveClass('py-3')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
  })

  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)

    fireEvent.click(screen.getByText('Disabled'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should render as a child element when children is provided', () => {
    render(
      <Button>
        <span>Child Content</span>
      </Button>
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})
