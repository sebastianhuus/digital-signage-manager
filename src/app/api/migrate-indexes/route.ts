import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: NextRequest) {
  const setupKey = process.env.SETUP_KEY
  if (!setupKey) {
    return NextResponse.json({ error: 'Setup not configured' }, { status: 500 })
  }

  const keyFromQuery = new URL(request.url).searchParams.get('key')
  const keyFromHeader = request.headers.get('x-setup-key')

  if (keyFromQuery !== setupKey && keyFromHeader !== setupKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_heartbeats_screen_timestamp ON heartbeats(screen_id, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_screens_api_key ON screens(api_key)',
      'CREATE INDEX IF NOT EXISTS idx_playlists_screen_id ON playlists(screen_id)',
      'CREATE INDEX IF NOT EXISTS idx_split_assets_original ON split_assets(original_asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_screen_group_members_group_id ON screen_group_members(group_id)',
    ]

    const results = []
    for (const sql of indexes) {
      await pool.query(sql)
      results.push(sql.match(/idx_\w+/)?.[0])
    }

    return NextResponse.json({ success: true, message: 'Indexes created', indexes: results })
  } catch (error) {
    console.error('Index migration error:', error)
    return NextResponse.json({ error: 'Index migration failed' }, { status: 500 })
  }
}
