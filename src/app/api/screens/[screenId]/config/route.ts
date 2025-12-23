import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const validatedScreenId = await validateApiKey(request)
  if (!validatedScreenId) {
    return unauthorizedResponse()
  }

  const { screenId } = await params
  
  // Ensure the API key belongs to this screen
  if (validatedScreenId !== screenId) {
    return unauthorizedResponse()
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM screens WHERE screen_id = $1',
      [screenId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }
    
    const screen = result.rows[0]
    return NextResponse.json({
      screenId: screen.screen_id,
      name: screen.name,
      resolution: screen.resolution,
      refreshInterval: screen.refresh_interval,
      location: screen.location
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
