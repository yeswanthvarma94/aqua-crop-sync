import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cropDayFromStartIST } from "@/lib/time";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }

interface TankDetail {
  tankId: string;
  name: string;
  type: "shrimp" | "fish";
  seedDate?: string; // ISO string
  seedWeight?: number; // fish only
  plSize?: number; // shrimp only
  totalSeed?: number;
  areaAcres?: number;
  price?: number;
  cropStart?: string; // ISO
  cropEnd?: string; // ISO
}

// Stock types (from Stocks module)
interface StockRecord {
  id: string;
  name: string;
  category: "feed" | "medicine" | "equipment" | "others";
  unit: "kg" | "liters" | "bags" | "pieces";
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  minStock: number;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Feeding record (per day per schedule)
interface FeedingEntry {
  schedule: string; // "1".."4" for shrimp, "1" for fish
  stockName: string;
  unit: StockRecord["unit"];
  quantity: number;
  time: string; // HH:mm
  notes?: string;
  createdAt: string; // ISO
}

const loadTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
  }
};

const loadActiveDetail = (tankId: string): TankDetail | null => {
  try {
    const raw = localStorage.getItem(`tankDetail:${tankId}`);
    return raw ? (JSON.parse(raw) as TankDetail) : null;
  } catch {
    return null;
  }
};

const saveActiveDetail = (tankId: string, detail: TankDetail) => {
  localStorage.setItem(`tankDetail:${tankId}`, JSON.stringify(detail));
};

const clearActiveDetail = (tankId: string) => {
  localStorage.removeItem(`tankDetail:${tankId}`);
};

const pushRecycleBin = (endedDetail: TankDetail) => {
  try {
    const raw = localStorage.getItem("recycleBin.crops");
    const arr = raw ? (JSON.parse(raw) as TankDetail[]) : [];
    arr.unshift(endedDetail);
    localStorage.setItem("recycleBin.crops", JSON.stringify(arr));
  } catch {
    // no-op
  }
};

// Stocks helpers
const stockKey = (locationId: string) => `stocks:${locationId}`;
const loadStocks = (locationId: string): StockRecord[] => {
  try {
    const raw = localStorage.getItem(stockKey(locationId));
    return raw ? (JSON.parse(raw) as StockRecord[]) : [];
  } catch {
    return [];
  }
};
const saveStocks = (locationId: string, items: StockRecord[]) => {
  localStorage.setItem(stockKey(locationId), JSON.stringify(items));
};

// Feeding storage helpers
const feedingKey = (locationId: string, tankId: string, dateKey: string) => `feeding:${locationId}:${tankId}:${dateKey}`;
const loadFeeding = (locationId: string, tankId: string, dateKey: string): FeedingEntry[] => {
  try {
    const raw = localStorage.getItem(feedingKey(locationId, tankId, dateKey));
    return raw ? (JSON.parse(raw) as FeedingEntry[]) : [];
  } catch {
    return [];
  }
};
const saveFeeding = (locationId: string, tankId: string, dateKey: string, list: FeedingEntry[]) => {
  localStorage.setItem(feedingKey(locationId, tankId, dateKey), JSON.stringify(list));
};

