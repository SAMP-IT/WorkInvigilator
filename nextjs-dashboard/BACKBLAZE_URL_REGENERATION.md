# Backblaze Signed URL Auto-Regeneration

## Problem

Backblaze B2 private bucket signed URLs expire after **7 days** (AWS S3 signature v4 maximum). Old URLs become invalid and files can't be accessed.

## Solution

Automatic signed URL regeneration system that:
1. Checks if URLs are expired or expiring soon (within 24 hours)
2. Regenerates fresh signed URLs on-demand
3. Falls back to Supabase backup if regeneration fails

## How It Works

### 1. API Endpoint: `/api/backblaze/sign-url`

Generates fresh signed URLs for Backblaze files.

**Request:**
```json
POST /api/backblaze/sign-url
{
  "filePath": "user-id/screenshot_timestamp.png",
  "bucketType": "screenshots" // or "audio-recordings"
}
```

**Response:**
```json
{
  "signedUrl": "https://s3.us-east-005.backblazeb2.com/...",
  "expiresIn": 604800,
  "expiresAt": "2025-10-12T12:00:00.000Z"
}
```

### 2. Utility Functions: `lib/backblaze-utils.ts`

#### `isUrlExpired(url, bufferHours)`
Checks if a signed URL is expired or will expire soon.

```typescript
const expired = isUrlExpired(url, 24) // Check if expires within 24 hours
```

#### `regenerateSignedUrl(filePath, bucketType)`
Generates a new signed URL via API.

```typescript
const newUrl = await regenerateSignedUrl(
  'user-id/screenshot.png',
  'screenshots'
)
```

#### `getValidUrl(currentUrl, backupUrl, filePath, bucketType, storageProvider)`
Main function that:
- Returns current URL if still valid
- Regenerates if expired/expiring
- Falls back to Supabase backup if regeneration fails

```typescript
const validUrl = await getValidUrl(
  currentUrl,
  backupUrl,
  filePath,
  'screenshots',
  'backblaze'
)
```

### 3. Automatic Usage in API Routes

The screenshots API automatically checks and regenerates URLs:

```typescript
// In api/screenshots/route.ts
const validUrl = await getValidUrl(
  screenshot.file_url,
  screenshot.backup_file_url,
  filePath,
  'screenshots',
  screenshot.storage_provider
)
```

## Usage Examples

### For Screenshots
```typescript
import { getValidUrl, extractFilePathFromUrl } from '@/lib/backblaze-utils'

const screenshot = await getScreenshot(id)

if (screenshot.storage_provider === 'backblaze') {
  const filePath = extractFilePathFromUrl(screenshot.file_url)
  const validUrl = await getValidUrl(
    screenshot.file_url,
    screenshot.backup_file_url,
    filePath,
    'screenshots',
    'backblaze'
  )

  // Use validUrl (either regenerated or original)
  return validUrl
}
```

### For Audio Recordings
```typescript
const validUrl = await getValidUrl(
  chunk.file_url,
  chunk.backup_file_url,
  chunk.filename, // Already in correct format
  'audio-recordings',
  chunk.storage_provider
)
```

## URL Expiration Timeline

```
Day 0: URL generated (valid for 7 days)
Day 6: URL detected as "expiring soon" (within 24h buffer)
       → Automatically regenerated
Day 7: Old URL expires
       → New URL already in use
```

## Fallback Strategy

```
1. Try to regenerate Backblaze signed URL
   ├─ Success → Use new Backblaze URL ✅
   └─ Failure ↓

2. Try Supabase backup URL
   ├─ Available → Use Supabase URL ✅
   └─ Not available ↓

3. Return original URL (may be expired) ⚠️
```

## Security Notes

- Backblaze credentials are hardcoded in API route (server-side only)
- Signed URLs are temporary (7 days max)
- Private buckets ensure files aren't publicly accessible
- Each URL request generates a fresh signature

## Performance Considerations

- URL check is very fast (regex parsing)
- Regeneration only happens when needed (24h before expiry)
- API endpoint is lightweight (just signature generation)
- No database updates needed

## Future Enhancements

### Option 1: Background Job (Recommended)
Run a daily cron job to regenerate all expiring URLs in bulk:

```typescript
// api/cron/regenerate-urls/route.ts
export async function GET() {
  // Find all URLs expiring in next 24 hours
  // Regenerate them
  // Update database
}
```

### Option 2: Database Storage
Store `url_expires_at` and regenerate proactively:

```sql
ALTER TABLE screenshots
ADD COLUMN url_expires_at TIMESTAMPTZ;

-- Cron query
SELECT * FROM screenshots
WHERE storage_provider = 'backblaze'
AND url_expires_at < NOW() + INTERVAL '24 hours';
```

### Option 3: Edge Function
Use Vercel Edge Function for instant regeneration at CDN edge.

## Monitoring

Check logs for:
- `Signed URL expired or expiring soon, regenerating...`
- `Using Supabase backup URL`
- `Failed to regenerate signed URL`

## Testing

Test expired URL handling:
1. Set `expiresIn: 60` (1 minute) in sign-url route
2. Wait 1 minute
3. Request screenshot
4. Should auto-regenerate

## Summary

✅ **Automatic URL regeneration** - No manual intervention needed
✅ **24-hour buffer** - URLs regenerated before expiry
✅ **Fallback system** - Supabase backup if regeneration fails
✅ **No schema changes** - Works with existing database
✅ **Server-side only** - Credentials never exposed to client

The system ensures Backblaze files are always accessible, even with 7-day URL expiration!
