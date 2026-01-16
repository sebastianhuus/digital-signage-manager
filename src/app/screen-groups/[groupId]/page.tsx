'use client'

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import PageContainer from "@/components/PageContainer"
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'
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
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ScreenMember {
  screen_id: string
  position: number
  name: string
  location: string
  resolution: string
  last_heartbeat: string | null
}

interface ScreenGroup {
  id: number
  group_id: string
  name: string
  layout: string
  description: string | null
  members: ScreenMember[]
  created_at: string
}

interface AvailableScreen {
  screen_id: string
  name: string
  location: string
  resolution: string
  last_heartbeat: string | null
}

interface Asset {
  asset_id: string
  filename: string
  display_name: string
  type: string
  url: string
  size: number
}

interface GroupPlaylistItem {
  id: number
  group_id: string
  original_asset_id: string
  duration: number
  position: number
  filename: string
  display_name: string
  type: string
  url: string
}

const LAYOUT_INFO: Record<string, { label: string; positions: number; isVertical: boolean }> = {
  '3x1': { label: '3x1 (3 Landscape)', positions: 3, isVertical: false },
  '1x2': { label: '1x2 (2 Portrait)', positions: 2, isVertical: true },
}

function SplitPreview({ url, layout, size = 'large' }: { url: string; layout: string; size?: 'small' | 'large' }) {
  const layoutInfo = LAYOUT_INFO[layout]
  const isVertical = layoutInfo?.isVertical

  const sizeClasses = size === 'small'
    ? 'w-16 h-16'
    : 'max-w-full max-h-48'

  const labelSize = size === 'small' ? 'text-[8px] px-0.5' : 'text-xs px-2 py-1'

  return (
    <div className="relative inline-block">
      <img
        src={url}
        alt="Preview"
        className={`${sizeClasses} object-cover rounded`}
      />
      <div className={`absolute inset-0 flex ${isVertical ? 'flex-col' : 'flex-row'}`}>
        {Array.from({ length: layoutInfo?.positions || 0 }).map((_, i) => (
          <div
            key={i}
            className={`border border-dashed border-blue-500 ${
              isVertical ? 'flex-1 w-full' : 'flex-1 h-full'
            } flex items-center justify-center`}
          >
            <span className={`bg-blue-500 text-white ${labelSize} rounded opacity-75`}>
              {i}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SortableContentItem({
  item,
  index,
  layout,
  editingDuration,
  editDurationValue,
  setEditDurationValue,
  onStartEdit,
  onSaveDuration,
  onCancelEdit,
  onRemove
}: {
  item: GroupPlaylistItem
  index: number
  layout: string
  editingDuration: number | null
  editDurationValue: number
  setEditDurationValue: (v: number) => void
  onStartEdit: (item: GroupPlaylistItem) => void
  onSaveDuration: (id: number) => void
  onCancelEdit: () => void
  onRemove: (assetId: string) => void
}) {
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
              <SplitPreview url={item.url} layout={layout} size="small" />
            </Zoom>
          ) : (
            <div className="text-gray-400 text-lg">&#9658;</div>
          )}
        </div>
        <div>
          <div className="font-medium">{item.display_name || item.filename}</div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>{item.type === 'video' ? 'Video (all screens)' : 'Image (split)'}</span>
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
                    if (e.key === 'Enter') onSaveDuration(item.id)
                    if (e.key === 'Escape') onCancelEdit()
                  }}
                  autoFocus
                />
                <span className="text-xs">s</span>
                <button
                  onClick={() => onSaveDuration(item.id)}
                  className="text-green-600 hover:text-green-800 text-xs"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={onCancelEdit}
                  className="text-red-600 hover:text-red-800 text-xs"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:bg-gray-100 px-1 rounded"
                onClick={() => onStartEdit(item)}
                title="Click to edit duration"
              >
                {item.duration}s
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.original_asset_id)}
        className="bg-red-500 text-white px-3 py-1 rounded text-sm"
      >
        Remove
      </button>
    </div>
  )
}

