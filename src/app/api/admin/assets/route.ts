import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { optimizeImageBuffer } from '@/lib/imageOptimize'

export async function GET() {
  try {
    const result = await pool.query('SELECT *, COALESCE(display_name, filename) as name FROM assets ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// Register an asset after client-side upload to Vercel Blob
// For images: downloads the blob, optimizes to WebP, re-uploads, and deletes the original
export async function POST(request: NextRequest) {
  try {
    const { url, filename, size, contentType } = await request.json()

    if (!url || !filename) {
      return NextResponse.json({ error: 'url and filename are required' }, { status: 400 })
    }

    const isImage = contentType?.startsWith('image/')
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

    let finalUrl = url
    let finalFilename = filename
    let finalSize = size ?? 0

    // Optimize images: download, convert to WebP, re-upload
    if (isImage && !filename.toLowerCase().endsWith('.gif')) {
      try {
        const response = await fetch(url)
        const buffer = Buffer.from(await response.arrayBuffer())
        const optimized = await optimizeImageBuffer(buffer, filename)

        const blob = await put(optimized.filename, optimized.buffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: optimized.contentType,
        })

        // Delete the original unoptimized blob
        await del(url)

        finalUrl = blob.url
        finalFilename = optimized.filename
        finalSize = optimized.size
        console.log(`Optimized ${filename}: ${size} -> ${finalSize} bytes (${Math.round((1 - finalSize / size) * 100)}% reduction)`)
      } catch (optimizeError) {
        console.error('Image optimization failed, using original:', optimizeError)
        // Fall through and use the original upload
      }
    }

    const result = await pool.query(`
      INSERT INTO assets (asset_id, filename, display_name, type, size, url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      assetId,
      finalFilename,
      filename, // Keep original name as display name
      isImage ? 'image' : 'video',
      finalSize,
      finalUrl
    ])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const body = await request.json()
    
    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }
    
    const result = await pool.query(`
      UPDATE assets 
      SET display_name = $1 
      WHERE asset_id = $2 
      RETURNING *
    `, [body.displayName, assetId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    
    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }
    
    // Remove from all referencing tables first
    await pool.query('DELETE FROM preset_playlist_items WHERE asset_id = $1', [assetId])
    await pool.query('DELETE FROM playlists WHERE asset_id = $1', [assetId])
    
    // Remove from assets
    await pool.query('DELETE FROM assets WHERE asset_id = $1', [assetId])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
