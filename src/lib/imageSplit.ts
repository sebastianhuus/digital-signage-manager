import sharp from 'sharp'

export interface SplitResult {
  buffer: Buffer
  position: number
  width: number
  height: number
}

export async function splitImage(imageUrl: string, layout: string): Promise<SplitResult[]> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const image = sharp(buffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not determine image dimensions')
  }

  const { width, height } = metadata
  const tiles: SplitResult[] = []

  if (layout === '3x1') {
    // Split horizontally into 3 parts
    const tileWidth = Math.floor(width / 3)
    for (let i = 0; i < 3; i++) {
      const left = i * tileWidth
      // For the last tile, use remaining width to avoid rounding issues
      const extractWidth = i === 2 ? width - left : tileWidth

      const tile = await sharp(buffer)
        .extract({ left, top: 0, width: extractWidth, height })
        .toBuffer()

      tiles.push({
        buffer: tile,
        position: i,
        width: extractWidth,
        height
      })
    }
  } else if (layout === '1x2') {
    // Split vertically into 2 parts
    const tileHeight = Math.floor(height / 2)
    for (let i = 0; i < 2; i++) {
      const top = i * tileHeight
      // For the last tile, use remaining height to avoid rounding issues
      const extractHeight = i === 1 ? height - top : tileHeight

      const tile = await sharp(buffer)
        .extract({ left: 0, top, width, height: extractHeight })
        .toBuffer()

      tiles.push({
        buffer: tile,
        position: i,
        width,
        height: extractHeight
      })
    }
  } else {
    throw new Error(`Unsupported layout: ${layout}`)
  }

  return tiles
}

export function getPositionCount(layout: string): number {
  switch (layout) {
    case '3x1':
      return 3
    case '1x2':
      return 2
    default:
      return 0
  }
}
