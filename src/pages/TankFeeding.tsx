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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";


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

// Database functions
const loadTankFromDB = async (tankId: string) => {
  const { data } = await supabase
    .from("tanks")
    .select("id, name, type, location_id")
    .eq("id", tankId)
    .single();
  return data ? { id: data.id, name: data.name, type: data.type, locationId: data.location_id } : null;
};

const loadActiveCropFromDB = async (tankId: string) => {
  const { data } = await supabase
    .from("tank_crops")
    .select("seed_date, end_date")
    .eq("tank_id", tankId)
    .is("end_date", null)
    .maybeSingle();
  return data ? { seedDate: data.seed_date, cropEnd: data.end_date || undefined } : null;
};

const loadStocksFromDB = async (accountId: string, locationId: string): Promise<StockRecord[]> => {
  const { data } = await supabase
    .from("stocks")
    .select("*")
    .eq("account_id", accountId)
    .eq("location_id", locationId)
    .eq("category", "feed");
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    quantity: Number(s.quantity),
    pricePerUnit: Number(s.price_per_unit),
    totalAmount: Number(s.total_amount),
    minStock: Number(s.min_stock),
    expiryDate: s.expiry_date,
    notes: s.notes,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
};

const TankFeeding = () => {
  const { locationId, tankId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, accountId } = useAuth();

  const [tank, setTank] = useState<Tank | null>(null);
  const [activeCrop, setActiveCrop] = useState<any>(null);

  // Load tank and crop data
  useEffect(() => {
    const loadData = async () => {
      if (!tankId) return;
      const tankData = await loadTankFromDB(tankId);
      const cropData = await loadActiveCropFromDB(tankId);
      setTank(tankData);
      setActiveCrop(cropData);
    };
    loadData();
  }, [tankId]);

  const name = tank?.name || "";
  const type = (tank?.type || "fish") as "shrimp" | "fish";
  const seedDate = activeCrop?.seedDate ? new Date(activeCrop.seedDate) : undefined;
  const cropEnd = activeCrop?.cropEnd ? new Date(activeCrop.cropEnd) : undefined;
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
  const [editingFeeding, setEditingFeeding] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      if (accountId && locationId) {
        const stockData = await loadStocksFromDB(accountId, locationId);
        setStocks(stockData);
      }
    };
    loadData();
  }, [accountId, locationId, rev]);

  // Load feeding entries from Supabase
  useEffect(() => {
    const loadFeedingEntries = async () => {
      if (!locationId || !tankId) return;
      
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("feeding_logs")
          .select("schedule, quantity, fed_at, notes, stock_id")
          .eq("account_id", accountId as string)
          .eq("location_id", locationId)
          .eq("tank_id", tankId)
          .gte("fed_at", startOfDay.toISOString())
          .lte("fed_at", endOfDay.toISOString())
          .order("fed_at", { ascending: true });

        if (error) throw error;

        const feedingEntries: FeedingEntry[] = (data || []).map((entry: any) => {
          const stock = stocks.find(s => s.id === entry.stock_id);
          return {
            schedule: entry.schedule || "",
            stockName: stock?.name || "Feed",
            unit: (stock?.unit as StockRecord["unit"]) || "kg",
            quantity: Number(entry.quantity),
            time: format(new Date(entry.fed_at), "HH:mm"),
            notes: entry.notes || undefined,
            createdAt: entry.fed_at,
          };
        });

        setEntries(feedingEntries);
      } catch (error) {
        console.error("Error loading feeding entries:", error);
        setEntries([]);
      }
    };

    loadFeedingEntries();
    // Refresh when stocks change to resolve names/units for loaded entries
  }, [accountId, locationId, tankId, todayKey, rev, stocks]);

  const completed = useMemo(() => new Set(entries.map(e => e.schedule)), [entries]);
  const remainingStock = selectedStock?.quantity ?? 0;

  const onEditFeeding = (entry: any, feedingId: string) => {
    setEditingFeeding({ ...entry, id: feedingId });
    setSchedule(entry.schedule);
    setQuantity(entry.quantity);
    setTimeStr(entry.time);
    setNotes(entry.notes || "");
  };

  const saveFeedingEntry = async () => {
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

    try {
      // Create feeding time with today's date and selected time
      const [hours, minutes] = timeStr.split(':').map(Number);
      const feedingTime = new Date();
      feedingTime.setHours(hours, minutes, 0, 0);

      // Save feeding entry to Supabase
      const { error: feedingError } = await supabase
        .from("feeding_logs")
        .insert({
          account_id: accountId,
          location_id: locationId,
          tank_id: tankId,
          stock_id: selectedStock.id,
          schedule: schedule,
          quantity: quantity,
          fed_at: feedingTime.toISOString(),
          notes: notes || null,
        });

      if (feedingError) {
        throw feedingError;
      }

      // Update stock quantity in database
      const nextQty = Math.max(0, selectedStock.quantity - quantity);
      const { error: stockError } = await supabase
        .from("stocks")
        .update({ quantity: nextQty })
        .eq("id", selectedStock.id);

      // Create an expense row for consumed feed
      const feedAmount = quantity * (selectedStock.pricePerUnit || 0);
      const incurredDate = feedingTime.toISOString().slice(0, 10);
      const { error: expenseError } = await supabase
        .from("expenses")
        .insert({
          account_id: accountId,
          location_id: locationId,
          tank_id: tankId,
          category: "feed",
          name: `${selectedStock.name} feed`,
          description: `Auto-added for feeding schedule ${schedule}`,
          amount: feedAmount,
          incurred_at: incurredDate,
          notes: notes || null,
        });

      if (expenseError) throw expenseError;

      setSchedule("");
      setQuantity(0);
      setNotes("");
      setEditingFeeding(null);
      setRev((r) => r + 1);
      toast({ title: "Saved", description: `Schedule ${schedule} feeding recorded` });
    } catch (error) {
      console.error("Error saving feeding entry:", error);
      toast({ title: "Error", description: "Failed to save feeding entry" });
    }
  };


  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/locations/${locationId}/tanks`)}>← Tanks</Button>
          <h1 className="text-xl font-semibold">Feeding — { name || "Tank" }</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
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
