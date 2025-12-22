import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { put } from '@vercel/blob'

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM assets ORDER BY created_at DESC')
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    })

    // Generate asset ID
    const assetId = file.name.split('.')[0] + '-' + Date.now()

    // Save to database
    const result = await pool.query(`
      INSERT INTO assets (asset_id, filename, type, size, url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      assetId,
      file.name,
      file.type.startsWith('image/') ? 'image' : 'video',
      file.size,
      blob.url
    ])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    
    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }
    
    // Remove from playlists first
    await pool.query('DELETE FROM playlists WHERE asset_id = $1', [assetId])
    
    // Remove from assets
    await pool.query('DELETE FROM assets WHERE asset_id = $1', [assetId])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
