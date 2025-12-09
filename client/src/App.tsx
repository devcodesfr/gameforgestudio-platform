import { useState, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router, Route, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import AssetStorePage from "@/pages/asset-store";
import AssetDetailPage from "@/pages/asset-detail";
import BundleDetailPage from "@/pages/bundle-detail";
import GameEnginesPage from "@/pages/game-engines";
import CartPage from "@/pages/cart";
import Buttonz from "@/pages/buttonz";
import DistributionPage from "@/pages/distribution";
import AnalyticsPage from "@/pages/analytics";
import CommunityPage from "@/pages/community";
import CalendarPage from "@/pages/calendar";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import LibraryPage from "@/pages/library";
import StorePage from "@/pages/store";
import GameDetailPage from "@/pages/game-detail";
import { Card } from "@/components/ui/card";

// Placeholder components for other sections
const PlaceholderSection = ({ title, description, sidebarCollapsed }: { title: string; description: string; sidebarCollapsed: boolean }) => (
  <div className="min-h-screen bg-background">
    <div className={`transition-all duration-300 ${
      sidebarCollapsed ? 'ml-16' : 'ml-64'
    }`}>
      <div className="p-8 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-title`}>{title}</h1>
        <p className="text-muted-foreground" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-subtitle`}>{description}</p>
      </div>
      <div className="p-8">
        <Card className="p-8 text-center" data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}-placeholder`}>
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground">
            This section is being built with advanced {title.toLowerCase()} features.
          </p>
        </Card>
      </div>
    </div>
  </div>
);

function App() {
  // Use hash-based routing on Replit (and optionally via env flag) so
  // client-side navigations don't rely on server-side route handling.
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const shouldUseHashRouting =
    typeof window !== "undefined" &&
    (Boolean(env.REPL_ID) || env.VITE_ROUTER_MODE === "hash");

  const routerHook = shouldUseHashRouting ? useHashLocation : undefined;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router hook={routerHook}>
            <div className="min-h-screen bg-background text-foreground">
              <ErrorBoundary>
                <AppWithSidebar />
              </ErrorBoundary>
            </div>
          </Router>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppWithSidebar() {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const redirectAttemptRef = useRef(0);
  const lastLocationRef = useRef(location);
  
  const userQuery = useCurrentUser();
  
  // Apply theme based on user role with error handling
  useEffect(() => {
    try {
      if (userQuery.data && userQuery.data.role === 'regular') {
        document.documentElement.classList.add('regular-user-theme');
      } else {
        document.documentElement.classList.remove('regular-user-theme');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, [userQuery.data?.role]);
  
  // Redirect unauthenticated users to login with loop prevention
  useEffect(() => {
    try {
      // Reset redirect counter if location changed successfully
      if (lastLocationRef.current !== location) {
        redirectAttemptRef.current = 0;
        lastLocationRef.current = location;
      }
      
      // Prevent infinite redirect loops
      if (redirectAttemptRef.current > 5) {
        console.error('Too many redirect attempts, stopping to prevent loop');
        return;
      }
      
      if (userQuery.isError && location !== '/login' && location !== '/signup') {
        console.debug('User not authenticated, redirecting to login');
        redirectAttemptRef.current += 1;
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error in authentication redirect:', error);
    }
  }, [userQuery.isError, location, setLocation]);
  
  // Public routes that don't need authentication
  if (location === '/login') {
    return <LoginPage />;
  }
  
  if (location === '/signup') {
    return <SignupPage />;
  }
  
  // Show loading while checking authentication
  if (userQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Handle full-screen standalone Buttonz outside sidebar layout
  if (location === '/buttonz') {
    return <Buttonz standalone={true} />;
  }
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Map routes to sections for sidebar highlighting
  const getActiveSection = (path: string) => {
    if (path === "/" || path === "/dashboard") return "dashboard";
    if (path.startsWith("/projects")) return "projects";
    if (path.startsWith("/game-engines")) return "game-engines";
    if (path.startsWith("/asset-store")) return "asset-store";
    if (path.startsWith("/asset/")) return "asset-store"; // Asset detail is part of asset store
    if (path.startsWith("/bundle/")) return "asset-store"; // Bundle detail is part of asset store
    if (path.startsWith("/cart")) return "asset-store"; // Cart is part of asset store
    if (path.startsWith("/collaboration")) return "collaboration";
    if (path.startsWith("/distribution")) return "distribution";
    if (path.startsWith("/analytics")) return "analytics";
    if (path.startsWith("/community")) return "community";
    if (path.startsWith("/calendar")) return "calendar";
    if (path.startsWith("/store")) return "store";
    if (path.startsWith("/library")) return "library";
    if (path.startsWith("/profile")) return "profile";
    if (path.startsWith("/settings")) return "settings";
    return "dashboard";
  };

  const activeSection = getActiveSection(location);

  return (
    <>
      <Sidebar activeSection={activeSection} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <Route path="/">
        <Dashboard sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/dashboard">
        <Dashboard sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/projects">
        <ProjectsPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/game-engines">
        <GameEnginesPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/asset-store">
        <AssetStorePage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/asset/:assetId">
        <AssetDetailPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/bundle/:bundleId">
        <BundleDetailPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/cart">
        <CartPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/collaboration">
        <Buttonz sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/distribution">
        <DistributionPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/analytics">
        <AnalyticsPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/community">
        <CommunityPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/calendar">
        <CalendarPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/library">
        <LibraryPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/store">
        <StorePage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/game/:gameId">
        <GameDetailPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/profile">
        <ProfilePage sidebarCollapsed={sidebarCollapsed} />
      </Route>
      <Route path="/settings">
        <SettingsPage sidebarCollapsed={sidebarCollapsed} />
      </Route>
    </>
  );
}

export default App;
