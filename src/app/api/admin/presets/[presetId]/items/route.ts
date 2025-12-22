import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params
  
  try {
    const result = await pool.query(`
      SELECT ppi.*, a.filename, a.type, a.size, a.url
      FROM preset_playlist_items ppi
      JOIN assets a ON ppi.asset_id = a.asset_id
      WHERE ppi.preset_playlist_id = $1
      ORDER BY ppi.position
    `, [presetId])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params
  const body = await request.json()
  
  try {
    // Get next position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM preset_playlist_items WHERE preset_playlist_id = $1',
      [presetId]
    )
    const nextPosition = posResult.rows[0].next_pos
    
    const result = await pool.query(`
      INSERT INTO preset_playlist_items (preset_playlist_id, asset_id, duration, position)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      presetId,
      body.assetId,
      body.duration || 10,
      nextPosition
    ])
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('id')
  
  try {
    await pool.query(
      'DELETE FROM preset_playlist_items WHERE id = $1 AND preset_playlist_id = $2',
      [itemId, presetId]
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
