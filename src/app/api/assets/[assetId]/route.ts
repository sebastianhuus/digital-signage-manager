import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { assetId } = await params
  
  try {
    const result = await pool.query(
      'SELECT * FROM assets WHERE asset_id = $1',
      [assetId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }
    
    const asset = result.rows[0]
    return NextResponse.json({
      assetId: asset.asset_id,
      filename: asset.filename,
      type: asset.type,
      url: `/api/assets/${asset.asset_id}/download`,
      size: asset.size
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
