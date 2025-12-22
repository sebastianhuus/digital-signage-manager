import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!validateApiKey(request)) {
    return unauthorizedResponse()
  }

  const { assetId } = await params
  
  // Mock file download - replace with Vercel Blob later
  // For now, return a placeholder response
  return NextResponse.json({ 
    error: 'File download not implemented yet',
    message: `Would download asset: ${assetId}`,
    todo: 'Implement Vercel Blob integration'
  }, { status: 501 })
}
