import sharp from 'sharp'

export interface OptimizeResult {
  buffer: Buffer
  filename: string
  contentType: string
  size: number
  originalWidth: number
  originalHeight: number
  optimizedWidth: number
  optimizedHeight: number
}

export async function optimizeImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<OptimizeResult> {
  const isGif = filename.toLowerCase().endsWith('.gif')

  const metadata = await sharp(buffer, isGif ? { animated: true } : undefined).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not determine image dimensions')
  }

  // GIFs: return as-is to preserve animation
  if (isGif) {
    return {
      buffer,
      filename,
      contentType: 'image/gif',
      size: buffer.length,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      optimizedWidth: metadata.width,
      optimizedHeight: metadata.height,
    }
  }

  // Non-GIF images: convert to webp for bandwidth savings, no resize
  const optimized = await sharp(buffer)
    .webp({ quality: 90 })
    .toBuffer()
  const optimizedFilename = filename.replace(/\.[^.]+$/, '.webp')

  const optimizedMeta = await sharp(optimized).metadata()

  return {
    buffer: optimized,
    filename: optimizedFilename,
    contentType: 'image/webp',
    size: optimized.length,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    optimizedWidth: optimizedMeta.width!,
    optimizedHeight: optimizedMeta.height!,
  }
}
