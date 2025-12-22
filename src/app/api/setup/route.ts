import { NextRequest, NextResponse } from 'next/server'
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

    // Insert sample data
    await pool.query(`
      INSERT INTO screens (screen_id, name, location) VALUES 
      ('tv-1', 'Main Display', 'Lobby'),
      ('tv-2', 'Secondary Display', 'Conference Room')
      ON CONFLICT (screen_id) DO NOTHING;
    `)

    await pool.query(`
      INSERT INTO assets (asset_id, filename, type, size) VALUES 
      ('welcome-img', 'welcome.jpg', 'image', 1024000),
      ('promo-video', 'promo.mp4', 'video', 5120000),
      ('news-feed', 'news.png', 'image', 512000),
      ('schedule-img', 'schedule.jpg', 'image', 768000),
      ('announcement', 'announcement.png', 'image', 256000)
      ON CONFLICT (asset_id) DO NOTHING;
    `)

    await pool.query(`
      INSERT INTO playlists (screen_id, asset_id, duration, position) VALUES 
      ('tv-1', 'welcome-img', 10, 1),
      ('tv-1', 'promo-video', 30, 2),
      ('tv-1', 'news-feed', 15, 3),
      ('tv-2', 'schedule-img', 20, 1),
      ('tv-2', 'announcement', 10, 2)
      ON CONFLICT DO NOTHING;
    `)

    return NextResponse.json({ success: true, message: 'Database initialized' })
  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ error: 'Database setup failed' }, { status: 500 })
  }
}
