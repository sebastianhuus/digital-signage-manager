import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
  return POST()
}

export async function POST() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS screens (
        id SERIAL PRIMARY KEY,
        screen_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        resolution VARCHAR(20) DEFAULT '1920x1080',
        refresh_interval INTEGER DEFAULT 30,
        location VARCHAR(100),
        api_key VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Add api_key column if it doesn't exist
    await pool.query(`
      ALTER TABLE screens 
      ADD COLUMN IF NOT EXISTS api_key VARCHAR(100);
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        asset_id VARCHAR(50) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        size INTEGER,
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        screen_id VARCHAR(50) REFERENCES screens(screen_id),
        asset_id VARCHAR(50) REFERENCES assets(asset_id),
        duration INTEGER NOT NULL,
        position INTEGER NOT NULL,
        split_config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS heartbeats (
        id SERIAL PRIMARY KEY,
        screen_id VARCHAR(50) REFERENCES screens(screen_id),
        status VARCHAR(20) DEFAULT 'online',
        current_asset VARCHAR(50),
        uptime INTEGER,
        temperature FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Generate API keys for screens that don't have them
    const { generateApiKey } = await import('@/lib/apiKeys')
    const screensWithoutKeys = await pool.query('SELECT screen_id FROM screens WHERE api_key IS NULL')
    
    for (const screen of screensWithoutKeys.rows) {
      const apiKey = generateApiKey()
      await pool.query('UPDATE screens SET api_key = $1 WHERE screen_id = $2', [apiKey, screen.screen_id])
    }

    return NextResponse.json({ success: true, message: 'Database initialized' })
  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ error: 'Database setup failed' }, { status: 500 })
  }
}
