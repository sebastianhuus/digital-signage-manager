import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { put } from '@vercel/blob'

export async function GET() {
  try {
    const result = await pool.query('SELECT *, COALESCE(display_name, filename) as name FROM assets ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('No file in request')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`File details: name=${file.name}, type=${file.type}, size=${file.size}`)

    // Upload to Vercel Blob
    console.log('Uploading to Vercel Blob...')
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    })
    console.log(`Blob uploaded: ${blob.url}`)

    // Generate short unique asset ID
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    console.log(`Generated asset ID: ${assetId}`)

    // Save to database
    console.log('Saving to database...')
    const result = await pool.query(`
      INSERT INTO assets (asset_id, filename, display_name, type, size, url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      assetId,
      file.name,
      file.name, // Use filename as display name
      file.type.startsWith('image/') ? 'image' : 'video',
      file.size,
      blob.url
    ])

    console.log('Upload successful')
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
