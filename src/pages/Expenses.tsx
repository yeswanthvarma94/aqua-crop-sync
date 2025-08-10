import { useEffect, useMemo, useState } from "react";
import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelection } from "@/state/SelectionContext";
import { useAuth } from "@/state/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Local types reused across modules
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

interface TankDetail {
  tankId: string;
  name: string;
  type: "shrimp" | "fish";
  seedDate?: string;
  cropEnd?: string;
  price?: number; // seed price
}

interface FeedingEntry {
  schedule: string;
  stockName: string;
  unit: StockRecord["unit"];
  quantity: number;
  time: string;
  createdAt: string;
}

// Expenses model
type ExpenseCategory = "lease" | "seed" | "manpower" | "salaries" | "electricity" | "diesel" | "generator" | "medicine" | "other";
interface ExpenseEntry {
  id: string;
  category: ExpenseCategory;
  name: string; // display name (for other = custom)
  amount: number; // INR
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm
  notes?: string;
  createdAt: string; // ISO
}

// Storage helpers
const stockKey = (locationId: string) => `stocks:${locationId}`;
const loadStocks = (locationId: string): StockRecord[] => {
  try {
    const raw = localStorage.getItem(stockKey(locationId));
    return raw ? (JSON.parse(raw) as StockRecord[]) : [];
  } catch {
    return [];
  }
};

const loadTankDetail = (tankId: string): TankDetail | null => {
  try {
    const raw = localStorage.getItem(`tankDetail:${tankId}`);
    return raw ? (JSON.parse(raw) as TankDetail) : null;
  } catch {
    return null;
  }
};

const expensesKey = (locationId: string, tankId: string) => `expenses:${locationId}:${tankId}`;
const loadExpenses = (locationId: string, tankId: string): ExpenseEntry[] => {
  try {
    const raw = localStorage.getItem(expensesKey(locationId, tankId));
    return raw ? (JSON.parse(raw) as ExpenseEntry[]) : [];
  } catch {
    return [];
  }
};
const saveExpenses = (locationId: string, tankId: string, list: ExpenseEntry[]) => {
  localStorage.setItem(expensesKey(locationId, tankId), JSON.stringify(list));
};

// Utility to scan feeding entries across crop
const listFeedingAcrossCrop = (locationId: string, tankId: string, startISO?: string, endISO?: string): FeedingEntry[] => {
  const items: FeedingEntry[] = [];
  const start = startISO ? new Date(startISO).getTime() : undefined;
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    const prefix = `feeding:${locationId}:${tankId}:`;
    if (key && key.startsWith(prefix)) {
      const dateStr = key.substring(prefix.length); // yyyy-MM-dd
      const dateTime = new Date(`${dateStr}T00:00:00`).getTime();
      if (start !== undefined && dateTime < start) continue;
      if (end !== undefined && dateTime > end) continue;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw) as FeedingEntry[];
          items.push(...arr);
        }
      } catch {}
    }
  }
  return items;
};

// Materials logs
interface MaterialLogEntry {
  stockId: string;
  stockName: string;
  category: StockRecord["category"];
  unit: StockRecord["unit"];
  quantity: number;
  time: string;
  notes?: string;
  createdAt: string;
}

const listMaterialsAcrossCrop = (locationId: string, tankId: string, startISO?: string, endISO?: string): MaterialLogEntry[] => {
  const items: MaterialLogEntry[] = [];
  const start = startISO ? new Date(startISO).getTime() : undefined;
  const end = endISO ? new Date(endISO).getTime() : Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    const prefix = `materials:logs:${locationId}:${tankId}:`;
    if (key && key.startsWith(prefix)) {
      const dateStr = key.substring(prefix.length); // yyyy-MM-dd
      const dateTime = new Date(`${dateStr}T00:00:00`).getTime();
      if (start !== undefined && dateTime < start) continue;
      if (end !== undefined && dateTime > end) continue;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw) as MaterialLogEntry[];
          items.push(...arr);
        }
      } catch {}
    }
  }
  return items;
};

const categoryLabel: Record<ExpenseCategory, string> = {
  lease: "Lease",
  seed: "Seed",
  manpower: "Man power",
  salaries: "Salaries",
  electricity: "Electricity",
  diesel: "Diesel",
  generator: "Generator",
  medicine: "Medicines",
  other: "Other",
};

