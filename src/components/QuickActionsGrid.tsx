import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, DatabaseZap, FileText, FlaskConical, Recycle, Scale, ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelection } from "@/state/SelectionContext";
import { useTranslation } from "react-i18next";

const items = [
  { key: "locations", label: "Farms", icon: Building2 },
  { key: "tanks", label: "Tanks", icon: DatabaseZap },
  { key: "stock", label: "Stock", icon: ShoppingCart },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "accounts", label: "Accounts", icon: Scale },
  { key: "calculators", label: "Calculators", icon: FlaskConical },
  { key: "recycle", label: "Recycle Bin", icon: Recycle },
  { key: "subscriptions", label: "Subscriptions", icon: Users },
] as const;

const QuickActionsGrid = () => {
  const navigate = useNavigate();
  const { location } = useSelection();
  const { t } = useTranslation();

  const items = [
    { key: "locations", label: t("quickActions.farms"), icon: Building2 },
    { key: "tanks", label: t("quickActions.tanks"), icon: DatabaseZap },
    { key: "stock", label: t("quickActions.stock"), icon: ShoppingCart },
    { key: "reports", label: t("quickActions.reports"), icon: FileText },
    { key: "accounts", label: t("quickActions.accounts"), icon: Scale },
    { key: "calculators", label: t("quickActions.calculators"), icon: FlaskConical },
    { key: "recycle", label: t("quickActions.recycleBin"), icon: Recycle },
    { key: "subscriptions", label: t("quickActions.subscriptions"), icon: Users },
  ] as const;

  const handleNav = (key: string) => {
    switch (key) {
      case "locations":
        navigate("/farms");
        break;
      case "tanks":
        if (location?.id) navigate(`/farms/${location.id}/tanks`);
        else navigate("/farms");
        break;
      case "stock":
        if (location?.id) navigate(`/farms/${location.id}/stocks`);
        else navigate("/farms");
        break;
      case "materials":
        navigate("/materials");
        break;
      case "reports":
        navigate("/reports");
        break;
      case "recycle":
        navigate("/recycle-bin");
        break;
      case "calculators":
        navigate("/calculators");
        break;
      default:
        break;
    }
  };

  return (
    <Card className="glass-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
          {t("quickActions.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map(({ key, label, icon: Icon }) => (
            <Button 
              key={key} 
              variant="secondary" 
              className="h-20 flex flex-col items-center justify-center gap-2 interactive-hover bg-secondary/50 hover:bg-secondary/80 border border-border/30" 
              onClick={() => handleNav(key)}
            >
              <Icon size={20} className="text-primary" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsGrid;
