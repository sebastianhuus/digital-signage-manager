'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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

const LAYOUT_OPTIONS = [
  { value: '3x1', label: '3x1 (3 Landscape)', positions: 3 },
  { value: '1x2', label: '1x2 (2 Portrait)', positions: 2 },
]

function LayoutPreview({ layout, members }: { layout: string; members: ScreenMember[] }) {
  const positions = layout === '3x1' ? 3 : 2
  const isVertical = layout === '1x2'

  const getMemberAtPosition = (pos: number) => {
    return members.find(m => m.position === pos)
  }

  const getStatus = (lastHeartbeat: string | null) => {
    if (!lastHeartbeat) return 'offline'
    const now = new Date()
    const heartbeat = new Date(lastHeartbeat)
    const diffMinutes = (now.getTime() - heartbeat.getTime()) / (1000 * 60)
    if (diffMinutes < 2) return 'online'
    if (diffMinutes < 10) return 'recent'
    return 'offline'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 border-green-400'
      case 'recent': return 'bg-yellow-100 border-yellow-400'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-1`}>
      {Array.from({ length: positions }).map((_, i) => {
        const member = getMemberAtPosition(i)
        const status = member ? getStatus(member.last_heartbeat) : 'empty'
        const colorClass = member ? getStatusColor(status) : 'bg-gray-50 border-gray-200 border-dashed'

        return (
          <div
            key={i}
            className={`${isVertical ? 'w-16 h-20' : 'w-20 h-12'} border-2 rounded flex items-center justify-center text-xs ${colorClass}`}
            title={member ? `${member.name} (${status})` : `Position ${i} - Empty`}
          >
            {member ? (
              <span className="truncate px-1">{member.name}</span>
            ) : (
              <span className="text-gray-400">{i}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ScreenGroupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<ScreenGroup[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGroup, setNewGroup] = useState({
    name: '',
    layout: '3x1',
    description: ''
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchGroups()
    }
  }, [session])

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/screen-groups')
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    }
  }

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/screen-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      })

      if (response.ok) {
        setNewGroup({ name: '', layout: '3x1', description: '' })
        setShowAddForm(false)
        fetchGroups()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to add group:', error)
    }
  }

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete this screen group? Screens will be unassigned but not deleted.')) return

    try {
      const response = await fetch(`/api/admin/screen-groups?groupId=${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchGroups()
      }
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Screen Groups</h1>
          <button
            onClick={() => router.push('/')}
            className="text-blue-500 hover:underline"
          >
            &larr; Home
          </button>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Group
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Screen Group</h2>
          <form onSubmit={addGroup} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Group Name (e.g., Lobby Display)"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="p-2 border rounded"
              required
            />
            <select
              value={newGroup.layout}
              onChange={(e) => setNewGroup({ ...newGroup, layout: e.target.value })}
              className="p-2 border rounded"
            >
              {LAYOUT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description (optional)"
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="p-2 border rounded col-span-2"
            />
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Create Group
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          <p>No screen groups yet.</p>
          <p className="text-sm mt-2">Create a group to manage multiple displays together.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const layoutInfo = LAYOUT_OPTIONS.find(l => l.value === group.layout)
            const assignedCount = group.members.length
            const totalPositions = layoutInfo?.positions || 0

            return (
              <div key={group.id} className="bg-white p-6 rounded shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-500">{layoutInfo?.label}</p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {assignedCount}/{totalPositions} screens
                  </span>
                </div>

                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}

                <div className="mb-4 flex justify-center">
                  <LayoutPreview layout={group.layout} members={group.members} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/screen-groups/${group.group_id}`)}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => deleteGroup(group.group_id)}
                    className="bg-red-500 text-white px-3 py-2 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
