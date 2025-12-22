'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import PageContainer from "@/components/PageContainer"

interface Screen {
  id: number
  screen_id: string
  name: string
  location: string
  resolution: string
  refresh_interval: number
  last_heartbeat: string | null
}

export default function ScreensPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [screens, setScreens] = useState<Screen[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newScreen, setNewScreen] = useState({
    screenId: '',
    name: '',
    location: '',
    resolution: '1920x1080',
    refreshInterval: 30
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchScreens()
    }
  }, [session])

  const fetchScreens = async () => {
    try {
      const response = await fetch('/api/admin/screens')
      const data = await response.json()
      setScreens(data)
    } catch (error) {
      console.error('Failed to fetch screens:', error)
    }
  }

  const addScreen = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScreen)
      })
      
      if (response.ok) {
        setNewScreen({ screenId: '', name: '', location: '', resolution: '1920x1080', refreshInterval: 30 })
        setShowAddForm(false)
        fetchScreens()
      } else {
        const error = await response.json()
        alert(error.error)
      }
    } catch (error) {
      console.error('Failed to add screen:', error)
    }
  }

  const deleteScreen = async (screenId: string) => {
    if (!confirm('Delete this screen?')) return
    
    try {
      const response = await fetch(`/api/admin/screens?screenId=${screenId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchScreens()
      }
    } catch (error) {
      console.error('Failed to delete screen:', error)
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

  if (status === "loading") return <div>Loading...</div>
  if (!session) return null

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Screens Management</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-500 hover:underline"
          >
            ← Home
          </button>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add Screen
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Screen</h2>
          <form onSubmit={addScreen} className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Screen ID (e.g., tv-3)"
              value={newScreen.screenId}
              onChange={(e) => setNewScreen({...newScreen, screenId: e.target.value})}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Display Name"
              value={newScreen.name}
              onChange={(e) => setNewScreen({...newScreen, name: e.target.value})}
              className="p-2 border rounded"
              required
            />
            <input
              type="text"
              placeholder="Location"
              value={newScreen.location}
              onChange={(e) => setNewScreen({...newScreen, location: e.target.value})}
              className="p-2 border rounded"
            />
            <select
              value={newScreen.resolution}
              onChange={(e) => setNewScreen({...newScreen, resolution: e.target.value})}
              className="p-2 border rounded"
            >
              <option value="1920x1080">1920x1080</option>
              <option value="1280x720">1280x720</option>
              <option value="3840x2160">3840x2160</option>
            </select>
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
                Add Screen
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

      <div className="bg-white rounded shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Screen ID</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Location</th>
              <th className="p-4 text-left">Resolution</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {screens.map((screen) => {
              const status = getStatus(screen.last_heartbeat)
              return (
                <tr key={screen.id} className="border-t">
                  <td className="p-4 font-mono">{screen.screen_id}</td>
                  <td className="p-4">{screen.name}</td>
                  <td className="p-4">{screen.location}</td>
                  <td className="p-4">{screen.resolution}</td>
                  <td className={`p-4 ${getStatusColor(status)}`}>{status}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => router.push(`/screens/${screen.screen_id}/playlist`)}
                      className="bg-blue-500 text-white px-3 py-1 rounded mr-2"
                    >
                      Manage
                    </button>
                    <button 
                      onClick={() => deleteScreen(screen.screen_id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  )
}
