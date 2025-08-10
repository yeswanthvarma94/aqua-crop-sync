import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";
import { useSelection } from "@/state/SelectionContext";

interface Location { id: string; name: string }
interface Tank { id: string; name: string; type: "shrimp" | "fish"; locationId: string }

const readLocations = (): Location[] => {
  try {
    const raw = localStorage.getItem("locations");
    return raw ? (JSON.parse(raw) as Location[]) : [];
  } catch {
    return [];
  }
};

const readTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
  }
};

const HeaderPickers = () => {
  const { location, setLocation, tank, setTank } = useSelection();

  // Pull from local storage; keep simple for MVP. These will refresh on route changes.
  const locations = useMemo(() => readLocations(), []);
  const tanksAll = useMemo(() => readTanks(), []);
  const tanks = useMemo(() => tanksAll.filter((t) => t.locationId === location?.id), [tanksAll, location?.id]);

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
          <SelectTrigger className="w-full"><SelectValue placeholder={location?.name || "Select Location"} /></SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Select value={tank?.id} onValueChange={onSelectTank} disabled={!location?.id || tanks.length === 0}>
          <SelectTrigger className="w-full"><SelectValue placeholder={tank?.name || "Select Tank"} /></SelectTrigger>
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
