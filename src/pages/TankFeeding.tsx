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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cropDayFromStartIST } from "@/lib/time";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { CalendarIcon, Edit2, Trash2 } from "lucide-react";


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
  id: string;
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
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
  const [totalConsumption, setTotalConsumption] = useState<number>(0);
  const [rev, setRev] = useState(0);
  const [editingFeeding, setEditingFeeding] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

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
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("feeding_logs")
          .select("id, schedule, quantity, fed_at, notes, stock_id")
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
            id: entry.id,
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
  }, [accountId, locationId, tankId, selectedDateKey, rev, stocks]);

  // Load total consumption from crop start
  useEffect(() => {
    const loadTotalConsumption = async () => {
      if (!locationId || !tankId || !hasActiveCrop || !seedDate) return;
      
      try {
        const { data, error } = await supabase
          .from("feeding_logs")
          .select("quantity")
          .eq("account_id", accountId as string)
          .eq("location_id", locationId)
          .eq("tank_id", tankId)
          .gte("fed_at", seedDate.toISOString());

        if (error) throw error;

        const total = (data || []).reduce((sum: number, entry: any) => sum + Number(entry.quantity), 0);
        setTotalConsumption(total);
      } catch (error) {
        console.error("Error loading total consumption:", error);
        setTotalConsumption(0);
      }
    };

    loadTotalConsumption();
  }, [accountId, locationId, tankId, hasActiveCrop, seedDate, rev]);

  const completed = useMemo(() => new Set(entries.map(e => e.schedule)), [entries]);
  const remainingStock = selectedStock?.quantity ?? 0;

  const onEditFeeding = (entry: FeedingEntry) => {
    setEditingFeeding(entry);
    setSchedule(entry.schedule);
    setQuantity(entry.quantity);
    setTimeStr(entry.time);
    setNotes(entry.notes || "");
    // Find and set the stock
    const stock = stocks.find(s => s.name === entry.stockName);
    if (stock) {
      setSelectedStockId(stock.id);
    }
  };

  const onDeleteFeeding = async (feedingId: string) => {
    try {
      console.log("Deleting feeding entry:", feedingId, "Account:", accountId);
      
      const { data, error } = await supabase
        .from("feeding_logs")
        .delete()
        .eq("id", feedingId)
        .eq("account_id", accountId)
        .select();

      if (error) {
        console.error("Delete feeding entry error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No feeding entry was deleted. Entry may not exist or you may not have permission.");
      }
      
      console.log("Feeding entry deleted successfully");
      
      // Force reload data to reflect changes
      await loadStocksFromDB(accountId!, locationId!).then(setStocks);
      setRev(r => r + 1);
      toast({ title: "Deleted", description: "Feeding entry removed successfully" });
    } catch (error: any) {
      console.error("Failed to delete feeding entry:", error);
      const errorMsg = error?.message || "Failed to delete feeding entry. Please try again.";
      toast({ 
        title: "Error", 
        description: errorMsg, 
        variant: "destructive" 
      });
    }
  };

  const saveFeedingEntry = async () => {
    if (isSaving) return; // Prevent multiple clicks
    
    if (!hasActiveCrop) {
      toast({ title: "Inactive tank", description: "Start crop to record feeding." });
      return;
    }
    if (!locationId || !tankId) return;
    if (!schedule) {
      toast({ title: "Select schedule", description: "Choose a feeding schedule." });
      return;
    }
    if (!editingFeeding && completed.has(schedule)) {
      toast({ title: "Schedule done", description: "This schedule is already completed for selected date." });
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

    setIsSaving(true);
    try {
      // Create feeding time with selected date and time
      const [hours, minutes] = timeStr.split(':').map(Number);
      const feedingTime = new Date(selectedDate);
      feedingTime.setHours(hours, minutes, 0, 0);

      const weightedAvgPrice = selectedStock.pricePerUnit || 0;

      if (editingFeeding) {
        // Update existing feeding entry
        const { error: feedingError } = await supabase
          .from("feeding_logs")
          .update({
            schedule: schedule,
            quantity: quantity,
            fed_at: feedingTime.toISOString(),
            notes: notes || null,
          })
          .eq("id", editingFeeding.id);

        if (feedingError) throw feedingError;
        toast({ title: "Updated", description: "Feeding entry updated successfully" });
      } else {
        // Create new feeding entry
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
            price_per_unit: weightedAvgPrice,
            notes: notes || null,
          });

        if (feedingError) throw feedingError;

        // Update stock quantity in database
        const nextQty = Math.max(0, selectedStock.quantity - quantity);
        await supabase
          .from("stocks")
          .update({ quantity: nextQty })
          .eq("id", selectedStock.id);

        // Create an expense row for consumed feed
        const feedAmount = quantity * weightedAvgPrice;
        const incurredDate = feedingTime.toISOString().slice(0, 10);
        await supabase
          .from("expenses")
          .insert({
            account_id: accountId,
            location_id: locationId,
            tank_id: tankId,
            category: "feed",
            name: `${selectedStock.name} feed`,
            description: `Auto-added for feeding schedule ${schedule} (₹${weightedAvgPrice.toFixed(2)}/unit)`,
            amount: feedAmount,
            incurred_at: incurredDate,
            notes: notes || null,
          });

        toast({ title: "Saved", description: `Schedule ${schedule} feeding recorded` });
      }

      setSchedule("");
      setQuantity(0);
      setNotes("");
      setSelectedStockId("");
      setEditingFeeding(null);
      setRev((r) => r + 1);
    } catch (error: any) {
      console.error("Error saving feeding entry:", error);
      const errorMessage = error?.message?.includes('insufficient') 
        ? 'Insufficient stock quantity available'
        : error?.message?.includes('duplicate')
        ? 'This feeding schedule already exists for the selected date'
        : 'Failed to save feeding entry. Please try again.';
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/locations/${locationId}/tanks`)}>← Tanks</Button>
          <h1 className="text-xl font-semibold">Feeding — { name || "Tank" }</h1>
        </div>
        <div className="flex items-center gap-4">
          {hasActiveCrop && totalConsumption > 0 && (
            <div className="text-sm text-muted-foreground">
              <div className="font-medium">Total Feed: {totalConsumption} kg</div>
              <div>Day {dayCounter}</div>
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feeding</CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date() || (hasActiveCrop && seedDate ? date < seedDate : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
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

              <div className="flex gap-2">
              <Button onClick={saveFeedingEntry} disabled={isSaving}>
                {isSaving ? "Saving..." : editingFeeding ? "Update Feeding" : "Save Feeding"}
              </Button>
                {editingFeeding && (
                  <Button variant="outline" onClick={() => {
                    setEditingFeeding(null);
                    setSchedule("");
                    setQuantity(0);
                    setNotes("");
                    setSelectedStockId("");
                  }}>
                    Cancel
                  </Button>
                )}
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">
                  {format(selectedDate, "MMM d, yyyy")} feedings
                </h3>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries for this date.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {entries.map((e) => (
                      <li key={e.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge variant="secondary">{type === "shrimp" ? `S${e.schedule}` : `F${e.schedule}`}</Badge>
                          <span>{e.quantity} {e.unit} • {e.stockName}</span>
                          {e.notes && <span className="text-muted-foreground text-xs">({e.notes})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{e.time}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditFeeding(e)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteFeeding(e.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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
