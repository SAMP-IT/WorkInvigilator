/**
 * Utility functions for Backblaze B2 signed URL management
 */

/**
 * Check if a Backblaze signed URL has expired or will expire soon
 */
export function isUrlExpired(url: string, bufferHours: number = 24): boolean {
  if (!url || !url.includes('X-Amz-Expires')) return false

  try {
    const urlObj = new URL(url)
    const dateParam = urlObj.searchParams.get('X-Amz-Date')
    const expiresParam = urlObj.searchParams.get('X-Amz-Expires')

    if (!dateParam || !expiresParam) return false

    // Parse X-Amz-Date (format: 20250105T123000Z)
    const year = parseInt(dateParam.substring(0, 4))
    const month = parseInt(dateParam.substring(4, 6)) - 1
    const day = parseInt(dateParam.substring(6, 8))
    const hour = parseInt(dateParam.substring(9, 11))
    const minute = parseInt(dateParam.substring(11, 13))
    const second = parseInt(dateParam.substring(13, 15))

    const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second))
    const expiresInSeconds = parseInt(expiresParam)
    const expirationDate = new Date(signedDate.getTime() + expiresInSeconds * 1000)

    // Check if expired or will expire within buffer hours
    const bufferMs = bufferHours * 60 * 60 * 1000
    return Date.now() + bufferMs > expirationDate.getTime()
  } catch (error) {
    console.error('Error parsing signed URL:', error)
    return true // Assume expired if we can't parse
  }
}

/**
 * Regenerate a Backblaze signed URL
 */
export async function regenerateSignedUrl(
  filePath: string,
  bucketType: 'screenshots' | 'audio-recordings'
): Promise<string> {
  const response = await fetch('/api/backblaze/sign-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filePath,
      bucketType
    })
  })

  if (!response.ok) {
    throw new Error('Failed to regenerate signed URL')
  }

  const data = await response.json()
  return data.signedUrl
}

/**
 * Get a valid URL, regenerating if necessary
 */
export async function getValidUrl(
  currentUrl: string,
  backupUrl: string | null,
  filePath: string,
  bucketType: 'screenshots' | 'audio-recordings',
  storageProvider: string
): Promise<string> {
  // If using Supabase as primary, return as-is
  if (storageProvider !== 'backblaze') {
    return currentUrl
  }

  // Check if Backblaze URL is expired or about to expire (within 24 hours)
  if (isUrlExpired(currentUrl, 24)) {
    console.log('Signed URL expired or expiring soon, regenerating...')

    try {
      // Try to regenerate Backblaze signed URL
      const newUrl = await regenerateSignedUrl(filePath, bucketType)
      return newUrl
    } catch (error) {
      console.error('Failed to regenerate signed URL:', error)

      // Fallback to Supabase backup if available
      if (backupUrl) {
        console.log('Using Supabase backup URL')
        return backupUrl
      }

      // Last resort: return current URL (may be expired)
      return currentUrl
    }
  }

  return currentUrl
}

/**
 * Extract file path from Backblaze URL
 */
export function extractFilePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    // Remove bucket name and get the file path
    return pathParts.slice(2).join('/')
  } catch (error) {
    return null
  }
}
