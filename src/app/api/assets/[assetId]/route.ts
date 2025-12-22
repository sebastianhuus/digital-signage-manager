import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'

// Mock assets - replace with Vercel Blob later
const assets = {
  'welcome-img': {
    assetId: 'welcome-img',
    filename: 'welcome.jpg',
    type: 'image',
    url: '/api/assets/welcome-img/download',
    size: 1024000
  },
  'promo-video': {
    assetId: 'promo-video', 
    filename: 'promo.mp4',
    type: 'video',
    url: '/api/assets/promo-video/download',
    size: 5120000
  },
  'news-feed': {
    assetId: 'news-feed',
    filename: 'news.png', 
    type: 'image',
    url: '/api/assets/news-feed/download',
    size: 512000
  },
  'schedule-img': {
    assetId: 'schedule-img',
    filename: 'schedule.jpg',
    type: 'image', 
    url: '/api/assets/schedule-img/download',
    size: 768000
  },
  'announcement': {
    assetId: 'announcement',
    filename: 'announcement.png',
    type: 'image',
    url: '/api/assets/announcement/download', 
    size: 256000
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { assetId } = await params
  
  const asset = assets[assetId as keyof typeof assets]
  
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }
  
  return NextResponse.json(asset)
}