export default function GroupDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<ScreenGroup | null>(null)
  const [availableScreens, setAvailableScreens] = useState<AvailableScreen[]>([])
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)

  // Content management state
  const [groupContent, setGroupContent] = useState<GroupPlaylistItem[]>([])
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState('')
  const [showAssetDropdown, setShowAssetDropdown] = useState(false)
  const [contentDuration, setContentDuration] = useState(10)
  const [addingContent, setAddingContent] = useState(false)
  const [editingDuration, setEditingDuration] = useState<number | null>(null)
  const [editDurationValue, setEditDurationValue] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session && groupId) {
      fetchGroup()
      fetchAvailableScreens()
      fetchGroupContent()
      fetchAssets()
    }
  }, [session, groupId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAssetDropdown) {
        const target = event.target as Element
        if (!target.closest('.asset-dropdown')) {
          setShowAssetDropdown(false)
        }
      }
      if (editingDuration !== null) {
        const target = event.target as Element
        if (!target.closest('.duration-editor')) {
          cancelEditDuration()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAssetDropdown, editingDuration])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data)
        setEditForm({ name: data.name, description: data.description || '' })
      } else {
        router.push('/screen-groups')
      }
    } catch (error) {
      console.error('Failed to fetch group:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableScreens = async () => {
    try {
      const response = await fetch('/api/admin/screens')
      const allScreens = await response.json()

      const groupsResponse = await fetch('/api/admin/screen-groups')
      const allGroups = await groupsResponse.json()

      const screensInGroups = new Set<string>()
      allGroups.forEach((g: ScreenGroup) => {
        g.members.forEach((m: ScreenMember) => {
          if (g.group_id !== groupId) {
            screensInGroups.add(m.screen_id)
          }
        })
      })

      const available = allScreens.filter(
        (s: AvailableScreen) => !screensInGroups.has(s.screen_id)
      )
      setAvailableScreens(available)
    } catch (error) {
      console.error('Failed to fetch available screens:', error)
    }
  }

  const fetchGroupContent = async () => {
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}/content`)
      if (response.ok) {
        const data = await response.json()
        setGroupContent(data)
      }
    } catch (error) {
      console.error('Failed to fetch group content:', error)
    }
  }

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/admin/assets')
      if (response.ok) {
        const data = await response.json()
        setAllAssets(data)
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    }
  }

  const updateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        setEditing(false)
        fetchGroup()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to update group:', error)
    }
  }

  const assignScreen = async (position: number, screenId: string) => {
    if (!screenId) return

    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenId, position })
      })

      if (response.ok) {
        fetchGroup()
        fetchAvailableScreens()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to assign screen:', error)
    }
  }

  const removeScreen = async (screenId: string) => {
    try {
      const response = await fetch(
        `/api/admin/screen-groups/${groupId}/members?screenId=${screenId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        fetchGroup()
        fetchAvailableScreens()
      }
    } catch (error) {
      console.error('Failed to remove screen:', error)
    }
  }

  const addContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) return

    setAddingContent(true)
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset,
          duration: contentDuration
        })
      })

      if (response.ok) {
        setShowAddForm(false)
        setSelectedAsset('')
        setContentDuration(10)
        fetchGroupContent()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to add content:', error)
    } finally {
      setAddingContent(false)
    }
  }

  const removeContent = async (assetId: string) => {
    if (!confirm('Remove this content from the group? Split tiles will be deleted.')) return

    try {
      const response = await fetch(
        `/api/admin/screen-groups/${groupId}/content?assetId=${assetId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        fetchGroupContent()
      }
    } catch (error) {
      console.error('Failed to remove content:', error)
    }
  }

  const startEditDuration = (item: GroupPlaylistItem) => {
    setEditingDuration(item.id)
    setEditDurationValue(item.duration)
  }

  const cancelEditDuration = () => {
    setEditingDuration(null)
    setEditDurationValue(0)
  }

  const saveDuration = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: editDurationValue })
      })

      if (response.ok) {
        setEditingDuration(null)
        setEditDurationValue(0)
        fetchGroupContent()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to update duration:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = groupContent.findIndex(item => item.id === active.id)
      const newIndex = groupContent.findIndex(item => item.id === over?.id)

      const newContent = arrayMove(groupContent, oldIndex, newIndex)
      setGroupContent(newContent)

      // Update positions in database
      try {
        await Promise.all(
          newContent.map((item, index) =>
            fetch(`/api/admin/screen-groups/${groupId}/content/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ position: index + 1 })
            })
          )
        )
      } catch (error) {
        console.error('Failed to update content order:', error)
        fetchGroupContent() // Revert on error
      }
    }
  }

  const getStatus = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return 'Never connected'
    const now = new Date()
    const heartbeat = new Date(lastHeartbeat)
    const diffMinutes = (now.getTime() - heartbeat.getTime()) / (1000 * 60)
    if (diffMinutes < 2) return 'Online'
    if (diffMinutes < 10) return 'Recently seen'
    return 'Offline'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'text-green-600'
      case 'Recently seen': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  if (status === "loading" || loading) return <div>Loading...</div>
  if (!session || !group) return null

  const layoutInfo = LAYOUT_INFO[group.layout]
  const positions = Array.from({ length: layoutInfo.positions }, (_, i) => i)
  const allScreensAssigned = group.members.length === layoutInfo.positions

  const getMemberAtPosition = (pos: number) => {
    return group.members.find(m => m.position === pos)
  }

  const getAvailableForPosition = (pos: number) => {
    const currentMember = getMemberAtPosition(pos)
    const currentlyAssigned = group.members.map(m => m.screen_id)
    return availableScreens.filter(
      s => !currentlyAssigned.includes(s.screen_id) || s.screen_id === currentMember?.screen_id
    )
  }

  // Filter out assets that are already in the group and tile assets
  const availableAssets = allAssets.filter(
    a => !groupContent.some(gc => gc.original_asset_id === a.asset_id) &&
         !a.filename.startsWith('tile-')
  )

  const selectedAssetData = allAssets.find(a => a.asset_id === selectedAsset)

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <button
            onClick={() => router.push('/screen-groups')}
            className="text-blue-500 hover:underline"
          >
            &larr; Back to Groups
          </button>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          Edit Details
        </button>
      </div>

      {editing && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Edit Group Details</h2>
          <form onSubmit={updateGroup} className="grid grid-cols-1 gap-4">
            <input
              type="text"
              placeholder="Group Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="p-2 border rounded"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Screen Assignment Section */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Screen Layout: {layoutInfo.label}</h2>
            {group.description && (
              <p className="text-gray-600">{group.description}</p>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {group.members.length}/{layoutInfo.positions} screens assigned
          </span>
        </div>

        <div className={`flex ${layoutInfo.isVertical ? 'flex-col items-center' : 'flex-row justify-center'} gap-4 my-8`}>
          {positions.map((pos) => {
            const member = getMemberAtPosition(pos)
            const availableForPos = getAvailableForPosition(pos)
            const memberStatus = member ? getStatus(member.last_heartbeat) : null

            return (
              <div
                key={pos}
                className={`${layoutInfo.isVertical ? 'w-48' : 'w-64'} border-2 rounded-lg p-4 ${
                  member ? 'border-blue-300 bg-blue-50' : 'border-dashed border-gray-300 bg-gray-50'
                }`}
              >
                <div className="text-center mb-3">
                  <span className="text-xs text-gray-500 uppercase">Position {pos}</span>
                </div>

                {member ? (
                  <div className="text-center">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.location || 'No location'}</p>
                    <p className="text-sm text-gray-400">{member.resolution}</p>
                    <p className={`text-sm mt-1 ${getStatusColor(memberStatus!)}`}>
                      {memberStatus}
                    </p>
                    <button
                      onClick={() => removeScreen(member.screen_id)}
                      className="mt-3 text-red-500 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      onChange={(e) => assignScreen(pos, e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a screen...</option>
                      {availableForPos.map(screen => (
                        <option key={screen.screen_id} value={screen.screen_id}>
                          {screen.name} ({screen.location || 'No location'})
                        </option>
                      ))}
                    </select>
                    {availableForPos.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        No available screens
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Group Content Section */}
      <div className="bg-white rounded shadow mb-6">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Group Content ({groupContent.length} items)</h2>
          <button
            onClick={() => setShowAddForm(true)}
            disabled={!allScreensAssigned}
            className={`px-4 py-2 rounded ${
              allScreensAssigned
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Add Content
          </button>
        </div>

        {!allScreensAssigned && (
          <p className="text-yellow-600 text-sm p-4 border-b bg-yellow-50">
            Assign all {layoutInfo.positions} screens before adding content.
          </p>
        )}

        {showAddForm && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">Add Content to Group</h3>
            <form onSubmit={addContent} className="space-y-4">
              <div>
                <label className="block mb-2">Select Asset:</label>
                <div className="relative asset-dropdown">
                  <button
                    type="button"
                    onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                    className="w-full p-2 border rounded bg-white text-left flex items-center justify-between"
                  >
                    {selectedAssetData ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {selectedAssetData.type === 'image' ? (
                            <img
                              src={selectedAssetData.url}
                              alt={selectedAssetData.display_name || selectedAssetData.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">&#9658;</span>
                          )}
                        </div>
                        <span className="truncate">{selectedAssetData.display_name || selectedAssetData.filename}</span>
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
                      {availableAssets.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No assets available. <a href="/assets" className="text-blue-500 hover:underline">Upload some content</a> first.
                        </div>
                      ) : (
                        availableAssets.map((asset) => (
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
                                <span className="text-gray-400 text-lg">&#9658;</span>
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

              {selectedAssetData && selectedAssetData.type === 'image' && (
                <div className="text-center py-4 bg-white rounded border">
                  <p className="text-sm text-gray-500 mb-2">
                    This image will be split across {layoutInfo.positions} screens:
                  </p>
                  <SplitPreview url={selectedAssetData.url} layout={group.layout} size="large" />
                </div>
              )}

              {selectedAssetData && selectedAssetData.type === 'video' && (
                <div className="text-center py-4 bg-white rounded border">
                  <p className="text-sm text-gray-500">
                    This video will play on all {layoutInfo.positions} screens simultaneously.
                  </p>
                </div>
              )}

              <div>
                <label className="block mb-2">Duration (seconds):</label>
                <input
                  type="number"
                  value={contentDuration}
                  onChange={(e) => setContentDuration(parseInt(e.target.value) || 10)}
                  min={1}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!selectedAsset || addingContent}
                  className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                >
                  {addingContent ? 'Adding...' : 'Add to Group'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setSelectedAsset('')
                    setContentDuration(10)
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

        {groupContent.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No content in playlist. Add some content to get started.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={groupContent.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y">
                {groupContent.map((item, index) => (
                  <SortableContentItem
                    key={item.id}
                    item={item}
                    index={index}
                    layout={group.layout}
                    editingDuration={editingDuration}
                    editDurationValue={editDurationValue}
                    setEditDurationValue={setEditDurationValue}
                    onStartEdit={startEditDuration}
                    onSaveDuration={saveDuration}
                    onCancelEdit={cancelEditDuration}
                    onRemove={removeContent}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Available Screens Section */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Available Screens</h2>
        {availableScreens.length === 0 ? (
          <p className="text-gray-500">All screens are assigned to groups.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableScreens.filter(s => !group.members.find(m => m.screen_id === s.screen_id)).map(screen => {
              const screenStatus = getStatus(screen.last_heartbeat)
              return (
                <div key={screen.screen_id} className="border rounded p-3">
                  <p className="font-medium">{screen.name}</p>
                  <p className="text-sm text-gray-500">{screen.location || 'No location'}</p>
                  <p className="text-sm text-gray-400">{screen.resolution}</p>
                  <p className={`text-sm ${getStatusColor(screenStatus)}`}>{screenStatus}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
