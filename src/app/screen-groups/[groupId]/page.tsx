'use client'

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import PageContainer from "@/components/PageContainer"

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
    ? 'w-32 h-20'
    : 'max-w-full max-h-48'

  const labelSize = size === 'small' ? 'text-[10px] px-1' : 'text-xs px-2 py-1'

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
  const [showAddContent, setShowAddContent] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [contentDuration, setContentDuration] = useState(10)
  const [addingContent, setAddingContent] = useState(false)

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

  const addContent = async () => {
    if (!selectedAsset) return

    setAddingContent(true)
    try {
      const response = await fetch(`/api/admin/screen-groups/${groupId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAsset.asset_id,
          duration: contentDuration
        })
      })

      if (response.ok) {
        setShowAddContent(false)
        setSelectedAsset(null)
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
      <div className="bg-white p-6 rounded shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Group Content</h2>
          <button
            onClick={() => setShowAddContent(true)}
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
          <p className="text-yellow-600 text-sm mb-4">
            Assign all {layoutInfo.positions} screens before adding content.
          </p>
        )}

        {groupContent.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No content assigned to this group yet.
          </p>
        ) : (
          <div className="space-y-3">
            {groupContent.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                {item.type === 'image' ? (
                  <SplitPreview url={item.url} layout={group.layout} size="small" />
                ) : (
                  <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-2xl">&#9658;</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.display_name || item.filename}</p>
                  <p className="text-sm text-gray-500">
                    {item.type === 'video' ? 'Video (same on all screens)' : 'Image (split across screens)'}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {item.duration}s
                </div>
                <button
                  onClick={() => removeContent(item.original_asset_id)}
                  className="text-red-500 hover:underline text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add Content to Group</h2>

            {selectedAsset ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium mb-2">{selectedAsset.display_name || selectedAsset.filename}</h3>
                  {selectedAsset.type === 'image' ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        This image will be split across {layoutInfo.positions} screens:
                      </p>
                      <SplitPreview url={selectedAsset.url} layout={group.layout} />
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">
                        This video will play on all {layoutInfo.positions} screens simultaneously.
                      </p>
                      <video
                        src={selectedAsset.url}
                        className="max-w-full max-h-48 rounded mx-auto"
                        controls
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
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
                    onClick={addContent}
                    disabled={addingContent}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                  >
                    {addingContent ? 'Adding...' : 'Add to Group'}
                  </button>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">Select an asset to add:</p>

                {availableAssets.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No assets available. Upload some assets first.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                    {availableAssets.map((asset) => (
                      <div
                        key={asset.asset_id}
                        onClick={() => setSelectedAsset(asset)}
                        className="border rounded p-2 cursor-pointer hover:border-blue-500 hover:bg-blue-50"
                      >
                        {asset.type === 'image' ? (
                          <img
                            src={asset.url}
                            alt={asset.display_name || asset.filename}
                            className="w-full h-20 object-cover rounded mb-1"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-200 rounded mb-1 flex items-center justify-center">
                            <span className="text-gray-500 text-2xl">&#9658;</span>
                          </div>
                        )}
                        <p className="text-xs truncate">{asset.display_name || asset.filename}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowAddContent(false)
                setSelectedAsset(null)
              }}
              className="mt-4 w-full bg-gray-200 text-gray-700 px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
