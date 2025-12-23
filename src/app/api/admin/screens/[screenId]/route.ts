import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { screenId: string } }
) {
  try {
    const body = await request.json()
    const { screenId } = params
    
    const result = await pool.query(`
      UPDATE screens 
      SET name = $1, location = $2, resolution = $3, refresh_interval = $4
      WHERE screen_id = $5
      RETURNING *
    `, [
      body.name,
      body.location || null,
      body.resolution || '1920x1080',
      body.refreshInterval || 30,
      screenId
    ])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
