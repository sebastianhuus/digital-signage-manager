import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { screenId } = await params
  
  try {
    const body = await request.json()
    
    await pool.query(`
      INSERT INTO heartbeats (screen_id, status, current_asset, uptime, temperature)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      screenId,
      body.status || 'online',
      body.currentAsset,
      body.uptime,
      body.temperature
    ])
    
    return NextResponse.json({ 
      success: true, 
      message: 'Heartbeat received' 
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { screenId } = await params
  
  try {
    const result = await pool.query(`
      SELECT * FROM heartbeats 
      WHERE screen_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [screenId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No heartbeat data' }, { status: 404 })
    }
    
    const heartbeat = result.rows[0]
    return NextResponse.json({
      screenId: heartbeat.screen_id,
      timestamp: heartbeat.timestamp,
      status: heartbeat.status,
      currentAsset: heartbeat.current_asset,
      uptime: heartbeat.uptime,
      temperature: heartbeat.temperature
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
