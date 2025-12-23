import { NextRequest, NextResponse } from 'next/server'
import { pool } from './db'

export async function validateApiKey(request: NextRequest): Promise<string | null> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return null
  
  try {
    const result = await pool.query('SELECT screen_id FROM screens WHERE api_key = $1', [apiKey])
    return result.rows.length > 0 ? result.rows[0].screen_id : null
  } catch (error) {
    console.error('API key validation error:', error)
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized - Invalid or missing API key' },
    { status: 401 }
  )
}
