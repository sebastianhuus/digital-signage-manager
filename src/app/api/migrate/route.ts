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
    
    return NextResponse.json({ success: true, message: 'Migration completed' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
