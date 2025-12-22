import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// Apply preset to selected screens
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string }> }
) {
  const { presetId } = await params
  const body = await request.json()
  
  try {
    // Get preset items
    const presetItems = await pool.query(`
      SELECT ppi.*, a.filename, a.type, a.url
      FROM preset_playlist_items ppi
      JOIN assets a ON ppi.asset_id = a.asset_id
      WHERE ppi.preset_playlist_id = $1
      ORDER BY ppi.position
    `, [presetId])
    
    // Apply to each selected screen
    for (const screenId of body.screenIds) {
      // Clear existing playlist
      await pool.query('DELETE FROM playlists WHERE screen_id = $1', [screenId])
      
      // Add preset items to screen
      for (const item of presetItems.rows) {
        await pool.query(`
          INSERT INTO playlists (screen_id, asset_id, duration, position, split_config)
          VALUES ($1, $2, $3, $4, $5)
        `, [screenId, item.asset_id, item.duration, item.position, item.split_config])
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Preset applied to ${body.screenIds.length} screen(s)` 
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
