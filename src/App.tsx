import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.tsx'
import History from './pages/History.tsx'
import Settings from './pages/Settings.tsx'
import Layout from './components/Layout.tsx'
import KickHome from './pages/tools/kick-counter/KickHome.tsx'
import KickSession from './pages/tools/kick-counter/KickSession.tsx'
import ContractionHome from './pages/tools/contraction-timer/ContractionHome.tsx'
import ContractionSession from './pages/tools/contraction-timer/ContractionSession.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tools/kick-counter" element={<KickHome />} />
        <Route path="/tools/contraction-timer" element={<ContractionHome />} />
      </Route>
      <Route path="/tools/kick-counter/session" element={<KickSession />} />
      <Route path="/tools/contraction-timer/session/:sessionId" element={<ContractionSession />} />
    </Routes>
  )
}
