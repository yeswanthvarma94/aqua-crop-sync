import HeaderPickers from "@/components/HeaderPickers";
import SyncBadge from "@/components/SyncBadge";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import TabBar from "@/components/TabBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIST, nowIST } from "@/lib/time";
import LanguageSelector from "@/components/LanguageSelector";

const Index = () => {
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
        {/* Today summary - Hero card */}
        <Card className="glass-card animate-slide-up shadow-elegant">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-2 h-2 rounded-full bg-gradient-primary"></div>
              Today at a glance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Feed Status</p>
                <p>3 tanks due, 2 completed</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Expenses</p>
                <p>₹2,450 spent today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="animate-bounce-in">
          <QuickActionsGrid />
        </div>

        {/* Recent activity */}
        <Card className="glass-card animate-slide-up shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Tank A1 fed</p>
                  <p className="text-xs">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Material purchased</p>
                  <p className="text-xs">4 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <TabBar />
    </div>
  );
};

export default Index;
