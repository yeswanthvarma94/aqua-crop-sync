import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelection } from "@/state/SelectionContext";

// Placeholder picker using in-memory options until DB is connected
const HeaderPickers = () => {
  const { location, setLocation, tank, setTank } = useSelection();

  // In MVP, lists are empty; show disabled state with hints
  const locations = [] as { id: string; name: string }[];
  const tanks = [] as { id: string; name: string }[];

  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1">
        <Select onValueChange={(v) => setLocation(v ? { id: v, name: v } : null)} disabled={locations.length === 0}>
          <SelectTrigger className="w-full"><SelectValue placeholder={location?.name || "Select Location"} /></SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Select onValueChange={(v) => setTank(v ? { id: v, name: v, type: "shrimp" } : null)} disabled={tanks.length === 0}>
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
