import sharp from 'sharp'

const MAX_DIMENSION_LONG = 1920
const MAX_DIMENSION_SHORT = 1080

export async function optimizeImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ buffer: Buffer; filename: string; size: number }> {
  const metadata = await sharp(buffer).metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not determine image dimensions')
  }

  const isLandscape = metadata.width >= metadata.height
  const maxWidth = isLandscape ? MAX_DIMENSION_LONG : MAX_DIMENSION_SHORT
  const maxHeight = isLandscape ? MAX_DIMENSION_SHORT : MAX_DIMENSION_LONG

  const needsResize = metadata.width > maxWidth || metadata.height > maxHeight

  const optimized = await sharp(buffer)
    .resize(needsResize ? { width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true } : undefined)
    .jpeg({ quality: 80 })
    .toBuffer()

  const optimizedFilename = filename.replace(/\.[^.]+$/, '.jpg')

  return { buffer: optimized, filename: optimizedFilename, size: optimized.length }
}
