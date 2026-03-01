import sharp from 'sharp'

const MAX_DIMENSION_LONG = 1920
const MAX_DIMENSION_SHORT = 1080

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

  const isLandscape = metadata.width >= metadata.height
  const maxWidth = isLandscape ? MAX_DIMENSION_LONG : MAX_DIMENSION_SHORT
  const maxHeight = isLandscape ? MAX_DIMENSION_SHORT : MAX_DIMENSION_LONG

  const needsResize = metadata.width > maxWidth || metadata.height > maxHeight

  let optimized: Buffer
  let contentType: string
  let optimizedFilename: string

  if (isGif) {
    // Resize only if needed, keep as GIF to preserve animation
    if (!needsResize) {
      // Nothing to do — return as-is
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
    optimized = await sharp(buffer, { animated: true })
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      .gif()
      .toBuffer()
    contentType = 'image/gif'
    optimizedFilename = filename
  } else {
    optimized = await sharp(buffer)
      .resize(needsResize ? { width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true } : undefined)
      .jpeg({ quality: 80 })
      .toBuffer()
    contentType = 'image/jpeg'
    optimizedFilename = filename.replace(/\.[^.]+$/, '.jpg')
  }

  const optimizedMeta = await sharp(optimized, isGif ? { animated: true } : undefined).metadata()

  return {
    buffer: optimized,
    filename: optimizedFilename,
    contentType,
    size: optimized.length,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    optimizedWidth: optimizedMeta.width!,
    optimizedHeight: optimizedMeta.height!,
  }
}
