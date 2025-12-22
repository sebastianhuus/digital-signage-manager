'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Asset {
  id: number
  asset_id: string
  filename: string
  type: string
  size: number
  url: string
  created_at: string
}

export default function AssetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchAssets()
    }
  }, [session])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets')
      const data = await response.json()
      setAssets(data)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/assets', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        fetchAssets()
        e.target.value = ''
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const deleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset? It will be removed from all playlists.')) return

    try {
      const response = await fetch(`/api/admin/assets?assetId=${assetId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAssets()
      }
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Assets Library</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-500 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
        <label className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600">
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white rounded shadow overflow-hidden">
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              {asset.type === 'image' ? (
                <img 
                  src={asset.url} 
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-4xl">🎬</div>
              )}
            </div>
            <div className="p-4">
              <div className="font-medium truncate" title={asset.display_name || asset.filename}>
                {asset.display_name || asset.filename}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {asset.type} • {formatSize(asset.size)}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                {asset.asset_id}
              </div>
              <button
                onClick={() => deleteAsset(asset.asset_id)}
                className="mt-3 w-full bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No assets uploaded yet. Click "Upload File" to add images or videos.
        </div>
      )}
    </div>
  )
}
