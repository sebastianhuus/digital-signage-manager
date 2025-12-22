import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST() {
  try {
    // Add split_config column if it doesn't exist
    await pool.query(`
      ALTER TABLE playlists 
      ADD COLUMN IF NOT EXISTS split_config JSONB
    `)
    
    return NextResponse.json({ success: true, message: 'Migration completed' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
