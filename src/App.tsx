import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sileo";

const Home = lazy(() => import("./pages/Home.tsx"));
const History = lazy(() => import("./pages/History.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const Layout = lazy(() => import("./components/Layout.tsx"));
const KickHome = lazy(() => import("./pages/tools/kick-counter/KickHome.tsx"));
const KickSession = lazy(
  () => import("./pages/tools/kick-counter/KickSession.tsx"),
);
const ContractionHome = lazy(
  () => import("./pages/tools/contraction-timer/ContractionHome.tsx"),
);
const ContractionSession = lazy(
  () => import("./pages/tools/contraction-timer/ContractionSession.tsx"),
);
const HospitalBagHome = lazy(
  () => import("./pages/tools/hospital-bag/HospitalBagHome.tsx"),
);
const FeedingLogHome = lazy(
  () => import("./pages/tools/feeding-log/FeedingLogHome.tsx"),
);
const FeedingSession = lazy(
  () => import("./pages/tools/feeding-log/FeedingSession.tsx"),
);
const BottleEntry = lazy(
  () => import("./pages/tools/feeding-log/BottleEntry.tsx"),
);
const ParentChildPlay = lazy(
  () => import("./pages/tools/parent-child-play/ParentChildPlay.tsx"),
);
const ReminderCenter = lazy(
  () => import("./pages/tools/reminders/ReminderCenter.tsx"),
);
const RequireAuth = lazy(() => import("./components/guards/RequireAuth.tsx"));
const RequireOnboarding = lazy(
  () => import("./components/guards/RequireOnboarding.tsx"),
);
const Onboarding = lazy(() => import("./pages/onboarding/Onboarding.tsx"));
const Login = lazy(() => import("./pages/auth/Login.tsx"));
const Register = lazy(() => import("./pages/auth/Register.tsx"));
const InviteBind = lazy(() => import("./pages/invite/InviteBind.tsx"));
const AgentationDev = lazy(() =>
  import("agentation").then((module) => ({ default: module.Agentation })),
);

function RouteLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a2e] flex items-center justify-center">
      <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
        页面加载中…
      </p>
    </div>
  );
}

export default function App() {
  const enableAgentation =
    import.meta.env.DEV && import.meta.env.VITE_DISABLE_AGENTATION !== "1";

  return (
    <>
      <Toaster position="top-center" options={{ fill: "var(--sileo-fill)" }} />
      {enableAgentation && (
        <Suspense fallback={null}>
          <AgentationDev />
        </Suspense>
      )}
      <Suspense fallback={<RouteLoading />}>
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
              <Route path="/tools/reminders" element={<ReminderCenter />} />
              <Route
                path="/tools/parent-child-play"
                element={<ParentChildPlay />}
              />
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
      </Suspense>
    </>
  );
}
