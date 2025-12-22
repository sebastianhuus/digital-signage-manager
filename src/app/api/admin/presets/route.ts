import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT pp.*, 
        COUNT(ppi.id) as item_count,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'asset_id', ppi.asset_id,
            'duration', ppi.duration,
            'position', ppi.position,
            'filename', a.filename,
            'type', a.type,
            'url', a.url
          ) ORDER BY ppi.position
        ) FILTER (WHERE ppi.id IS NOT NULL) as items
      FROM preset_playlists pp
      LEFT JOIN preset_playlist_items ppi ON pp.id = ppi.preset_playlist_id
      LEFT JOIN assets a ON ppi.asset_id = a.asset_id
      GROUP BY pp.id
      ORDER BY pp.created_at DESC
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
      INSERT INTO preset_playlists (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [body.name, body.description || null])
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const presetId = searchParams.get('presetId')
    
    if (!presetId) {
      return NextResponse.json({ error: 'Preset ID required' }, { status: 400 })
    }
    
    await pool.query('DELETE FROM preset_playlists WHERE id = $1', [presetId])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
