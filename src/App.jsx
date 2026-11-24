import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { RoleProvider } from "./context/RoleContext";
import { RegionProvider } from "./context/RegionContext";

// Route-level code splitting: heavy pages (dashboards, details)
// load on demand instead of bloating the initial bundle.
const Login = lazy(() => import("./pages/Login"));
const Homepage = lazy(() => import("./pages/Homepage"));
const Register = lazy(() => import("./pages/Register"));
const Motorcycles = lazy(() => import("./pages/Motorcycles"));
const MotorcycleDetails = lazy(() => import("./pages/MotorcycleDetails"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const AIAdvisor = lazy(() => import("./pages/AIAdvisor"));
const AIPlan = lazy(() => import("./pages/AIPlan"));
const Compare = lazy(() => import("./pages/Compare"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const LatestUpdates = lazy(() => import("./pages/LatestUpdates"));
const UpdateDetail = lazy(() => import("./pages/UpdateDetail"));

const RouteFallback = () => (
  <div className="min-h-screen bg-[#070707] px-5 pt-6 text-white" role="status" aria-label="Loading page">
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="h-12 rounded-xl border-b border-white/5 bg-white/[0.025]" />
      <div className="mt-12 h-8 w-56 rounded-lg bg-white/[0.06]" />
      <div className="mt-4 h-4 w-80 max-w-full rounded bg-white/[0.04]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-72 rounded-2xl border border-white/5 bg-white/[0.025]" />)}
      </div>
    </div>
  </div>
);

const PAGE_META = [
  ["/", "MOTOAI — Find Your Perfect Ride", "Discover motorcycles, compare specifications and regional prices, and find the right ride with MOTOAI."],
  ["/motorcycles", "Explore Motorcycles | MOTOAI", "Browse, search and compare motorcycles with specifications and regional on-road estimates."],
  ["/compare", "Compare Motorcycles | MOTOAI", "Compare motorcycle prices, specifications, features and reviews side by side."],
  ["/ai-advisor", "MotoMind AI Advisor | MOTOAI", "Get personalized motorcycle recommendations from MotoMind AI."],
  ["/ai-plan", "AI Riding Plan | MOTOAI", "Create a personalized motorcycle riding and ownership plan."],
  ["/contact", "Contact MOTOAI", "Contact the MOTOAI team for help with motorcycle discovery and marketplace questions."],
  ["/updates", "Latest Motorcycle Updates | MOTOAI", "Read the latest motorcycle launches, news and marketplace updates."],
  ["/login", "Sign In | MOTOAI", "Sign in to your MOTOAI account."],
  ["/register", "Create Account | MOTOAI", "Create your MOTOAI account to save motorcycles and manage your marketplace activity."],
];

function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = PAGE_META.find(([path]) => path === pathname)
      || (pathname.startsWith("/motorcycles/")
        ? ["", "Motorcycle Details | MOTOAI", "View motorcycle specifications, regional pricing, variants and reviews."]
        : pathname.startsWith("/updates/")
          ? ["", "Motorcycle Update | MOTOAI", "Read motorcycle news and launch details from MOTOAI."]
          : ["", "MOTOAI — Find Your Perfect Ride", PAGE_META[0][2]]);
    document.title = meta[1];
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", meta[2]);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RegionProvider>
      <RoleProvider>
        <RouteMetadata />
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
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/updates" element={<LatestUpdates />} />
          <Route path="/updates/:slug" element={<UpdateDetail />} />
          <Route path="/checkout/:id" element={
            <ProtectedRoute allowedRoles={["user", "customer", "provider", "admin"]}>
              <Checkout />
            </ProtectedRoute>
          } />
          <Route path="/order-success/:id" element={
            <ProtectedRoute allowedRoles={["user", "customer", "provider", "admin"]}>
              <OrderSuccess />
            </ProtectedRoute>
          } />

          {/* Customer / User Panel — authenticated customers only */}
          {[
            ["dashboard", "dashboard"],
            ["profile", "profile"],
            ["chats", "chats"],
            ["plan", "plan"],
            ["favorites", "favorites"],
            ["comparisons", "comparisons"],
            ["subscriptions", "subscriptions"],
            ["orders", "orders"],
            ["reviews", "reviews"],
            ["enquiries", "enquiries"],
            ["test-rides", "test-rides"],
            ["notifications", "notifications"],
            ["settings", "settings"],
          ].map(([path, section]) => (
            <Route
              key={path}
              path={`/user/${path}`}
              element={
                <ProtectedRoute allowedRoles={["user", "customer", "provider", "admin"]}>
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
      </RoleProvider>
      </RegionProvider>
    </BrowserRouter>
  );
}

export default App;
