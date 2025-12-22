import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'

// Mock heartbeat storage - replace with database later
const heartbeats: Record<string, any> = {}

export async function POST(
  request: NextRequest,
  { params }: { params: { screenId: string } }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { screenId } = params
  
  try {
    const body = await request.json()
    
    heartbeats[screenId] = {
      screenId,
      timestamp: new Date().toISOString(),
      status: body.status || 'online',
      currentAsset: body.currentAsset,
      uptime: body.uptime,
      temperature: body.temperature
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Heartbeat received' 
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' }, 
      { status: 400 }
    )
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
  
  const heartbeat = heartbeats[screenId]
  
  if (!heartbeat) {
    return NextResponse.json({ error: 'No heartbeat data' }, { status: 404 })
  }
  
  return NextResponse.json(heartbeat)
}
