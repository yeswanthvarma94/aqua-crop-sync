import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useSelection } from "@/state/SelectionContext";
import { useAuth } from "@/state/AuthContext";
import { useTranslation } from "react-i18next";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { NetworkStatus } from "./NetworkStatus";
import { SyncStatus } from "./SyncStatus";

interface Farm { id: string; name: string }
interface Tank { id: string; name: string; type: "shrimp" | "fish"; farm_id: string }

const HeaderPickers = () => {
  const { accountId } = useAuth();
  const { location, setLocation, tank, setTank } = useSelection();
  const { t } = useTranslation();

  // Use offline storage instead of direct Supabase calls
  const { data: farms } = useOfflineStorage('farms', accountId);
  const { data: allTanks } = useOfflineStorage('tanks', accountId);

  // Filter tanks for the selected farm
  const tanks = useMemo(() => {
    if (!location?.id) return [];
    return allTanks.filter(t => t.farm_id === location.id);
  }, [allTanks, location?.id]);

  const onSelectFarm = (farmId: string) => {
    const farmObj = farms.find((f) => f.id === farmId);
    setLocation(farmObj ? { id: farmObj.id, name: farmObj.name } : null);
    // Reset tank when farm changes
    setTank(null);
  };

  const onSelectTank = (tankId: string) => {
    const t = tanks.find((tk) => tk.id === tankId);
    if (t) setTank({ id: t.id, name: t.name, type: (t.type as "shrimp" | "fish") || "shrimp" });
  };

  return (
    <div className="w-full flex items-center justify-between gap-4 px-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <Select value={location?.id} onValueChange={onSelectFarm} disabled={farms.length === 0}>
            <SelectTrigger className="w-full min-w-0"><SelectValue placeholder={location?.name || t("headers.selectFarm")} /></SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0">
          <Select value={tank?.id} onValueChange={onSelectTank} disabled={!location?.id || tanks.length === 0}>
            <SelectTrigger className="w-full min-w-0"><SelectValue placeholder={tank?.name || t("headers.selectTank")} /></SelectTrigger>
            <SelectContent>
              {tanks.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Status Indicators */}
      <div className="flex items-center space-x-2 shrink-0">
        <NetworkStatus />
        <SyncStatus />
      </div>
    </div>
  );
};

export default HeaderPickers;