const useSEO = (title: string, description: string) => {
  useEffect(() => {
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

const Expenses = () => {
  const { location, tank } = useSelection();
  const { hasRole, accountId } = useAuth();
  const { toast } = useToast();
  const todayKey = format(new Date(), "yyyy-MM-dd");

  useSEO("Tank Expenses | AquaLedger", "Log tank expenses and view totals including seed, feed, and other costs.");

  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [rev, setRev] = useState(0);

  // Form state
  const [category, setCategory] = useState<ExpenseCategory>("manpower");
  const [customName, setCustomName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [dateStr, setDateStr] = useState<string>(todayKey);
  const [timeStr, setTimeStr] = useState<string>(() => {
    const d = new Date();
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${hh}:${mm}`;
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (location?.id) setStocks(loadStocks(location.id));
  }, [location?.id, rev]);

  useEffect(() => {
    if (location?.id && tank?.id) setEntries(loadExpenses(location.id, tank.id));
  }, [location?.id, tank?.id, rev]);

  const detail = useMemo(() => (tank ? loadTankDetail(tank.id) : null), [tank?.id, rev]);

  // Derived expenses
  const seedCostFromDetail = detail?.price ?? 0;
  const feedEntries = useMemo(() =>
    location?.id && tank?.id ? listFeedingAcrossCrop(location.id, tank.id, detail?.seedDate, detail?.cropEnd) : [],
  [location?.id, tank?.id, detail?.seedDate, detail?.cropEnd, rev]);

  const priceByStockName = useMemo(() => {
    const map = new Map<string, number>();
    stocks.filter(s => s.category === "feed").forEach(s => map.set(s.name, s.pricePerUnit || 0));
    return map;
  }, [stocks]);

  const feedCost = useMemo(() => feedEntries.reduce((sum, e) => sum + (e.quantity * (priceByStockName.get(e.stockName) ?? 0)), 0), [feedEntries, priceByStockName]);

  // Materials (non-feed) used across crop for this tank
  const materialsEntries = useMemo(() => (
    location?.id && tank?.id ? listMaterialsAcrossCrop(location.id, tank.id, detail?.seedDate, detail?.cropEnd) : []
  ), [location?.id, tank?.id, detail?.seedDate, detail?.cropEnd, rev]);

  const priceByStockId = useMemo(() => {
    const map = new Map<string, number>();
    stocks.filter(s => s.category !== "feed").forEach(s => map.set(s.id, s.pricePerUnit || 0));
    return map;
  }, [stocks]);

  const materialsMedicineCost = useMemo(() => materialsEntries
    .filter(e => e.category === "medicine")
    .reduce((sum, e) => sum + (e.quantity * (priceByStockId.get(e.stockId) ?? 0)), 0), [materialsEntries, priceByStockId]);

  const materialsOtherCost = useMemo(() => materialsEntries
    .filter(e => e.category !== "medicine")
    .reduce((sum, e) => sum + (e.quantity * (priceByStockId.get(e.stockId) ?? 0)), 0), [materialsEntries, priceByStockId]);

  const entriesInRange = useMemo(() => {
    if (!detail?.seedDate) return entries;
    const start = new Date(detail.seedDate);
    const end = detail?.cropEnd ? new Date(detail.cropEnd) : new Date();
    return entries.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [entries, detail?.seedDate, detail?.cropEnd]);

  const totalsByName: Record<string, number> = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const e of entriesInRange) {
      agg[e.name] = (agg[e.name] || 0) + e.amount;
    }
    return agg;
  }, [entriesInRange]);

  const totalsByCat: Partial<Record<ExpenseCategory, number>> = useMemo(() => {
    const agg: Partial<Record<ExpenseCategory, number>> = {};
    for (const e of entriesInRange) {
      agg[e.category] = (agg[e.category] || 0) + e.amount;
    }
    return agg;
  }, [entriesInRange]);

  const otherTotal = useMemo(() => entriesInRange.reduce((sum, e) => sum + e.amount, 0), [entriesInRange]);
  const seedCost = (totalsByCat["seed"] ?? 0) || seedCostFromDetail;
  const leaseTotal = totalsByCat["lease"] ?? 0;

  const grandTotal = useMemo(
    () => seedCost + leaseTotal + feedCost + otherTotal + materialsMedicineCost + materialsOtherCost,
    [seedCost, leaseTotal, feedCost, otherTotal, materialsMedicineCost, materialsOtherCost]
  );

  const isManager = hasRole(["manager"]);
  const fmt = (n: number) => (isManager ? "—" : `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

  const onAdd = async () => {
    if (!location?.id || !tank?.id) return;
    if (amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount." });
      return;
    }
    const name = category === "other" ? (customName.trim() || "Other") : categoryLabel[category];
    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      category,
      name,
      amount,
      date: dateStr,
      time: timeStr,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await supabase.from("expenses").insert([
        {
          account_id: accountId,
          location_id: location.id,
          tank_id: tank.id,
          category,
          name,
          notes: entry.notes || null,
          description: name,
          amount: entry.amount,
          incurred_at: entry.date,
        },
      ]);
      const existing = loadExpenses(location.id, tank.id);
      saveExpenses(location.id, tank.id, [entry, ...existing]);
      setAmount(0); setNotes(""); setCustomName(""); setCategory("manpower"); setDateStr(todayKey);
      toast({ title: "Saved", description: `${name} — ₹ ${entry.amount.toFixed(2)}` });
      setRev(r => r + 1);
    } catch (e) {
      toast({ title: "Error", description: "Failed to save expense.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
          <div className="mt-2">
            <h1 className="text-base font-semibold">Tank Expenses</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {!location || !tank ? (
          <Card>
            <CardHeader><CardTitle>Select a tank</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Choose a location and tank above to manage expenses.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Add Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="lease">Lease</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="manpower">Man power</SelectItem>
                        <SelectItem value="salaries">Salaries</SelectItem>
                        <SelectItem value="electricity">Electricity</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="generator">Generator</SelectItem>
                        <SelectItem value="medicine">Medicines</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {category === "other" && (
                    <div className="space-y-2">
                      <Label>Expense name</Label>
                      <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g., Pond cleaning" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Amount (INR)</Label>
                    <Input type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
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
                  <Button onClick={onAdd} disabled={amount <= 0}>Save Expense</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No expenses added yet.</TableCell>
                      </TableRow>
                    ) : (
                      entries.slice(0, 10).map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="capitalize">{categoryLabel[e.category]}</TableCell>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>{e.date}</TableCell>
                          <TableCell>{fmt(e.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total expenses (current crop)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Lease</span><span>{fmt(leaseTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Seed cost</span><span>{fmt(seedCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Medicines (materials)</span><span>{fmt(materialsMedicineCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Other materials</span><span>{fmt(materialsOtherCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Feed cost</span><span>{fmt(feedCost)}</span></div>
                  {Object.entries(totalsByName).filter(([k]) => k !== "Lease" && k !== "Seed").map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between"><span>{k}</span><span>{fmt(v)}</span></div>
                  ))}
                  <div className="border-t pt-2 flex items-center justify-between font-semibold text-foreground"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <TabBar />
    </div>
  );
};

export default Expenses;
