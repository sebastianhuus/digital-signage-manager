import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ presetId: string, itemId: string }> }
) {
  const { presetId, itemId } = await params
  const body = await request.json()
  
  try {
    let query = 'UPDATE preset_playlist_items SET '
    let values = []
    let paramCount = 1
    
    if (body.duration !== undefined) {
      query += `duration = $${paramCount}, `
      values.push(body.duration)
      paramCount++
    }
    
    if (body.position !== undefined) {
      query += `position = $${paramCount}, `
      values.push(body.position)
      paramCount++
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2)
    
    query += ` WHERE id = $${paramCount} AND preset_playlist_id = $${paramCount + 1} RETURNING *`
    values.push(itemId, presetId)
    
    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Preset item not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
