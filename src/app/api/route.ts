import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Signage Manager API',
    version: '1.0.0',
    endpoints: {
      screens: {
        config: '/api/screens/{screenId}/config',
        playlist: '/api/screens/{screenId}/playlist', 
        heartbeat: '/api/screens/{screenId}/heartbeat'
      },
      assets: {
        metadata: '/api/assets/{assetId}',
        download: '/api/assets/{assetId}/download'
      }
    },
    sampleScreenIds: ['tv-1', 'tv-2']
  })
}
