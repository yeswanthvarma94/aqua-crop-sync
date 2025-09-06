import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useSelection } from "@/state/SelectionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { useTranslation } from "react-i18next";

interface Farm { id: string; name: string }
interface Tank { id: string; name: string; type: "shrimp" | "fish"; farm_id: string }

const HeaderPickers = () => {
  const { accountId } = useAuth();
  const { location, setLocation, tank, setTank } = useSelection();
  const { t } = useTranslation();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);

  // Load farms from Supabase for the active account
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!accountId) { setFarms([]); return; }
      const { data } = await supabase
        .from("farms")
        .select("id,name")
        .eq("account_id", accountId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!ignore) setFarms((data as any) || []);
    };
    load();
    return () => { ignore = true; };
  }, [accountId]);

  // Load tanks for the selected farm
  useEffect(() => {
    let ignore = false;
    const loadTanks = async () => {
      if (!location?.id) { setTanks([]); return; }
      const { data } = await supabase
        .from("tanks")
        .select("id,name,type,farm_id")
        .eq("farm_id", location.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (!ignore) setTanks((data as any) || []);
    };
    loadTanks();
    return () => { ignore = true; };
  }, [location?.id]);

  const onSelectFarm = (farmId: string) => {
    const farmObj = farms.find((f) => f.id === farmId);
    setLocation(farmObj ? { id: farmObj.id, name: farmObj.name } : null);
    // Reset tank when farm changes
    setTank(null);
  };

  const onSelectTank = (tankId: string) => {
    const t = tanks.find((tk) => tk.id === tankId);
    if (t) setTank({ id: t.id, name: t.name, type: t.type });
  };

  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1">
        <Select value={location?.id} onValueChange={onSelectFarm} disabled={farms.length === 0}>
          <SelectTrigger className="w-full"><SelectValue placeholder={location?.name || t("headers.selectFarm")} /></SelectTrigger>
          <SelectContent>
            {farms.map((farm) => (
              <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Select value={tank?.id} onValueChange={onSelectTank} disabled={!location?.id || tanks.length === 0}>
          <SelectTrigger className="w-full"><SelectValue placeholder={tank?.name || t("headers.selectTank")} /></SelectTrigger>
          <SelectContent>
            {tanks.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default HeaderPickers;
