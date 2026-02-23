import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sileo'
import { Agentation } from 'agentation'
import Home from './pages/Home.tsx'
import History from './pages/History.tsx'
import Settings from './pages/Settings.tsx'
import Layout from './components/Layout.tsx'
import KickHome from './pages/tools/kick-counter/KickHome.tsx'
import KickSession from './pages/tools/kick-counter/KickSession.tsx'
import ContractionHome from './pages/tools/contraction-timer/ContractionHome.tsx'
import ContractionSession from './pages/tools/contraction-timer/ContractionSession.tsx'
import HospitalBagHome from './pages/tools/hospital-bag/HospitalBagHome.tsx'

export default function App() {
  return (
    <>
    <Toaster position="top-center" />
    {import.meta.env.DEV && <Agentation />}
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tools/kick-counter" element={<KickHome />} />
        <Route path="/tools/contraction-timer" element={<ContractionHome />} />
        <Route path="/tools/hospital-bag" element={<HospitalBagHome />} />
      </Route>
      <Route path="/tools/kick-counter/session" element={<KickSession />} />
      <Route path="/tools/contraction-timer/session/:sessionId" element={<ContractionSession />} />
    </Routes>
    </>
  )
}
