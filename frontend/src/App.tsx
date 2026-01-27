import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Lazy load pages
const Login = lazy(() => import('./pages/auth/login'))
const Register = lazy(() => import('./pages/auth/register'))
const IndexLayout = lazy(() => import('./pages/index'))
const Dashboard = lazy(() => import('./pages/index/index'))
const Domains = lazy(() => import('./pages/index/domains/index'))
const DomainDetail = lazy(() => import('./pages/index/domains/[id]'))
const Alerts = lazy(() => import('./pages/index/alerts'))
const Organizations = lazy(() => import('./pages/index/organizations'))
const Settings = lazy(() => import('./pages/index/settings'))
const PublicStatus = lazy(() => import('./pages/status/[orgSlug]'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<IndexLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="domains" element={<Domains />} />
          <Route path="domains/:id" element={<DomainDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="settings" element={<Settings />} />
        </Route> 
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/status/:orgSlug" element={<PublicStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
