'use client'

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import PageContainer from "@/components/PageContainer"

// Get version at build time
const APP_VERSION = process.env.npm_package_version || '0.1.0'

function getVersionWithBuild(): string {
  // Add build info in development
  if (process.env.NODE_ENV === 'development') {
    const now = new Date()
    const buildTime = now.toISOString().slice(0, 16).replace('T', ' ')
    return `${APP_VERSION}-dev (${buildTime})`
  }
  
  return APP_VERSION
}

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
    <PageContainer>
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
        <div 
          onClick={() => router.push('/presets')}
          className="bg-white p-6 rounded shadow cursor-pointer hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-4">Presets</h2>
          <p className="text-gray-600">Reusable playlist templates</p>
        </div>
      </div>
      
      <footer className="mt-16 text-center text-gray-400 text-sm">
        Signage Manager v{getVersionWithBuild()}
      </footer>
    </PageContainer>
  )
}
