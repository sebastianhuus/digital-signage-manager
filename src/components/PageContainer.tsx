export default function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  )
}
