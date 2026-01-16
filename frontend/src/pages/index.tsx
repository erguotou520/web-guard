import { Navigate, Outlet } from 'react-router-dom'
import { NavigationWorking } from "@/components/Navigation-working";
import { useAuthStore } from "@/stores";

export default function Layout() {
  const { isAuthenticated } = useAuthStore()
  console.log('isAuthenticated', isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', paddingTop: '64px' }}>
      <NavigationWorking />
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        <Outlet />
      </main>
    </div>
  )
}