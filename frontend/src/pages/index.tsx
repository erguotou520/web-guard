import { Navigate, Outlet } from 'react-router-dom'
import { Navigation } from "@/components/Navigation";
import { useAuthStore } from "@/stores";

export default function Layout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <Navigation />
      <main className="mx-auto max-w-[1400px] px-6">
        <Outlet />
      </main>
    </div>
  )
}