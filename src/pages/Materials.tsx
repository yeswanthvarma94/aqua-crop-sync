
import { useEffect, useMemo, useState } from "react";
import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useSelection } from "@/state/SelectionContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useEffect as ReactUseEffect } from "react";
import { enqueueChange } from "@/lib/approvals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";

// Types reused from Stocks
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

interface MaterialLogEntry {
  tankId: string;
  stockId: string;
  stockName: string;
  category: StockRecord["category"];
  unit: StockRecord["unit"];
  quantity: number;
  time: string; // HH:mm
  notes?: string;
  createdAt: string; // ISO
}

const useSEO = (title: string, description: string) => {
  ReactUseEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", description);
    if (!metaDesc.parentNode) document.head.appendChild(metaDesc);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    if (!canonical.parentNode) document.head.appendChild(canonical);
  }, [title, description]);
};

const Materials = () => {
  const navigate = useNavigate();
  const { location, tank } = useSelection();
  const { toast } = useToast();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const { accountId, hasRole } = useAuth();

  useSEO("Materials | AquaLedger", "Log medicines, minerals, and other materials; auto-deduct stock and see low-stock alerts.");

  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const nonFeedStocks = useMemo(() => stocks.filter(s => s.category !== "feed"), [stocks]);
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const selectedStock = useMemo(() => nonFeedStocks.find(s => s.id === selectedStockId), [nonFeedStocks, selectedStockId]);
  const [quantity, setQuantity] = useState<number>(0);
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${hh}:${mm}`;
  });
  const [notes, setNotes] = useState<string>("");
  const [entries, setEntries] = useState<MaterialLogEntry[]>([]);
  const [rev, setRev] = useState(0);

  const loadStocks = async (locationId: string) => {
    const { data, error } = await supabase
      .from("stocks")
      .select("id, name, category, unit, quantity, price_per_unit, min_stock, expiry_date, notes, created_at, created_at")
      .eq("account_id", accountId)
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    if (!error) {
      const mapped: StockRecord[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        unit: s.unit,
        quantity: Number(s.quantity || 0),
        pricePerUnit: Number(s.price_per_unit || 0),
        totalAmount: Number(s.total_amount || 0),
        minStock: Number(s.min_stock || 0),
        expiryDate: s.expiry_date || undefined,
        notes: s.notes || undefined,
        createdAt: s.created_at,
        updatedAt: s.created_at,
      }));
      setStocks(mapped);
    }
  };

  const loadLogs = async (locationId: string, tankId: string, dateKey: string) => {
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const end = new Date(`${dateKey}T23:59:59.999Z`);
    const { data, error } = await supabase
      .from("material_logs")
      .select("id, stock_id, quantity, note, tank_id, location_id, logged_at")
      .eq("account_id", accountId)
      .eq("location_id", locationId)
      .eq("tank_id", tankId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString())
      .order("logged_at", { ascending: true });
    if (!error) {
      const mapped: MaterialLogEntry[] = (data || []).map((e: any) => ({
        tankId: e.tank_id,
        stockId: e.stock_id,
        stockName: "", // not joined to keep simple
        category: "others",
        unit: "kg",
        quantity: Number(e.quantity),
        time: new Date(e.logged_at).toISOString().slice(11, 16),
        notes: e.note || undefined,
        createdAt: e.logged_at,
      }));
      setEntries(mapped);
    }
  };

  useEffect(() => {
    if (location?.id) loadStocks(location.id);
  }, [location?.id, rev]);

  useEffect(() => {
    if (location?.id && tank?.id) loadLogs(location.id, tank.id, todayKey);
  }, [location?.id, tank?.id, todayKey, rev]);

  const lowStocks = useMemo(() => nonFeedStocks.filter(s => s.minStock > 0 && s.quantity < s.minStock), [nonFeedStocks]);
  const remaining = selectedStock?.quantity ?? 0;

  const saveUsage = async () => {
    if (!location?.id || !tank?.id) return;
    if (!selectedStock) {
      toast({ title: "Select material", description: "Choose a material stock." });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (quantity > remaining) {
      toast({ title: "Insufficient stock", description: `Only ${remaining} ${selectedStock.unit} remaining.` });
      return;
    }

    const entry: MaterialLogEntry = {
      tankId: tank.id,
      stockId: selectedStock.id,
      stockName: selectedStock.name,
      category: selectedStock.category,
      unit: selectedStock.unit,
      quantity,
      time: timeStr,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    await enqueueChange("materials/log", {
      accountId,
      locationId: location.id,
      tankId: tank.id,
      dateKey: todayKey,
      entry,
      stockId: selectedStock.id,
      quantity,
    }, `Materials: ${entry.stockName} — ${entry.quantity} ${entry.unit}`);

  setQuantity(0);
    setNotes("");
    if (hasRole(["owner"])) {
      toast({ title: "Saved", description: `${entry.stockName} — ${entry.quantity} ${entry.unit}` });
    } else {
      toast({ title: "Submitted for approval", description: `${entry.stockName} — ${entry.quantity} ${entry.unit}` });
    }
    setRev(r => r + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Materials</h2>
            <Button size="sm" variant="secondary" onClick={() => navigate("/")}>Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {!location ? (
          <Card>
            <CardHeader>
              <CardTitle>Select a location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Choose a location to manage materials.</p>
              <Button onClick={() => navigate("/locations")}>Go to Locations</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {lowStocks.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3">
                Low stock alert: {lowStocks.length} item(s). {lowStocks.slice(0,3).map(s => s.name).join(", ")}
                {lowStocks.length > 3 ? "…" : ""}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Log Material Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Material</Label>
                    <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {nonFeedStocks.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} — {s.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStock && (
                      <div className="text-xs text-muted-foreground">
                        <Badge variant={remaining <= (selectedStock.minStock || 0) ? "destructive" : "secondary"}>
                          Remaining: {remaining} {selectedStock.unit}
                        </Badge>
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
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks…" />
                  </div>
                </div>

                <div className="mt-4">
                  <Button onClick={saveUsage} disabled={!tank?.id || !selectedStock || quantity <= 0 || quantity > remaining}>Save</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today’s usage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No usage logged yet.</TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.stockName || e.stockId}</TableCell>
                          <TableCell>{e.quantity}</TableCell>
                          <TableCell className="uppercase">{e.unit}</TableCell>
                          <TableCell className="capitalize">{e.category}</TableCell>
                          <TableCell>{e.time}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <TabBar />
    </div>
  );
};

export default Materials;
