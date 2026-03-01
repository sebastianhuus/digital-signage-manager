import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { put, del } from '@vercel/blob'
import { optimizeImageBuffer } from '@/lib/imageOptimize'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const setupKey = process.env.SETUP_KEY
  if (!setupKey) {
    return NextResponse.json({ error: 'Setup not configured' }, { status: 500 })
  }

  const keyFromQuery = new URL(request.url).searchParams.get('key')
  const keyFromHeader = request.headers.get('x-setup-key')

  if (keyFromQuery !== setupKey && keyFromHeader !== setupKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitParam = new URL(request.url).searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : null

  try {
    let query = `SELECT asset_id, filename, url, size FROM assets WHERE type = 'image' ORDER BY created_at ASC`
    if (limit && limit > 0) {
      query += ` LIMIT ${limit}`
    }
    const { rows: assets } = await pool.query(query)

    const results = { optimized: 0, failed: 0, skipped: 0, errors: [] as string[] }

    for (const asset of assets) {
      try {
        console.log(`[migrate-optimize-images] Processing ${asset.asset_id} (${asset.filename})`)

        const response = await fetch(asset.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status}`)
        }
        const arrayBuffer = await response.arrayBuffer()
        const originalBuffer = Buffer.from(arrayBuffer)

        const { buffer: optimized, filename, size } = await optimizeImageBuffer(originalBuffer, asset.filename)

        // Skip if already optimized (same size or larger after re-encode)
        if (size >= asset.size) {
          console.log(`[migrate-optimize-images] Skipped ${asset.asset_id} — already optimal (${asset.size} -> ${size})`)
          results.skipped++
          continue
        }

        const blob = await put(filename, optimized, {
          access: 'public',
          addRandomSuffix: true,
          contentType: 'image/jpeg',
        })

        await pool.query(
          `UPDATE assets SET url = $1, filename = $2, size = $3 WHERE asset_id = $4`,
          [blob.url, filename, size, asset.asset_id]
        )

        await del(asset.url)

        console.log(`[migrate-optimize-images] Optimized ${asset.asset_id}: ${asset.size} -> ${size} bytes (${Math.round((1 - size / asset.size) * 100)}% reduction)`)
        results.optimized++
      } catch (error) {
        const message = `${asset.asset_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`[migrate-optimize-images] Failed ${message}`)
        results.errors.push(message)
        results.failed++
      }
    }

    return NextResponse.json({
      success: true,
      total: assets.length,
      ...results,
    })
  } catch (error) {
    console.error('[migrate-optimize-images] Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
