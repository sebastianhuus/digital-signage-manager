'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
import PageContainer from "@/components/PageContainer"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PresetItem {
  id: number
  asset_id: string
  duration: number
  position: number
  filename: string
  type: string
  size: number
  url?: string
}

interface Asset {
  asset_id: string
  filename: string
  display_name?: string
  type: string
  size: number
  url: string
}

interface Preset {
  id: number
  name: string
  description: string
}

function SortablePresetItem({ item, index, onEdit, onRemove, editingDuration, editDurationValue, setEditDurationValue, saveDuration, cancelEditDuration }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="p-4 flex justify-between items-center bg-white">
      <div className="flex items-center space-x-4">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        <div className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
          #{index + 1}
        </div>
        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.type === 'image' && item.url ? (
            <Zoom>
              <img 
                src={item.url} 
                alt={item.filename}
                className="w-full h-full object-cover cursor-zoom-in"
              />
            </Zoom>
          ) : (
            <div className="text-gray-400 text-lg">🎬</div>
          )}
        </div>
        <div>
          <div className="font-medium">{item.filename}</div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>{item.type}</span>
            <span>•</span>
            {editingDuration === item.id ? (
              <div className="flex items-center gap-1 duration-editor">
                <input
                  type="number"
                  value={editDurationValue}
                  onChange={(e) => setEditDurationValue(parseInt(e.target.value) || 0)}
                  className="w-16 px-1 py-0.5 border rounded text-xs"
                  min="1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDuration(item.id)
                    if (e.key === 'Escape') cancelEditDuration()
                  }}
                  autoFocus
                />
                <span className="text-xs">s</span>
                <button
                  onClick={() => saveDuration(item.id)}
                  className="text-green-600 hover:text-green-800 text-xs"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEditDuration}
                  className="text-red-600 hover:text-red-800 text-xs"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span 
                className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                onClick={() => onEdit(item)}
                title="Click to edit duration"
              >
                {item.duration}s
              </span>
            )}
          </div>
        </div>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Remove
      </button>
    </div>
  )
}

export default function PresetEditPage({ params }: { params: Promise<{ presetId: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [preset, setPreset] = useState<Preset | null>(null)
  const [items, setItems] = useState<PresetItem[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState('')
  const [duration, setDuration] = useState(10)
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [editingDuration, setEditingDuration] = useState<number | null>(null)
  const [editDurationValue, setEditDurationValue] = useState(0)
  const [presetId, setPresetId] = useState<string>('')

  useEffect(() => {
    params.then(p => setPresetId(p.presetId))
  }, [params])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && presetId) {
      fetchPreset()
      fetchItems()
      fetchAssets()
    }
  }, [session, presetId])

  const fetchPreset = async () => {
    if (!presetId) return
    try {
      const response = await fetch('/api/admin/presets')
      const presets = await response.json()
      const currentPreset = presets.find((p: Preset) => p.id === parseInt(presetId))
      setPreset(currentPreset)
    } catch (error) {
      console.error('Failed to fetch preset:', error)
    }
  }

  const fetchItems = async () => {
    if (!presetId) return
    try {
      const response = await fetch(`/api/admin/presets/${presetId}/items`)
      const data = await response.json()
      
      // Fetch asset details for URLs
      const itemsWithAssets = await Promise.all(
        data.map(async (item: PresetItem) => {
          try {
            const assetResponse = await fetch(`/api/admin/assets`)
            const assets = await assetResponse.json()
            const asset = assets.find((a: Asset) => a.asset_id === item.asset_id)
            return { ...item, url: asset?.url }
          } catch (error) {
            return item
          }
        })
      )
      
      setItems(itemsWithAssets)
    } catch (error) {
      console.error('Failed to fetch preset items:', error)
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

  const addToPreset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!presetId) return
    
    try {
      const response = await fetch(`/api/admin/presets/${presetId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset,
          duration
        })
      })
      
      if (response.ok) {
        setSelectedAsset('')
        setDuration(10)
        setShowAddForm(false)
        fetchItems()
      }
    } catch (error) {
      console.error('Failed to add to preset:', error)
    }
  }

  const removeFromPreset = async (id: number) => {
    if (!presetId) return
    try {
      const response = await fetch(`/api/admin/presets/${presetId}/items?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchItems()
      }
    } catch (error) {
      console.error('Failed to remove from preset:', error)
    }
  }

  const startEditDuration = (item: PresetItem) => {
    setEditingDuration(item.id)
    setEditDurationValue(item.duration)
  }

  const cancelEditDuration = () => {
    setEditingDuration(null)
    setEditDurationValue(0)
  }

  const saveDuration = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/presets/${presetId}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: editDurationValue })
      })

      if (response.ok) {
        setEditingDuration(null)
        setEditDurationValue(0)
        fetchItems()
      }
    } catch (error) {
      console.error('Failed to update duration:', error)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over?.id)
      
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)

      // Update positions in database
      try {
        await Promise.all(
          newItems.map((item, index) =>
            fetch(`/api/admin/presets/${presetId}/items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: index + 1 })
            })
          )
        )
      } catch (error) {
        console.error('Failed to update preset order:', error)
        fetchItems() // Revert on error
      }
    }
  }

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Edit Preset: {preset?.name}</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/')}
              className="text-blue-500 hover:underline"
            >
              ← Home
            </button>
            <button 
              onClick={() => router.push('/presets')}
              className="text-blue-500 hover:underline"
            >
              ← Back to Presets
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Content
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Content to Preset</h2>
          <form onSubmit={addToPreset} className="space-y-4">
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
                Add to Preset
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
          <h2 className="text-xl font-semibold">Preset Content ({items.length} items)</h2>
        </div>
        
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No content in preset. Add some content to get started.
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={items.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y">
                {items.map((item, index) => (
                  <SortablePresetItem
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={startEditDuration}
                    onRemove={removeFromPreset}
                    editingDuration={editingDuration}
                    editDurationValue={editDurationValue}
                    setEditDurationValue={setEditDurationValue}
                    saveDuration={saveDuration}
                    cancelEditDuration={cancelEditDuration}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </PageContainer>
  )
}
