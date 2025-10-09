import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TabBar from "./components/TabBar";
import Index from "./pages/Index";
import Feeding from "./pages/Feeding";
import Materials from "./pages/Materials";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { SelectionProvider } from "@/state/SelectionContext";
import { LoadingProvider, useLoading } from "@/contexts/LoadingContext";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import Farms from "./pages/Farms";
import Tanks from "./pages/Tanks";
import TankDetail from "./pages/TankDetail";
import Stocks from "./pages/Stocks";
import TankFeeding from "./pages/TankFeeding";
import Reports from "./pages/Reports";
import Auth from "./pages/Auth";
import TestAuth from "./pages/TestAuth";
import RecycleBin from "./pages/RecycleBin";
import Calculators from "./pages/Calculators";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <div className="relative">
      {children}
      <TabBar />
    </div>
  );
};

const PublicOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

// Loading wrapper component
const LoadingWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading } = useLoading();
  
  return (
    <>
      {children}
      <LoadingOverlay 
        isVisible={isLoading('initial-load')} 
        message="Loading your data..."
      />
      <LoadingOverlay 
        isVisible={isLoading('sync')} 
        message="Syncing data..."
      />
    </>
  );
};

// OAuth redirect handler component
const OAuthHandler: React.FC = () => {
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        console.log('Checking for OAuth session in URL...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('OAuth session error:', error);
          return;
        }
        
        if (data.session) {
          console.log('OAuth session found, user authenticated:', data.session.user.email);
          // The AuthProvider will handle the rest
        } else {
          console.log('No OAuth session found in URL');
        }
      } catch (error) {
        console.error('Error handling OAuth redirect:', error);
      }
    };

    // Check for OAuth redirect on app load
    handleOAuthRedirect();
  }, []);

  return null;
};
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SelectionProvider>
            <LoadingProvider>
              <LoadingWrapper>
                <OAuthHandler />
                <Routes>
              <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
              <Route path="/test-auth" element={<TestAuth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/feeding" element={<ProtectedRoute><Feeding /></ProtectedRoute>} />
              <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/farms" element={<ProtectedRoute><Farms /></ProtectedRoute>} />
              <Route path="/farms/:farmId/tanks" element={<ProtectedRoute><Tanks /></ProtectedRoute>} />
              <Route path="/farms/:farmId/tanks/:tankId" element={<ProtectedRoute><TankDetail /></ProtectedRoute>} />
              <Route path="/farms/:farmId/tanks/:tankId/feeding" element={<ProtectedRoute><TankFeeding /></ProtectedRoute>} />
              <Route path="/farms/:farmId/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/recycle-bin" element={<ProtectedRoute><RecycleBin /></ProtectedRoute>} />
              <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
                </Routes>
              </LoadingWrapper>
            </LoadingProvider>
          </SelectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
