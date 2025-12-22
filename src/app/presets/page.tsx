'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import PageContainer from "@/components/PageContainer"

interface PresetPlaylist {
  id: number
  name: string
  description: string
  item_count: number
  items: Array<{
    asset_id: string
    duration: number
    position: number
    filename: string
    type: string
    url: string
  }>
  created_at: string
}

interface Screen {
  screen_id: string
  name: string
  location: string
}

export default function PresetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [presets, setPresets] = useState<PresetPlaylist[]>([])
  const [screens, setScreens] = useState<Screen[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPreset, setNewPreset] = useState({ name: '', description: '' })
  const [showApplyModal, setShowApplyModal] = useState<number | null>(null)
  const [selectedScreens, setSelectedScreens] = useState<string[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchPresets()
      fetchScreens()
    }
  }, [session])

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/admin/presets')
      const data = await response.json()
      setPresets(data)
    } catch (error) {
      console.error('Failed to fetch presets:', error)
    }
  }

  const fetchScreens = async () => {
    try {
      const response = await fetch('/api/admin/screens')
      const data = await response.json()
      setScreens(data)
    } catch (error) {
      console.error('Failed to fetch screens:', error)
    }
  }

  const createPreset = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset)
      })
      
      if (response.ok) {
        setNewPreset({ name: '', description: '' })
        setShowCreateForm(false)
        fetchPresets()
      }
    } catch (error) {
      console.error('Failed to create preset:', error)
    }
  }

  const deletePreset = async (presetId: number) => {
    if (!confirm('Delete this preset playlist?')) return
    
    try {
      const response = await fetch(`/api/admin/presets?presetId=${presetId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchPresets()
      }
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  const applyPreset = async (presetId: number) => {
    if (selectedScreens.length === 0) {
      alert('Please select at least one screen')
      return
    }

    try {
      const response = await fetch(`/api/admin/presets/${presetId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenIds: selectedScreens })
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        setShowApplyModal(null)
        setSelectedScreens([])
      }
    } catch (error) {
      console.error('Failed to apply preset:', error)
    }
  }

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Playlist Presets</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-500 hover:underline"
          >
            ← Home
          </button>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create Preset
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Preset</h2>
          <form onSubmit={createPreset} className="space-y-4">
            <input
              type="text"
              placeholder="Preset name (e.g., Holiday Promo)"
              value={newPreset.name}
              onChange={(e) => setNewPreset({...newPreset, name: e.target.value})}
              className="w-full p-2 border rounded"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newPreset.description}
              onChange={(e) => setNewPreset({...newPreset, description: e.target.value})}
              className="w-full p-2 border rounded"
              rows={3}
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Create Preset
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presets.map((preset) => (
          <div key={preset.id} className="bg-white rounded shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{preset.name}</h3>
                {preset.description && (
                  <p className="text-gray-600 text-sm mt-1">{preset.description}</p>
                )}
              </div>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                {preset.item_count || 0} items
              </span>
            </div>

            {preset.items && preset.items.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                <div className="space-y-1">
                  {preset.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-4 h-4 bg-gray-100 rounded flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <span className="truncate">{item.filename}</span>
                      <span>({item.duration}s)</span>
                    </div>
                  ))}
                  {preset.items.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{preset.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/presets/${preset.id}/edit`)}
                className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => setShowApplyModal(preset.id)}
                className="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm"
              >
                Apply
              </button>
              <button
                onClick={() => deletePreset(preset.id)}
                className="bg-red-500 text-white px-3 py-2 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No preset playlists yet. Create one to get started!
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Apply Preset to Screens</h3>
            <div className="space-y-2 mb-4">
              {screens.map((screen) => (
                <label key={screen.screen_id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedScreens.includes(screen.screen_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScreens([...selectedScreens, screen.screen_id])
                      } else {
                        setSelectedScreens(selectedScreens.filter(id => id !== screen.screen_id))
                      }
                    }}
                  />
                  <span>{screen.name} ({screen.screen_id})</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyPreset(showApplyModal)}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded"
              >
                Apply to Selected
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(null)
                  setSelectedScreens([])
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
