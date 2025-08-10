import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Feeding from "./pages/Feeding";
import Materials from "./pages/Materials";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/state/AuthContext";
import { SelectionProvider } from "@/state/SelectionContext";
import Locations from "./pages/Locations";
import Tanks from "./pages/Tanks";
import TankDetail from "./pages/TankDetail";
import Stocks from "./pages/Stocks";
import TankFeeding from "./pages/TankFeeding";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SelectionProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/feeding" element={<Feeding />} />
              <Route path="/materials" element={<Materials />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/:locationId/tanks" element={<Tanks />} />
              <Route path="/locations/:locationId/tanks/:tankId" element={<TankDetail />} />
              <Route path="/locations/:locationId/tanks/:tankId/feeding" element={<TankFeeding />} />
              <Route path="/locations/:locationId/stocks" element={<Stocks />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SelectionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
