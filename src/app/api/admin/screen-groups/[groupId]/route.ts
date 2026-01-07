import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params

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
      WHERE sg.group_id = $1
      GROUP BY sg.id, sg.group_id, sg.name, sg.layout, sg.description, sg.created_at, sg.updated_at
    `, [groupId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await pool.query(`
      UPDATE screen_groups
      SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $3
      RETURNING *
    `, [name, description || null, groupId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
