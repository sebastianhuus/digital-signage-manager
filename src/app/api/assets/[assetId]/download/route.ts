import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const validatedScreenId = await validateApiKey(request)
  if (!validatedScreenId) {
    return unauthorizedResponse()
  }

  const { assetId } = await params
  
  try {
    const result = await pool.query(
      'SELECT url FROM assets WHERE asset_id = $1',
      [assetId]
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }
    
    const asset = result.rows[0]
    
    // If we have a Vercel Blob URL, redirect to it
    if (asset.url && asset.url.startsWith('https://')) {
      return NextResponse.redirect(asset.url)
    }
    
    return NextResponse.json({ 
      error: 'File not available',
      message: `Asset ${assetId} has no downloadable URL`
    }, { status: 404 })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
