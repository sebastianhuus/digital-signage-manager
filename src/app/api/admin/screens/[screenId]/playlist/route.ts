import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params
  
  try {
    const result = await pool.query(`
      SELECT p.*, a.filename, a.type, a.size
      FROM playlists p
      JOIN assets a ON p.asset_id = a.asset_id
      WHERE p.screen_id = $1
      ORDER BY p.position
    `, [screenId])
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params
  const body = await request.json()
  
  try {
    // Get next position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlists WHERE screen_id = $1',
      [screenId]
    )
    const nextPosition = posResult.rows[0].next_pos
    
    const result = await pool.query(`
      INSERT INTO playlists (screen_id, asset_id, duration, position)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      screenId,
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
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params
  const { searchParams } = new URL(request.url)
  const playlistId = searchParams.get('id')
  
  try {
    await pool.query(
      'DELETE FROM playlists WHERE id = $1 AND screen_id = $2',
      [playlistId, screenId]
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
