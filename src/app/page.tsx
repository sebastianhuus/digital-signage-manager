'use client'

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") return <div>Loading...</div>

  if (!session) return null

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Signage Manager</h1>
        <button 
          onClick={() => signOut()} 
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Sign Out
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => router.push('/screens')}
          className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-4">Screens</h2>
          <p className="text-gray-600">Manage your digital displays</p>
        </div>
        <div 
          onClick={() => router.push('/assets')}
          className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-4">Assets</h2>
          <p className="text-gray-600">Upload and organize media</p>
        </div>
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Playlists</h2>
          <p className="text-gray-600">Create content schedules</p>
        </div>
      </div>
    </div>
  )
}
