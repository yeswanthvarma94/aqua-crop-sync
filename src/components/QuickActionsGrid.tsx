import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, DatabaseZap, FileText, FlaskConical, Recycle, Scale, ShieldCheck, ShoppingCart, Users } from "lucide-react";

const items = [
  { key: "locations", label: "Locations", icon: Building2 },
  { key: "tanks", label: "Tanks", icon: DatabaseZap },
  { key: "stock", label: "Stock", icon: ShoppingCart },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "accounts", label: "Accounts", icon: Scale },
  { key: "calculators", label: "Calculators", icon: FlaskConical },
  { key: "approvals", label: "Approvals", icon: ShieldCheck },
  { key: "recycle", label: "Recycle Bin", icon: Recycle },
  { key: "subscriptions", label: "Subscriptions", icon: Users },
] as const;

const QuickActionsGrid = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {items.map(({ key, label, icon: Icon }) => (
            <Button key={key} variant="secondary" className="h-20 flex flex-col items-center justify-center gap-2">
              <Icon size={18} />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsGrid;
