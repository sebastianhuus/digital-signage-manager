import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        sg.*,
        COALESCE(
          json_agg(
            json_build_object(
              'screen_id', sgm.screen_id,
              'position', sgm.position,
              'name', s.name,
              'location', s.location,
              'resolution', s.resolution,
              'last_heartbeat', (
                SELECT timestamp FROM heartbeats
                WHERE screen_id = s.screen_id
                ORDER BY timestamp DESC LIMIT 1
              )
            ) ORDER BY sgm.position
          ) FILTER (WHERE sgm.screen_id IS NOT NULL),
          '[]'
        ) as members
      FROM screen_groups sg
      LEFT JOIN screen_group_members sgm ON sg.group_id = sgm.group_id
      LEFT JOIN screens s ON sgm.screen_id = s.screen_id
      GROUP BY sg.id, sg.group_id, sg.name, sg.layout, sg.description, sg.created_at, sg.updated_at
      ORDER BY sg.created_at DESC
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
    const { name, layout, description } = body

    if (!name || !layout) {
      return NextResponse.json({ error: 'Name and layout are required' }, { status: 400 })
    }

    if (!['3x1', '1x2'].includes(layout)) {
      return NextResponse.json({ error: 'Invalid layout. Must be 3x1 or 1x2' }, { status: 400 })
    }

    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    const result = await pool.query(`
      INSERT INTO screen_groups (group_id, name, layout, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [groupId, name, layout, description || null])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID required' }, { status: 400 })
    }

    await pool.query('DELETE FROM screen_groups WHERE group_id = $1', [groupId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
