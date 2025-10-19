import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { bucketType } = await request.json()

    if (!bucketType || !['audio-chunks', 'screenshots', 'audio-recordings'].includes(bucketType)) {
      return NextResponse.json(
        { error: 'Invalid bucket type. Must be "audio-chunks", "screenshots", or "audio-recordings"' },
        { status: 400 }
      )
    }

    let totalDeleted = 0
    let hasMore = true
    const batchSize = 1000 // Delete in batches of 1000

    console.log(`Starting deletion for ${bucketType} bucket...`)

    while (hasMore) {
      // List files in batches
      const { data: files, error: listError } = await supabaseAdmin
        .storage
        .from(bucketType)
        .list('', {
          limit: batchSize,
          offset: 0,
        })

      if (listError) {
        console.error('Error listing files:', listError)
        return NextResponse.json(
          { error: `Failed to list files: ${listError.message}` },
          { status: 500 }
        )
      }

      if (!files || files.length === 0) {
        hasMore = false
        break
      }

      // Get all file paths
      const filePaths = files.map(file => file.name)

      console.log(`Deleting batch of ${filePaths.length} files from ${bucketType} bucket...`)

      // Delete batch of files
      const { data: deleteData, error: deleteError } = await supabaseAdmin
        .storage
        .from(bucketType)
        .remove(filePaths)

      if (deleteError) {
        console.error('Error deleting files:', deleteError)
        return NextResponse.json(
          { error: `Failed to delete files: ${deleteError.message}`, deletedSoFar: totalDeleted },
          { status: 500 }
        )
      }

      totalDeleted += filePaths.length

      // If we got less than batchSize, we're done
      if (files.length < batchSize) {
        hasMore = false
      }

      console.log(`Deleted ${totalDeleted} files so far...`)
    }

    console.log(`Completed deletion for ${bucketType} bucket. Total deleted: ${totalDeleted}`)

    return NextResponse.json({
      message: `Successfully deleted all files from ${bucketType} bucket`,
      deletedCount: totalDeleted,
      bucketType: bucketType
    })

  } catch (error) {
    console.error('Error in delete-all:', error)
    return NextResponse.json(
      { error: 'Failed to delete files from storage' },
      { status: 500 }
    )
  }
}
