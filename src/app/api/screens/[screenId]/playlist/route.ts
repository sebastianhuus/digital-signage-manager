import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'

// Mock playlists - replace with database later
const playlists = {
  'tv-1': {
    screenId: 'tv-1',
    lastUpdated: '2025-12-22T10:00:00Z',
    items: [
      { assetId: 'welcome-img', duration: 10, type: 'image' },
      { assetId: 'promo-video', duration: 30, type: 'video' },
      { assetId: 'news-feed', duration: 15, type: 'image' }
    ]
  },
  'tv-2': {
    screenId: 'tv-2',
    lastUpdated: '2025-12-22T10:00:00Z', 
    items: [
      { assetId: 'schedule-img', duration: 20, type: 'image' },
      { assetId: 'announcement', duration: 10, type: 'image' }
    ]
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { screenId: string } }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { screenId } = params
  
  const playlist = playlists[screenId as keyof typeof playlists]
  
  if (!playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
  }
  
  return NextResponse.json(playlist)
}
