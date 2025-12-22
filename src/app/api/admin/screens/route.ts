import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        (SELECT timestamp FROM heartbeats 
         WHERE screen_id = s.screen_id 
         ORDER BY timestamp DESC LIMIT 1) as last_heartbeat
      FROM screens s
      ORDER BY s.created_at DESC
    `)
    
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const result = await pool.query(`
      INSERT INTO screens (screen_id, name, location, resolution, refresh_interval)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      body.screenId,
      body.name,
      body.location || null,
      body.resolution || '1920x1080',
      body.refreshInterval || 30
    ])
    
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Database error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Screen ID already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get('screenId')
    
    if (!screenId) {
      return NextResponse.json({ error: 'Screen ID required' }, { status: 400 })
    }
    
    await pool.query('DELETE FROM playlists WHERE screen_id = $1', [screenId])
    await pool.query('DELETE FROM heartbeats WHERE screen_id = $1', [screenId])
    await pool.query('DELETE FROM screens WHERE screen_id = $1', [screenId])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
