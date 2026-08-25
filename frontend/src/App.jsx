import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'
import Layout from './components/Layout'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import Dashboard from './pages/Dashboard'
import Drives from './pages/Drives'
import DriveDetail from './pages/DriveDetail'
import Login from './pages/Login'
import Notices from './pages/Notices'
import PortalApplications from './pages/PortalApplications'
import PortalDrives from './pages/PortalDrives'
import PortalHome from './pages/PortalHome'
import PortalProfile from './pages/PortalProfile'
import Students from './pages/Students'

/* Redirect a freshly logged-in user to the right hub by role. */

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // Restore the session on first load
  useEffect(() => {
    api.me().then((d) => setUser(d.user)).catch(() => setUser(null)).finally(() => setChecking(false))
  }, [])

  if (checking) {
    return <div className="grid min-h-screen place-items-center text-ink-low">Loading…</div>
  }

  const isStudent = user?.role === 'student'
  const homePath = isStudent ? '/portal' : '/dashboard'

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={homePath} replace /> : <Login onLogin={setUser} />}
        />
        <Route
          element={user ? <Layout user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}
        >
          {/* admin routes */}
          {!isStudent && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<Students />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/drives" element={<Drives />} />
              <Route path="/drives/:id" element={<DriveDetail />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetail />} />
              <Route path="/notices" element={<Notices />} />
            </>
          )}

          {/* student portal routes */}
          {isStudent && (
            <>
              <Route path="/portal" element={<PortalHome />} />
              <Route path="/portal/drives" element={<PortalDrives />} />
              <Route path="/portal/applications" element={<PortalApplications />} />
              <Route path="/portal/profile" element={<PortalProfile />} />
            </>
          )}
        </Route>
        <Route path="*" element={<Navigate to={user ? homePath : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
