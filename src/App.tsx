import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Feeding from "./pages/Feeding";
import Materials from "./pages/Materials";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { SelectionProvider } from "@/state/SelectionContext";
import Locations from "./pages/Locations";
import Tanks from "./pages/Tanks";
import TankDetail from "./pages/TankDetail";
import Stocks from "./pages/Stocks";
import TankFeeding from "./pages/TankFeeding";
import Reports from "./pages/Reports";
import Approvals from "./pages/Approvals";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SelectionProvider>
            <Routes>
              <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
              <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/feeding" element={<ProtectedRoute><Feeding /></ProtectedRoute>} />
              <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
              <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
              <Route path="/locations/:locationId/tanks" element={<ProtectedRoute><Tanks /></ProtectedRoute>} />
              <Route path="/locations/:locationId/tanks/:tankId" element={<ProtectedRoute><TankDetail /></ProtectedRoute>} />
              <Route path="/locations/:locationId/tanks/:tankId/feeding" element={<ProtectedRoute><TankFeeding /></ProtectedRoute>} />
              <Route path="/locations/:locationId/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
            </Routes>
          </SelectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
