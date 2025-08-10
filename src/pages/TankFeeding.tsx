import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cropDayFromStartIST } from "@/lib/time";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }
interface TankDetail { seedDate?: string; cropEnd?: string; name: string; type: "shrimp" | "fish" }

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

interface FeedingEntry {
  schedule: string;
  stockName: string;
  unit: StockRecord["unit"];
  quantity: number;
  time: string;
  notes?: string;
  createdAt: string;
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

const TankFeeding = () => {
  const { locationId, tankId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tanks = useMemo(() => loadTanks(), []);
  const baseTank = tanks.find((t) => t.id === tankId);

  // Tank active status
  const [detail, setDetail] = useState<TankDetail | null>(null);
  useEffect(() => {
    if (!tankId) return;
    setDetail(loadActiveDetail(tankId));
  }, [tankId]);

  const name = detail?.name || baseTank?.name || "";
  const type = (detail?.type || baseTank?.type || "fish") as "shrimp" | "fish";
  const seedDate = detail?.seedDate ? new Date(detail.seedDate) : undefined;
  const cropEnd = detail?.cropEnd ? new Date(detail.cropEnd) : undefined;
  const hasActiveCrop = !!seedDate && !cropEnd;
  const dayCounter = hasActiveCrop && seedDate ? cropDayFromStartIST(seedDate) : null;

  // Feeding state
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const feedStocks = useMemo(() => stocks.filter(s => s.category === "feed"), [stocks]);
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const selectedStock = useMemo(() => feedStocks.find(s => s.id === selectedStockId), [feedStocks, selectedStockId]);
  const [schedule, setSchedule] = useState<string>("");
  const scheduleOptions = type === "shrimp" ? ["1","2","3","4"] : ["1"];
  const [quantity, setQuantity] = useState<number>(0);
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
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [newStockUnit, setNewStockUnit] = useState<StockRecord["unit"]>("kg");
  const [newStockPpu, setNewStockPpu] = useState<number>(0);

  useEffect(() => {
    if (locationId) setStocks(loadStocks(locationId));
  }, [locationId, rev]);

  useEffect(() => {
    if (locationId && tankId) setEntries(loadFeeding(locationId, tankId, todayKey));
  }, [locationId, tankId, todayKey, rev]);

  const completed = useMemo(() => new Set(entries.map(e => e.schedule)), [entries]);
  const remainingStock = selectedStock?.quantity ?? 0;

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
    if (quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (quantity > remainingStock) {
      toast({ title: "Insufficient stock", description: `Only ${remainingStock} ${selectedStock.unit} remaining.` });
      return;
    }

    const list = loadFeeding(locationId, tankId, todayKey);
    const entry: FeedingEntry = {
      schedule,
      stockName: selectedStock.name,
      unit: selectedStock.unit,
      quantity,
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
      sList[idx] = { ...cur, quantity: Math.max(0, cur.quantity - quantity), updatedAt: new Date().toISOString() };
      saveStocks(locationId, sList);
      setStocks(sList);
    }

    setEntries(list);
    setSchedule("");
    setQuantity(0);
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
    if (newStockQty <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (newStockPpu < 0) {
      toast({ title: "Invalid price", description: "Price per unit cannot be negative." });
      return;
    }
    const list = loadStocks(locationId);
    const idx = list.findIndex(s => s.name.toLowerCase() === name.toLowerCase() && s.category === "feed" && s.unit === newStockUnit);
    const amount = newStockQty * newStockPpu;
    const now = new Date().toISOString();
    if (idx >= 0) {
      const s = list[idx];
      list[idx] = { ...s, quantity: s.quantity + newStockQty, totalAmount: s.totalAmount + amount, pricePerUnit: newStockPpu, updatedAt: now };
    } else {
      list.unshift({ id: crypto.randomUUID(), name, category: "feed", unit: newStockUnit, quantity: newStockQty, pricePerUnit: newStockPpu, totalAmount: amount, minStock: 0, createdAt: now, updatedAt: now });
    }
    saveStocks(locationId, list);
    setStocks(list);
    // select created/updated item
    const sel = idx >= 0 ? list[idx].id : list[0].id;
    setSelectedStockId(sel);
    setAddOpen(false);
    setNewStockName(""); setNewStockQty(0); setNewStockUnit("kg"); setNewStockPpu(0);
    toast({ title: "Stock added", description: `${name} updated.` });
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/locations/${locationId}/tanks`)}>← Tanks</Button>
          <h1 className="text-xl font-semibold">Feeding — { name || "Tank" }</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Dashboard</Button>
          {hasActiveCrop && (
            <span className="text-sm text-muted-foreground">Day {dayCounter}</span>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Feeding — Today</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasActiveCrop ? (
            <p className="text-sm text-muted-foreground">Start crop to enable feeding for this tank.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={schedule} onValueChange={setSchedule}>
                    <SelectTrigger>
                      <SelectValue placeholder={type === "shrimp" ? "Select S1–S4" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map((s) => (
                        <SelectItem key={s} value={s} disabled={completed.has(s)}>
                          {type === "shrimp" ? `Schedule ${s}` : `Feeding ${s}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Feed Stock</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stock" />
                        </SelectTrigger>
                        <SelectContent>
                          {feedStocks.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} — {s.unit.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm">Add Stock</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[460px]">
                        <DialogHeader>
                          <DialogTitle>Add Stock (Feed)</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label>Stock Name</Label>
                            <Input value={newStockName} onChange={(e) => setNewStockName(e.target.value)} placeholder="e.g., Feed 3mm" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input type="number" inputMode="decimal" min={0} step="any" value={newStockQty} onChange={(e) => setNewStockQty(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Select value={newStockUnit} onValueChange={(v) => setNewStockUnit(v as any)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">KG</SelectItem>
                                  <SelectItem value="liters">Liters</SelectItem>
                                  <SelectItem value="bags">Bags</SelectItem>
                                  <SelectItem value="pieces">Pieces</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Price per unit (INR)</Label>
                            <Input type="number" inputMode="decimal" min={0} step="any" value={newStockPpu} onChange={(e) => setNewStockPpu(Number(e.target.value))} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={addStock}>Save</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {selectedStock && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <Badge variant={remainingStock <= (selectedStock.minStock || 0) ? "destructive" : "secondary"}>
                        Remaining: {remainingStock} {selectedStock.unit}
                      </Badge>
                      {selectedStock.minStock > 0 && remainingStock < selectedStock.minStock && (
                        <span>Below min stock</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Quantity ({selectedStock?.unit?.toUpperCase() || "unit"})</Label>
                  <Input type="number" inputMode="decimal" min={0} step="any" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks…" />
                </div>
              </div>

              <div>
                <Button onClick={saveFeedingEntry} disabled={!hasActiveCrop || !schedule || completed.has(schedule) || !selectedStock || quantity <= 0 || quantity > remainingStock}>Save Feeding</Button>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Today's feedings</h3>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {entries.map((e, idx) => (
                      <li key={idx} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{type === "shrimp" ? `S${e.schedule}` : `F${e.schedule}`}</Badge>
                          <span>{e.quantity} {e.unit} • {e.stockName}</span>
                        </div>
                        <div className="text-muted-foreground">{e.time}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default TankFeeding;
