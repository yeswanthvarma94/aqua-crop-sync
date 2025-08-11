import HeaderPickers from "@/components/HeaderPickers";
import SyncBadge from "@/components/SyncBadge";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import TabBar from "@/components/TabBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIST, nowIST } from "@/lib/time";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">AquaLedger</h1>
            <p className="text-xs text-muted-foreground">{formatIST(nowIST(), "EEE, dd MMM yyyy • p zzz")}</p>
          </div>
          <SyncBadge state="queued" />
        </div>
        <div className="max-w-screen-md mx-auto px-4 pb-3">
          <HeaderPickers />
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {/* Today summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today at a glance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Feed due vs given, materials used, today's expenses, low-stock
          </CardContent>
        </Card>

        {/* Quick actions */}
        <QuickActionsGrid />

        {/* Recent activity placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Last 10 events will appear here.
          </CardContent>
        </Card>
      </main>

      <TabBar />
    </div>
  );
};

export default Index;
