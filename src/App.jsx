import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "./pages/Homepage";
import ProtectedRoute from "./components/ProtectedRoute";

// Route-level code splitting: heavy pages (dashboards, details)
// load on demand instead of bloating the initial bundle.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Motorcycles = lazy(() => import("./pages/Motorcycles"));
const MotorcycleDetails = lazy(() => import("./pages/MotorcycleDetails"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const AIAdvisor = lazy(() => import("./pages/AIAdvisor"));
const AIPlan = lazy(() => import("./pages/AIPlan"));
const Compare = lazy(() => import("./pages/Compare"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));

const RouteFallback = () => (
  <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/motorcycles" element={<Motorcycles />} />
          <Route path="/motorcycles/:id" element={<MotorcycleDetails />} />
          {/* AI Advisor — page shows its own login gate for
              guests; backend still requires a valid JWT */}
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/ai-plan" element={<AIPlan />} />
          <Route path="/compare" element={<Compare />} />

          {/* Customer / User Panel — authenticated customers only */}
          {[
            ["dashboard", "dashboard"],
            ["profile", "profile"],
            ["chats", "chats"],
            ["plan", "plan"],
            ["favorites", "favorites"],
            ["comparisons", "comparisons"],
            ["subscriptions", "subscriptions"],
            ["notifications", "notifications"],
            ["settings", "settings"],
          ].map(([path, section]) => (
            <Route
              key={path}
              path={`/user/${path}`}
              element={
                <ProtectedRoute allowedRoles={["user", "customer"]}>
                  <UserDashboard section={section} />
                </ProtectedRoute>
              }
            />
          ))}

          {/* Protected Provider Route — providers and admins allowed */}
          <Route
            path="/provider"
            element={
              <ProtectedRoute allowedRoles={["provider", "admin"]}>
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
