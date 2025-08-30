import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useSelection } from "@/state/SelectionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { useTranslation } from "react-i18next";

interface Location { id: string; name: string }
interface Tank { id: string; name: string; type: "shrimp" | "fish"; location_id: string }

const HeaderPickers = () => {
  const { accountId } = useAuth();
  const { location, setLocation, tank, setTank } = useSelection();
  const { t } = useTranslation();

  const [locations, setLocations] = useState<Location[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);

  // Load locations from Supabase for the active account
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!accountId) { setLocations([]); return; }
      const { data } = await supabase
        .from("locations")
        .select("id,name")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (!ignore) setLocations((data as any) || []);
    };
    load();
    return () => { ignore = true; };
  }, [accountId]);

  // Load tanks for the selected location
  useEffect(() => {
    let ignore = false;
    const loadTanks = async () => {
      if (!location?.id) { setTanks([]); return; }
      const { data } = await supabase
        .from("tanks")
        .select("id,name,type,location_id")
        .eq("location_id", location.id)
        .order("created_at", { ascending: false });
      if (!ignore) setTanks((data as any) || []);
    };
    loadTanks();
    return () => { ignore = true; };
  }, [location?.id]);

  const onSelectLocation = (locId: string) => {
    const locObj = locations.find((l) => l.id === locId);
    setLocation(locObj ? { id: locObj.id, name: locObj.name } : null);
    // Reset tank when location changes
    setTank(null);
  };

  const onSelectTank = (tankId: string) => {
    const t = tanks.find((tk) => tk.id === tankId);
    if (t) setTank({ id: t.id, name: t.name, type: t.type });
  };

  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1">
        <Select value={location?.id} onValueChange={onSelectLocation} disabled={locations.length === 0}>
          <SelectTrigger className="w-full"><SelectValue placeholder={location?.name || t("headers.selectFarm")} /></SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
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
