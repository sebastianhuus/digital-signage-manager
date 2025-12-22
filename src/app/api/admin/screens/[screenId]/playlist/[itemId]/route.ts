import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string, itemId: string }> }
) {
  const { screenId, itemId } = await params
  const body = await request.json()
  
  try {
    const result = await pool.query(`
      UPDATE playlists 
      SET duration = $1 
      WHERE id = $2 AND screen_id = $3
      RETURNING *
    `, [body.duration, itemId, screenId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Playlist item not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
