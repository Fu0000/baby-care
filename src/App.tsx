import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Session from './pages/Session.tsx'
import History from './pages/History.tsx'
import Settings from './pages/Settings.tsx'
import Layout from './components/Layout.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/session" element={<Session />} />
    </Routes>
  )
}
