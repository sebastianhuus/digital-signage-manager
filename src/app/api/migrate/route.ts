import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: NextRequest) {
  // Require setup key for migrations
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
    // Add split_config column if it doesn't exist
    await pool.query(`
      ALTER TABLE playlists
      ADD COLUMN IF NOT EXISTS split_config JSONB
    `)

    // Create screen_groups table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS screen_groups (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        layout VARCHAR(10) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create screen_group_members table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS screen_group_members (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(50) REFERENCES screen_groups(group_id) ON DELETE CASCADE,
        screen_id VARCHAR(50) REFERENCES screens(screen_id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, position),
        UNIQUE(screen_id)
      )
    `)

    // Create group_playlists table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_playlists (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(50) REFERENCES screen_groups(group_id) ON DELETE CASCADE,
        original_asset_id VARCHAR(50) REFERENCES assets(asset_id) ON DELETE CASCADE,
        duration INTEGER NOT NULL DEFAULT 10,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, position)
      )
    `)

    // Create split_assets table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS split_assets (
        id SERIAL PRIMARY KEY,
        original_asset_id VARCHAR(50) REFERENCES assets(asset_id) ON DELETE CASCADE,
        tile_asset_id VARCHAR(50) REFERENCES assets(asset_id) ON DELETE CASCADE,
        group_id VARCHAR(50) REFERENCES screen_groups(group_id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, original_asset_id, position)
      )
    `)

    return NextResponse.json({ success: true, message: 'Migration completed' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
