'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Asset {
  id: number
  asset_id: string
  filename: string
  display_name?: string
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
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

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

  const startEdit = (asset: Asset) => {
    setEditingAsset(asset.asset_id)
    setEditName(asset.display_name || asset.filename)
  }

  const cancelEdit = () => {
    setEditingAsset(null)
    setEditName('')
  }

  const saveEdit = async (assetId: string) => {
    try {
      const response = await fetch(`/api/admin/assets?assetId=${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editName })
      })

      if (response.ok) {
        setEditingAsset(null)
        setEditName('')
        fetchAssets()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to update asset:', error)
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
            ← Home
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-white rounded shadow overflow-hidden">
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              {asset.type === 'image' ? (
                <img 
                  src={asset.url} 
                  alt={asset.filename}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-2xl">🎬</div>
              )}
            </div>
            <div className="p-3">
              {editingAsset === asset.asset_id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-1 border rounded text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(asset.asset_id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(asset.asset_id)}
                      className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="font-medium truncate cursor-pointer hover:bg-gray-50 p-1 rounded flex items-center gap-1 group text-sm" 
                  title="Click to edit name"
                  onClick={() => startEdit(asset)}
                >
                  <span className="flex-1 truncate">{asset.display_name || asset.filename}</span>
                  <svg 
                    className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {asset.type} • {formatSize(asset.size)}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                {asset.asset_id}
              </div>
              <button
                onClick={() => deleteAsset(asset.asset_id)}
                className="mt-2 w-full bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
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
