import { Routes, Route } from "react-router-dom";
import { Toaster } from "sileo";
import { Agentation } from "agentation";
import Home from "./pages/Home.tsx";
import History from "./pages/History.tsx";
import Settings from "./pages/Settings.tsx";
import Layout from "./components/Layout.tsx";
import KickHome from "./pages/tools/kick-counter/KickHome.tsx";
import KickSession from "./pages/tools/kick-counter/KickSession.tsx";
import ContractionHome from "./pages/tools/contraction-timer/ContractionHome.tsx";
import ContractionSession from "./pages/tools/contraction-timer/ContractionSession.tsx";
import HospitalBagHome from "./pages/tools/hospital-bag/HospitalBagHome.tsx";
import FeedingLogHome from "./pages/tools/feeding-log/FeedingLogHome.tsx";
import FeedingSession from "./pages/tools/feeding-log/FeedingSession.tsx";
import BottleEntry from "./pages/tools/feeding-log/BottleEntry.tsx";
import RequireAuth from "./components/guards/RequireAuth.tsx";
import RequireOnboarding from "./components/guards/RequireOnboarding.tsx";
import Onboarding from "./pages/onboarding/Onboarding.tsx";
import Login from "./pages/auth/Login.tsx";
import Register from "./pages/auth/Register.tsx";
import InviteBind from "./pages/invite/InviteBind.tsx";

export default function App() {
  return (
    <>
      <Toaster position="top-center" options={{ fill: "var(--sileo-fill)" }} />
      {import.meta.env.DEV && <Agentation />}
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/invite/bind" element={<InviteBind />} />

        <Route element={<RequireOnboarding />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tools/kick-counter" element={<KickHome />} />
            <Route
              path="/tools/contraction-timer"
              element={<ContractionHome />}
            />
            <Route path="/tools/hospital-bag" element={<HospitalBagHome />} />
            <Route path="/tools/feeding-log" element={<FeedingLogHome />} />
          </Route>
          <Route
            path="/tools/kick-counter/session/:sessionId"
            element={<KickSession />}
          />
          <Route
            path="/tools/contraction-timer/session/:sessionId"
            element={<ContractionSession />}
          />
          <Route
            path="/tools/feeding-log/session/:recordId"
            element={<FeedingSession />}
          />
          <Route path="/tools/feeding-log/bottle" element={<BottleEntry />} />
        </Route>
      </Routes>
    </>
  );
}
