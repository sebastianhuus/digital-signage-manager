import { randomBytes } from 'crypto'

export function generateApiKey(): string {
  const random = randomBytes(32).toString('base64url')
  return `signage_${random}`
}

export function redactApiKey(apiKey: string): string {
  if (!apiKey) return 'No key generated'
  if (apiKey.length < 8) return apiKey
  return `${apiKey.slice(0, 12)}...${apiKey.slice(-6)}`
}
