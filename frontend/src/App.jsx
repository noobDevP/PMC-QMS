import { Routes, Route, Navigate } from 'react-router-dom'
import TvViewer from './pages/TvViewer'
import TabletKiosk from './pages/TabletKiosk'
import TellerDesk from './pages/TellerDesk'
import AdminDesk from './pages/AdminDesk'
import Login from './pages/Login'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Routes>
        <Route path="/" element={<Navigate to="/tv/1" replace />} />
        <Route path="/tv" element={<Navigate to="/tv/1" replace />} />
        <Route path="/tv/:tvId" element={<TvViewer />} />
        <Route path="/kiosk" element={<TabletKiosk />} />
        <Route path="/login" element={<Login />} />
        <Route path="/teller" element={<TellerDesk />} />
        <Route path="/admin" element={<AdminDesk />} />
      </Routes>
    </div>
  )
}

export default App
