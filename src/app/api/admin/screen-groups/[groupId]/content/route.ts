import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { splitImage, getPositionCount } from '@/lib/imageSplit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params

    const result = await pool.query(`
      SELECT
        gp.*,
        a.filename,
        a.display_name,
        a.type,
        a.url,
        a.size
      FROM group_playlists gp
      JOIN assets a ON gp.original_asset_id = a.asset_id
      WHERE gp.group_id = $1
      ORDER BY gp.position
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
    const { assetId, duration = 10 } = body

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Get group info and members
    const groupResult = await pool.query(`
      SELECT sg.*,
        json_agg(
          json_build_object('screen_id', sgm.screen_id, 'position', sgm.position)
          ORDER BY sgm.position
        ) FILTER (WHERE sgm.screen_id IS NOT NULL) as members
      FROM screen_groups sg
      LEFT JOIN screen_group_members sgm ON sg.group_id = sgm.group_id
      WHERE sg.group_id = $1
      GROUP BY sg.id
    `, [groupId])

    if (groupResult.rows.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const group = groupResult.rows[0]
    const members = group.members || []
    const expectedPositions = getPositionCount(group.layout)

    if (members.length !== expectedPositions) {
      return NextResponse.json({
        error: `Group must have all ${expectedPositions} screens assigned before adding content`
      }, { status: 400 })
    }

    // Get asset info
    const assetResult = await pool.query(
      'SELECT * FROM assets WHERE asset_id = $1',
      [assetId]
    )

    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const asset = assetResult.rows[0]

    // Get next position for group playlist
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM group_playlists WHERE group_id = $1',
      [groupId]
    )
    const nextPosition = posResult.rows[0].next_pos

    // Handle video assets - assign same video to all screens
    if (asset.type === 'video') {
      // Add to group playlist
      await pool.query(`
        INSERT INTO group_playlists (group_id, original_asset_id, duration, position)
        VALUES ($1, $2, $3, $4)
      `, [groupId, assetId, duration, nextPosition])

      // Add same video to each screen's playlist
      for (const member of members) {
        const screenPosResult = await pool.query(
          'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlists WHERE screen_id = $1',
          [member.screen_id]
        )
        const screenNextPos = screenPosResult.rows[0].next_pos

        await pool.query(`
          INSERT INTO playlists (screen_id, asset_id, duration, position)
          VALUES ($1, $2, $3, $4)
        `, [member.screen_id, assetId, duration, screenNextPos])
      }

      return NextResponse.json({ success: true, type: 'video' })
    }

    // Handle image assets - split and assign tiles
    console.log(`Splitting image ${asset.filename} for group ${groupId}`)

    const tiles = await splitImage(asset.url, group.layout)
    const tileAssetIds: string[] = []

    // Upload each tile to Vercel Blob and create asset records
    for (const tile of tiles) {
      const tileFilename = `tile-${tile.position}-${asset.filename}`
      const tileAssetId = `tile-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

      // Upload to Vercel Blob
      const blob = await put(tileFilename, tile.buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: 'image/jpeg'
      })

      // Create asset record for tile
      await pool.query(`
        INSERT INTO assets (asset_id, filename, display_name, type, size, url)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tileAssetId, tileFilename, `${asset.display_name || asset.filename} (Tile ${tile.position})`, 'image', tile.buffer.length, blob.url])

      // Create split_assets record
      await pool.query(`
        INSERT INTO split_assets (original_asset_id, tile_asset_id, group_id, position)
        VALUES ($1, $2, $3, $4)
      `, [assetId, tileAssetId, groupId, tile.position])

      tileAssetIds.push(tileAssetId)

      // Find the screen at this position and add to its playlist
      const screenMember = members.find((m: { position: number }) => m.position === tile.position)
      if (screenMember) {
        const screenPosResult = await pool.query(
          'SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlists WHERE screen_id = $1',
          [screenMember.screen_id]
        )
        const screenNextPos = screenPosResult.rows[0].next_pos

        await pool.query(`
          INSERT INTO playlists (screen_id, asset_id, duration, position)
          VALUES ($1, $2, $3, $4)
        `, [screenMember.screen_id, tileAssetId, duration, screenNextPos])
      }
    }

    // Add to group playlist
    await pool.query(`
      INSERT INTO group_playlists (group_id, original_asset_id, duration, position)
      VALUES ($1, $2, $3, $4)
    `, [groupId, assetId, duration, nextPosition])

    console.log(`Successfully split and assigned ${tiles.length} tiles`)

    return NextResponse.json({
      success: true,
      type: 'image',
      tiles: tileAssetIds.length
    })
  } catch (error) {
    console.error('Content assignment error:', error)
    return NextResponse.json({
      error: 'Failed to assign content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Get split tiles for this asset in this group
    const tilesResult = await pool.query(`
      SELECT sa.tile_asset_id, a.url
      FROM split_assets sa
      JOIN assets a ON sa.tile_asset_id = a.asset_id
      WHERE sa.original_asset_id = $1 AND sa.group_id = $2
    `, [assetId, groupId])

    // Delete tile assets from playlists, assets table, and Blob storage
    for (const tile of tilesResult.rows) {
      // Remove from playlists
      await pool.query('DELETE FROM playlists WHERE asset_id = $1', [tile.tile_asset_id])

      // Delete from Blob storage
      try {
        await del(tile.url)
      } catch (e) {
        console.error(`Failed to delete blob: ${tile.url}`, e)
      }

      // Delete asset record
      await pool.query('DELETE FROM assets WHERE asset_id = $1', [tile.tile_asset_id])
    }

    // Delete split_assets records
    await pool.query(
      'DELETE FROM split_assets WHERE original_asset_id = $1 AND group_id = $2',
      [assetId, groupId]
    )

    // Delete from group_playlists
    await pool.query(
      'DELETE FROM group_playlists WHERE group_id = $1 AND original_asset_id = $2',
      [groupId, assetId]
    )

    // For videos (no tiles), also remove from individual screen playlists
    if (tilesResult.rows.length === 0) {
      const membersResult = await pool.query(
        'SELECT screen_id FROM screen_group_members WHERE group_id = $1',
        [groupId]
      )
      for (const member of membersResult.rows) {
        await pool.query(
          'DELETE FROM playlists WHERE screen_id = $1 AND asset_id = $2',
          [member.screen_id, assetId]
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Content removal error:', error)
    return NextResponse.json({ error: 'Failed to remove content' }, { status: 500 })
  }
}
