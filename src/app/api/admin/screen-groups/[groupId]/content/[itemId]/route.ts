import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string }> }
) {
  try {
    const { groupId, itemId } = await params
    const body = await request.json()
    const { duration, position } = body

    // Build update query dynamically based on what's provided
    const updates: string[] = []
    const values: (number | string)[] = []
    let paramIndex = 1

    if (duration !== undefined) {
      updates.push(`duration = $${paramIndex}`)
      values.push(duration)
      paramIndex++
    }

    if (position !== undefined) {
      updates.push(`position = $${paramIndex}`)
      values.push(position)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(parseInt(itemId))
    values.push(groupId)

    const result = await pool.query(`
      UPDATE group_playlists
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND group_id = $${paramIndex + 1}
      RETURNING *
    `, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // If duration was updated, also update the duration on all screen playlists
    // for the tiles associated with this content
    if (duration !== undefined) {
      const groupPlaylist = result.rows[0]
      const assetId = groupPlaylist.original_asset_id

      // Get all tile asset IDs for this content
      const tilesResult = await pool.query(
        'SELECT tile_asset_id FROM split_assets WHERE group_id = $1 AND original_asset_id = $2',
        [groupId, assetId]
      )

      // Update duration on screen playlists for these tiles
      for (const tile of tilesResult.rows) {
        await pool.query(
          'UPDATE playlists SET duration = $1 WHERE asset_id = $2',
          [duration, tile.tile_asset_id]
        )
      }

      // For videos (no tiles), update the original asset on screen playlists
      if (tilesResult.rows.length === 0) {
        const membersResult = await pool.query(
          'SELECT screen_id FROM screen_group_members WHERE group_id = $1',
          [groupId]
        )
        for (const member of membersResult.rows) {
          await pool.query(
            'UPDATE playlists SET duration = $1 WHERE screen_id = $2 AND asset_id = $3',
            [duration, member.screen_id, assetId]
          )
        }
      }
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
