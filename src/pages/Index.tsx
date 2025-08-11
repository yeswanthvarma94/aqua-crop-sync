import HeaderPickers from "@/components/HeaderPickers";
import SyncBadge from "@/components/SyncBadge";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import TabBar from "@/components/TabBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIST, nowIST } from "@/lib/time";

const Index = () => {
  const { user, accountId, hasRole } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      if (!accountId || !hasRole(["owner"])) return;
      const { data, error } = await supabase
        .from("pending_changes")
        .select("id", { count: "exact" })
        .eq("account_id", accountId)
        .eq("status", "pending");
      if (!error && data) setPendingCount(data.length);
    };
    loadPendingCount();
  }, [accountId, hasRole]);

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
        {hasRole(["owner"]) && pendingCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">
                      {pendingCount} change{pendingCount === 1 ? '' : 's'} need{pendingCount === 1 ? 's' : ''} approval
                    </p>
                    <p className="text-sm text-orange-600">
                      Review pending requests from team members
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/approvals")}>
                  Review
                  <Badge variant="secondary" className="ml-2">
                    {pendingCount}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Today at a glance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Feed due vs given, materials used, today's expenses, low-stock, pending approvals
          </CardContent>
        </Card>

        <QuickActionsGrid />

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