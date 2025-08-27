import HeaderPickers from "@/components/HeaderPickers";
import SyncBadge from "@/components/SyncBadge";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import TabBar from "@/components/TabBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIST, nowIST } from "@/lib/time";
import LanguageSelector from "@/components/LanguageSelector";
import LowStockAlert from "@/components/LowStockAlert";
import { useAuth } from "@/state/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authStatus, setAuthStatus] = useState<string>("checking");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setAuthStatus("authenticated");
        } else {
          setAuthStatus("unauthenticated");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setAuthStatus("error");
      }
    };
    
    checkAuth();
  }, []);

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to be authenticated to use CRUD operations (create, edit, delete).
            </p>
            <Button onClick={() => navigate("/test-auth")} className="w-full">
              Go to Authentication
            </Button>
            <p className="text-xs text-muted-foreground">
              Current status: No Supabase session detected
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 glass-header">
        <div className="max-w-screen-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="animate-fade-in">
            <h1 className="text-xl font-bold text-gradient">AquaLedger</h1>
            <p className="text-xs text-muted-foreground">
              {formatIST(nowIST(), "EEE, dd MMM yyyy • p zzz")}
            </p>
          </div>
          <div className="flex items-center gap-3 animate-fade-in">
            <LanguageSelector />
            <SyncBadge state="queued" />
          </div>
        </div>
        <div className="max-w-screen-md mx-auto px-4 pb-4">
          <HeaderPickers />
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-6 space-y-6">
        {/* Quick actions */}
        <div className="animate-bounce-in">
          <QuickActionsGrid />
        </div>

        {/* Low Stock Alert */}
        <LowStockAlert />
      </main>

      <TabBar />
    </div>
  );
};

export default Index;
