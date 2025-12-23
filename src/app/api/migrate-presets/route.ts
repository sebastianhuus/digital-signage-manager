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
    // Create preset_playlists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS preset_playlists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create preset_playlist_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS preset_playlist_items (
        id SERIAL PRIMARY KEY,
        preset_playlist_id INTEGER REFERENCES preset_playlists(id) ON DELETE CASCADE,
        asset_id VARCHAR(50) REFERENCES assets(asset_id),
        duration INTEGER NOT NULL,
        position INTEGER NOT NULL,
        split_config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    return NextResponse.json({ success: true, message: 'Preset playlists tables created' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
