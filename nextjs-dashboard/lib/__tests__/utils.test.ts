import { cn } from '../utils'

describe('Utils', () => {
  describe('cn (classname utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('px-2', 'py-1')
      expect(result).toContain('px-2')
      expect(result).toContain('py-1')
    })

    it('should handle conditional class names', () => {
      const result = cn('base-class', true && 'conditional-true', false && 'conditional-false')
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-true')
      expect(result).not.toContain('conditional-false')
    })

    it('should handle Tailwind merge conflicts', () => {
      const result = cn('px-2', 'px-4')
      // Should only contain px-4 due to Tailwind merge
      expect(result).toBe('px-4')
    })

    it('should handle undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })
  })
})
