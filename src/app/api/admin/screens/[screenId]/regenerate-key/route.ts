import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { generateApiKey } from '@/lib/apiKeys'

export async function POST(request: NextRequest, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params
    const newApiKey = generateApiKey()
    
    const result = await pool.query(`
      UPDATE screens 
      SET api_key = $1, updated_at = CURRENT_TIMESTAMP
      WHERE screen_id = $2
      RETURNING *
    `, [newApiKey, screenId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
