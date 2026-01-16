import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Lazy load pages
const Test = lazy(() => import('./pages/test'))
const SimpleLogin = lazy(() => import('./pages/simple-login'))
const LoginWorking = lazy(() => import('./pages/auth/login-working'))
const RegisterWorking = lazy(() => import('./pages/auth/register-working'))
const IndexLayout = lazy(() => import('./pages/index'))
const Dashboard = lazy(() => import('./pages/index/dashboard-working'))
const Domains = lazy(() => import('./pages/index/domains/index-working'))
const DomainDetail = lazy(() => import('./pages/index/domains/[id]-working'))
const Alerts = lazy(() => import('./pages/index/alerts'))
const Organizations = lazy(() => import('./pages/index/organizations'))
const Settings = lazy(() => import('./pages/index/settings'))
const PublicStatus = lazy(() => import('./pages/status/[orgSlug]'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/test" element={<Test />} />
        <Route path="/simple-login" element={<SimpleLogin />} />
        <Route path="/" element={<IndexLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="domains" element={<Domains />} />
          <Route path="domains/:id" element={<DomainDetail />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="settings" element={<Settings />} />
        </Route> 
        <Route path="/auth/login-working" element={<LoginWorking />} />
        <Route path="/auth/register-working" element={<RegisterWorking />} />
        <Route path="/auth/login" element={<LoginWorking />} />
        <Route path="/auth/register" element={<RegisterWorking />} />
        <Route path="/status/:orgSlug" element={<PublicStatus />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
