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
    const result = await pool.query(`
      SELECT p.asset_id, p.duration, a.type, p.position
      FROM playlists p
      JOIN assets a ON p.asset_id = a.asset_id
      WHERE p.screen_id = $1
      ORDER BY p.position
    `, [screenId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      screenId,
      lastUpdated: new Date().toISOString(),
      items: result.rows.map(row => ({
        assetId: row.asset_id,
        duration: row.duration,
        type: row.type
      }))
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
