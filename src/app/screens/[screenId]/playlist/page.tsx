'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface PlaylistItem {
  id: number
  asset_id: string
  duration: number
  position: number
  filename: string
  type: string
  size: number
  split_config?: any
}

interface Asset {
  asset_id: string
  filename: string
  display_name?: string
  type: string
  size: number
  url: string
}

export default function PlaylistPage({ params }: { params: Promise<{ screenId: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState('')
  const [duration, setDuration] = useState(10)
  const [playlistMode, setPlaylistMode] = useState<'individual' | 'shared' | 'split'>('individual')
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [screenId, setScreenId] = useState<string>('')

  useEffect(() => {
    params.then(p => setScreenId(p.screenId))
  }, [params])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && screenId) {
      fetchPlaylist()
      fetchAssets()
    }
  }, [session, screenId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAssetDropdown) {
        const target = event.target as Element
        if (!target.closest('.asset-dropdown')) {
          setShowAssetDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAssetDropdown])

  const fetchPlaylist = async () => {
    if (!screenId) return
    try {
      const response = await fetch(`/api/admin/screens/${screenId}/playlist`)
      const data = await response.json()
      setPlaylist(data)
    } catch (error) {
      console.error('Failed to fetch playlist:', error)
    }
  }

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets')
      const data = await response.json()
      setAssets(data)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const addToPlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!screenId) return
    
    try {
      const response = await fetch(`/api/admin/screens/${screenId}/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset,
          duration,
          splitConfig: playlistMode === 'split' ? { mode: 'split' } : null
        })
      })
      
      if (response.ok) {
        setSelectedAsset('')
        setDuration(10)
        setShowAddForm(false)
        fetchPlaylist()
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error)
    }
  }

  const removeFromPlaylist = async (id: number) => {
    if (!screenId) return
    try {
      const response = await fetch(`/api/admin/screens/${screenId}/playlist?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchPlaylist()
      }
    } catch (error) {
      console.error('Failed to remove from playlist:', error)
    }
  }

  const copyPlaylistToAll = async () => {
    if (!confirm('Copy this playlist to all other screens?')) return
    
    try {
      const response = await fetch('/api/admin/screens')
      const screens = await response.json()
      
      for (const screen of screens) {
        if (screen.screen_id !== screenId) {
          // Clear existing playlist
          await fetch(`/api/admin/screens/${screen.screen_id}/playlist/clear`, { method: 'POST' })
          
          // Copy each item
          for (const item of playlist) {
            await fetch(`/api/admin/screens/${screen.screen_id}/playlist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                assetId: item.asset_id,
                duration: item.duration
              })
            })
          }
        }
      }
      
      alert('Playlist copied to all screens!')
    } catch (error) {
      console.error('Failed to copy playlist:', error)
    }
  }

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Playlist for {screenId}</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/')}
              className="text-blue-500 hover:underline"
            >
              ← Home
            </button>
            <button 
              onClick={() => router.push('/screens')}
              className="text-blue-500 hover:underline"
            >
              ← Back to Screens
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={copyPlaylistToAll}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Copy to All Screens
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Content
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Content to Playlist</h2>
          <form onSubmit={addToPlaylist} className="space-y-4">
            <div>
              <label className="block mb-2">Content Mode:</label>
              <select
                value={playlistMode}
                onChange={(e) => setPlaylistMode(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="individual">Individual - Show full content on this screen</option>
                <option value="shared">Shared - Same content on all screens</option>
                <option value="split">Split - Part of larger content across screens</option>
              </select>
            </div>
            
            <div>
              <label className="block mb-2">Select Asset:</label>
              <div className="relative asset-dropdown">
                <button
                  type="button"
                  onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                  className="w-full p-2 border rounded bg-white text-left flex items-center justify-between"
                >
                  {selectedAsset ? (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const asset = assets.find(a => a.asset_id === selectedAsset)
                        return asset ? (
                          <>
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                              {asset.type === 'image' ? (
                                <img 
                                  src={asset.url} 
                                  alt={asset.display_name || asset.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-gray-400 text-xs">🎬</div>
                              )}
                            </div>
                            <span className="truncate">{asset.display_name || asset.filename}</span>
                          </>
                        ) : null
                      })()}
                    </div>
                  ) : (
                    <span className="text-gray-500">Choose an asset...</span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAssetDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
                    {assets.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No assets available. <a href="/assets" className="text-blue-500 hover:underline">Upload some content</a> first.
                      </div>
                    ) : (
                      assets.map((asset) => (
                        <button
                          key={asset.asset_id}
                          type="button"
                          onClick={() => {
                            setSelectedAsset(asset.asset_id)
                            setShowAssetDropdown(false)
                          }}
                          className={`w-full p-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                            selectedAsset === asset.asset_id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                            {asset.type === 'image' ? (
                              <img 
                                src={asset.url} 
                                alt={asset.display_name || asset.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-gray-400 text-lg">🎬</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{asset.display_name || asset.filename}</div>
                            <div className="text-sm text-gray-500">{asset.type}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block mb-2">Duration (seconds):</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="1"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                disabled={!selectedAsset}
              >
                Add to Playlist
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false)
                  setSelectedAsset('')
                  setDuration(10)
                  setShowAssetDropdown(false)
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded shadow">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Current Playlist ({playlist.length} items)</h2>
        </div>
        
        {playlist.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No content in playlist. Add some content to get started.
          </div>
        ) : (
          <div className="divide-y">
            {playlist.map((item, index) => (
              <div key={item.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{item.filename}</div>
                    <div className="text-sm text-gray-500">
                      {item.type} • {item.duration}s
                      {item.split_config && <span className="ml-2 bg-orange-100 px-2 py-1 rounded text-xs">SPLIT</span>}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeFromPlaylist(item.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
