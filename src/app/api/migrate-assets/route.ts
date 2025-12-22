import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST() {
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
