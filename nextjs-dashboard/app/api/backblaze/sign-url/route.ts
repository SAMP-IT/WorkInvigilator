import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Backblaze B2 configuration (same as desktop app)
const BACKBLAZE_CONFIG = {
  endpoint: 's3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  keyId: '0057242535e05d00000000001',
  applicationKey: 'K005EdyoXAOL3IEstJchDkKzzM5eE+Y',
  buckets: {
    screenshots: 'workinvigilator-screenshots',
    audioRecordings: 'workinvigilator-audio-recordings'
  }
}

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: `https://${BACKBLAZE_CONFIG.endpoint}`,
  region: BACKBLAZE_CONFIG.region,
  credentials: {
    accessKeyId: BACKBLAZE_CONFIG.keyId,
    secretAccessKey: BACKBLAZE_CONFIG.applicationKey
  }
})

export async function POST(request: NextRequest) {
  try {
    const { filePath, bucketType } = await request.json()

    if (!filePath || !bucketType) {
      return NextResponse.json(
        { error: 'filePath and bucketType are required' },
        { status: 400 }
      )
    }

    // Determine bucket name
    const bucketName = bucketType === 'screenshots'
      ? BACKBLAZE_CONFIG.buckets.screenshots
      : BACKBLAZE_CONFIG.buckets.audioRecordings

    // Generate signed URL (valid for 7 days)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filePath
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 })

    return NextResponse.json({
      signedUrl,
      expiresIn: 604800,
      expiresAt: new Date(Date.now() + 604800 * 1000).toISOString()
    })

  } catch (error: any) {
    console.error('Failed to generate signed URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URL', details: error.message },
      { status: 500 }
    )
  }
}
