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
    // Add display_name column to assets table
    await pool.query(`
      ALTER TABLE assets 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)
    `)
    
    // Update existing assets to use filename as display_name
    await pool.query(`
      UPDATE assets 
      SET display_name = filename 
      WHERE display_name IS NULL
    `)
    
    return NextResponse.json({ success: true, message: 'Assets table updated with display_name' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