const TankDetailPage = () => {
  const { locationId, tankId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tanks = useMemo(() => loadTanks(), []);
  const baseTank = tanks.find((t) => t.id === tankId);

  const [name, setName] = useState<string>(baseTank?.name ?? "");
  const [type, setType] = useState<"shrimp" | "fish">((baseTank?.type as any) ?? "fish");
  const [seedDate, setSeedDate] = useState<Date | undefined>(undefined);
  const [seedWeight, setSeedWeight] = useState<number | undefined>(undefined);
  const [plSize, setPlSize] = useState<number | undefined>(undefined);
  const [totalSeed, setTotalSeed] = useState<number | undefined>(undefined);
  const [areaAcres, setAreaAcres] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [cropEnd, setCropEnd] = useState<Date | undefined>(undefined);

  // Feeding state
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const feedStocks = useMemo(() => stocks.filter(s => s.category === "feed"), [stocks]);
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const selectedStock = useMemo(() => feedStocks.find(s => s.id === selectedStockId), [feedStocks, selectedStockId]);
  const [schedule, setSchedule] = useState<string>("");
  const scheduleOptions = type === "shrimp" ? ["1","2","3","4"] : ["1"];
  const [quantity, setQuantity] = useState<number | "">("");
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${hh}:${mm}`;
  });
  const [notes, setNotes] = useState<string>("");
  const [entries, setEntries] = useState<FeedingEntry[]>([]);
  const [rev, setRev] = useState(0);

  // Add Stock modal
  const [addOpen, setAddOpen] = useState(false);
  const [newStockName, setNewStockName] = useState("");
  const [newStockQty, setNewStockQty] = useState<number | "">("");
  const [newStockUnit, setNewStockUnit] = useState<StockRecord["unit"]>("kg");
  const [newStockPpu, setNewStockPpu] = useState<number | "">("");

  // Load existing active crop if any
  useEffect(() => {
    if (!tankId) return;
    const existing = loadActiveDetail(tankId);
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      // Parse seed date as local date to avoid timezone issues
      if (existing.seedDate) {
        const [year, month, day] = existing.seedDate.split('T')[0].split('-');
        setSeedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
      } else {
        setSeedDate(undefined);
      }
      setSeedWeight(existing.seedWeight);
      setPlSize(existing.plSize);
      setTotalSeed(existing.totalSeed);
      setAreaAcres(existing.areaAcres);
      setPrice(existing.price);
      setCropEnd(existing.cropEnd ? new Date(existing.cropEnd) : undefined);
    }
  }, [tankId]);

  useEffect(() => {
    if (locationId) setStocks(loadStocks(locationId));
  }, [locationId, rev]);

  useEffect(() => {
    if (locationId && tankId) setEntries(loadFeeding(locationId, tankId, todayKey));
  }, [locationId, tankId, todayKey, rev]);

  const dayCounter = useMemo(() => {
    if (seedDate && !cropEnd) {
      return cropDayFromStartIST(seedDate);
    }
    return null;
  }, [seedDate, cropEnd]);

  const hasActiveCrop = !!seedDate && !cropEnd;
  const completed = useMemo(() => new Set(entries.map(e => e.schedule)), [entries]);
  const remainingStock = selectedStock?.quantity ?? 0;

  const handleSave = () => {
    if (!tankId) return;
    // Basic validation
    if (!name || !type) {
      toast({ title: "Missing info", description: "Please provide tank name and type." });
      return;
    }

    // Persist base tank name/type changes back to list for consistency
    if (baseTank) {
      const updated = tanks.map((t) => (t.id === tankId ? { ...t, name, type } : t));
      localStorage.setItem("tanks", JSON.stringify(updated));
    }

    // Format seed date properly to avoid timezone issues
    const seedDateString = seedDate ? format(seedDate, "yyyy-MM-dd") : undefined;

    const detail: TankDetail = {
      tankId,
      name,
      type,
      seedDate: seedDateString,
      seedWeight: type === "fish" ? seedWeight : undefined,
      plSize: type === "shrimp" ? plSize : undefined,
      totalSeed,
      areaAcres,
      price,
      // Only set cropStart if there's an existing active crop
      cropStart: hasActiveCrop && seedDateString ? seedDateString : undefined,
      cropEnd: cropEnd ? cropEnd.toISOString() : undefined,
    };

    saveActiveDetail(tankId, detail);
    toast({ title: "Saved", description: "Tank details have been saved." });
    navigate(`/locations/${locationId}/tanks`);
  };

  const handleEndCrop = () => {
    if (!tankId) return;
    const now = new Date();
    const ended: TankDetail = {
      tankId,
      name,
      type,
      seedDate: seedDate ? seedDate.toISOString() : undefined,
      seedWeight: type === "fish" ? seedWeight : undefined,
      plSize: type === "shrimp" ? plSize : undefined,
      totalSeed,
      areaAcres,
      price,
      cropStart: seedDate ? seedDate.toISOString() : undefined,
      cropEnd: now.toISOString(),
    };
    // Move to recycle bin and clear active
    pushRecycleBin(ended);
    clearActiveDetail(tankId);

    setCropEnd(now);
    toast({ title: "Crop ended", description: "Moved to Recycle Bin." });
  };

  const saveFeedingEntry = () => {
    if (!hasActiveCrop) {
      toast({ title: "Inactive tank", description: "Start crop to record feeding." });
      return;
    }
    if (!locationId || !tankId) return;
    if (!schedule) {
      toast({ title: "Select schedule", description: "Choose a feeding schedule." });
      return;
    }
    if (completed.has(schedule)) {
      toast({ title: "Schedule done", description: "This schedule is already completed for today." });
      return;
    }
    if (!selectedStock) {
      toast({ title: "Select stock", description: "Choose feed stock to deduct from." });
      return;
    }
    const numQuantity = Number(quantity);
    if (!numQuantity || numQuantity <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (numQuantity > remainingStock) {
      toast({ title: "Insufficient stock", description: `Only ${remainingStock} ${selectedStock.unit} remaining.` });
      return;
    }

    const list = loadFeeding(locationId, tankId, todayKey);
    const entry: FeedingEntry = {
      schedule,
      stockName: selectedStock.name,
      unit: selectedStock.unit,
      quantity: numQuantity,
      time: timeStr,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    saveFeeding(locationId, tankId, todayKey, list);

    // Deduct stock
    const sList = loadStocks(locationId);
    const idx = sList.findIndex(s => s.id === selectedStock.id);
    if (idx >= 0) {
      const cur = sList[idx];
      sList[idx] = { ...cur, quantity: Math.max(0, cur.quantity - numQuantity), updatedAt: new Date().toISOString() };
      saveStocks(locationId, sList);
      setStocks(sList);
    }

    setEntries(list);
    setSchedule("");
    setQuantity("");
    setNotes("");
    setRev(r => r + 1);
    toast({ title: "Feeding saved", description: `Schedule ${entry.schedule} recorded.` });
  };

  const addStock = () => {
    if (!locationId) return;
    const name = newStockName.trim();
    if (!name) {
      toast({ title: "Missing name", description: "Enter stock name." });
      return;
    }
    const numQty = Number(newStockQty);
    const numPpu = Number(newStockPpu);
    if (!numQty || numQty <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (numPpu < 0) {
      toast({ title: "Invalid price", description: "Price per unit cannot be negative." });
      return;
    }
    const list = loadStocks(locationId);
    // Merge by name+category+unit (feed only)
    const idx = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase() && s.category === "feed" && s.unit === newStockUnit);
    const amount = numQty * numPpu;
    const now = new Date().toISOString();
    if (idx >= 0) {
      const s = list[idx];
      list[idx] = { ...s, quantity: s.quantity + numQty, totalAmount: s.totalAmount + amount, pricePerUnit: numPpu, updatedAt: now };
    } else {
      list.unshift({ id: crypto.randomUUID(), name, category: "feed", unit: newStockUnit, quantity: numQty, pricePerUnit: numPpu, totalAmount: amount, minStock: 0, createdAt: now, updatedAt: now });
    }
    saveStocks(locationId, list);
    setStocks(list);
    // Select the merged/new stock by id
    if (idx >= 0) {
      setSelectedStockId(list[idx].id);
    } else {
      const created = list[0];
      setSelectedStockId(created.id);
    }
    setAddOpen(false);
    setNewStockName(""); setNewStockQty(0); setNewStockUnit("kg"); setNewStockPpu(0);
    toast({ title: "Stock added", description: `${name} updated.` });
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/locations/${locationId}/tanks`)}>← Tanks</Button>
          <h1 className="text-xl font-semibold">Tank Detail{ name ? ` — ${name}` : "" }</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
          {hasActiveCrop && (
            <span className="text-sm text-muted-foreground">Day {dayCounter}</span>
          )}
          {hasActiveCrop && (
            <Button variant="destructive" size="sm" onClick={handleEndCrop}>End Crop</Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tank Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter tank name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tank Type</Label>
              <Select value={type} onValueChange={(v: "fish" | "shrimp") => { setType(v); setSeedWeight(undefined); setPlSize(undefined); }}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="shrimp">Shrimp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seed Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !seedDate && "text-muted-foreground")}> 
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {seedDate ? seedDate.toLocaleDateString() : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={seedDate} onSelect={setSeedDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {type === "fish" ? (
              <div className="space-y-2">
                <Label htmlFor="seedWeight">Seed weight (g)</Label>
                <Input id="seedWeight" type="number" inputMode="decimal" value={seedWeight ?? ""} onChange={(e) => setSeedWeight(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 2" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="plSize">PL size</Label>
                <Input id="plSize" type="number" inputMode="decimal" value={plSize ?? ""} onChange={(e) => setPlSize(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 12" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="totalSeed">Total seed</Label>
              <Input id="totalSeed" type="number" inputMode="numeric" value={totalSeed ?? ""} onChange={(e) => setTotalSeed(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 5000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaAcres">Area (acres)</Label>
              <Input id="areaAcres" type="number" inputMode="decimal" step="0.01" value={areaAcres ?? ""} onChange={(e) => setAreaAcres(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 1.50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" inputMode="decimal" step="0.01" value={price ?? ""} onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 25000" />
            </div>

          </section>

          <div className="mt-6 flex items-center gap-2">
            <Button onClick={handleSave}>Save</Button>
          </div>

          {cropEnd && (
            <p className="mt-4 text-sm text-muted-foreground">Crop ended on {cropEnd.toLocaleDateString()}.</p>
          )}
        </CardContent>
      </Card>

    </main>
  );
};

export default TankDetailPage;
