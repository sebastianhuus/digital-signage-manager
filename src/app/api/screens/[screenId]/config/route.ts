import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'

// Mock data - replace with database later
const screens = {
  'tv-1': {
    screenId: 'tv-1',
    name: 'Main Display',
    resolution: '1920x1080',
    refreshInterval: 30,
    location: 'Lobby'
  },
  'tv-2': {
    screenId: 'tv-2', 
    name: 'Secondary Display',
    resolution: '1920x1080',
    refreshInterval: 60,
    location: 'Conference Room'
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
  
  const screen = screens[screenId as keyof typeof screens]
  
  if (!screen) {
    return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
  }
  
  return NextResponse.json(screen)
}
