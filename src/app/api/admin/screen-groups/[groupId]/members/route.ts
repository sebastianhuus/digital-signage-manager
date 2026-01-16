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
        sgm.*,
        s.name,
        s.location,
        s.resolution,
        (
          SELECT timestamp FROM heartbeats
          WHERE screen_id = s.screen_id
          ORDER BY timestamp DESC LIMIT 1
        ) as last_heartbeat
      FROM screen_group_members sgm
      JOIN screens s ON sgm.screen_id = s.screen_id
      WHERE sgm.group_id = $1
      ORDER BY sgm.position
    `, [groupId])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const body = await request.json()
    const { screenId, position } = body

    if (!screenId || position === undefined) {
      return NextResponse.json({ error: 'Screen ID and position are required' }, { status: 400 })
    }

    // Verify group exists and get layout
    const groupResult = await pool.query(
      'SELECT layout FROM screen_groups WHERE group_id = $1',
      [groupId]
    )

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const layout = groupResult.rows[0].layout
    const maxPosition = layout === '3x1' ? 2 : 1

    if (position < 0 || position > maxPosition) {
      return NextResponse.json({ error: `Invalid position. Must be 0-${maxPosition} for ${layout} layout` }, { status: 400 })
    }

    // Verify screen exists and isn't already in a group
    const screenCheck = await pool.query(
      'SELECT screen_id FROM screens WHERE screen_id = $1',
      [screenId]
    )

    if (screenCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }

    const existingMembership = await pool.query(
      'SELECT group_id FROM screen_group_members WHERE screen_id = $1',
      [screenId]
    )

    if (existingMembership.rows.length > 0) {
      return NextResponse.json({ error: 'Screen is already in a group' }, { status: 400 })
    }

    const result = await pool.query(`
      INSERT INTO screen_group_members (group_id, screen_id, position)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [groupId, screenId, position])

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Database error:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Position already occupied in this group' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const { searchParams } = new URL(request.url)
    const screenId = searchParams.get('screenId')

    if (!screenId) {
      return NextResponse.json({ error: 'Screen ID required' }, { status: 400 })
    }

    await pool.query(
      'DELETE FROM screen_group_members WHERE group_id = $1 AND screen_id = $2',
      [groupId, screenId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
