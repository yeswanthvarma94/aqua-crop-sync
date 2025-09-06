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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";


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
type ExpenseCategory = "lease" | "seed" | "manpower" | "salaries" | "electricity" | "diesel" | "generator" | "medicine" | "feed" | "other";
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

// Database helpers
const loadStocks = async (accountId: string, farmId: string): Promise<StockRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('account_id', accountId)
      .eq('farm_id', farmId);
    
    if (error) throw error;
    
    return (data || []).map(stock => ({
      id: stock.id,
      name: stock.name,
      category: stock.category as StockRecord["category"],
      unit: stock.unit as StockRecord["unit"],
      quantity: Number(stock.quantity),
      pricePerUnit: Number(stock.price_per_unit || 0),
      totalAmount: Number(stock.total_amount || 0),
      minStock: Number(stock.min_stock || 0),
      expiryDate: stock.expiry_date || undefined,
      notes: stock.notes || undefined,
      createdAt: stock.created_at,
      updatedAt: stock.updated_at,
    }));
  } catch (error) {
    console.error('Error loading stocks:', error);
    return [];
  }
};

const loadTankDetail = async (accountId: string, tankId: string): Promise<TankDetail | null> => {
  try {
    // Get tank basic info
    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select('*')
      .eq('account_id', accountId)
      .eq('id', tankId)
      .single();
      
    if (tankError) throw tankError;
    
    // Get active crop info
    const { data: crop, error: cropError } = await supabase
      .from('tank_crops')
      .select('*')
      .eq('account_id', accountId)
      .eq('tank_id', tankId)
      .is('end_date', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (cropError && cropError.code !== 'PGRST116') throw cropError;
    
    return {
      tankId: tank.id,
      name: tank.name,
      type: tank.type as "shrimp" | "fish",
      seedDate: crop?.seed_date || undefined,
      cropEnd: crop?.end_date || undefined,
      price: 0, // We'll get this from seed expenses now
    };
  } catch (error) {
    console.error('Error loading tank detail:', error);
    return null;
  }
};

const loadExpenses = async (accountId: string, farmId: string, tankId: string): Promise<ExpenseEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('account_id', accountId)
      .eq('farm_id', farmId)
      .eq('tank_id', tankId)
      .order('incurred_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(expense => ({
      id: expense.id,
      category: expense.category as ExpenseCategory,
      name: expense.name || expense.description,
      amount: Number(expense.amount),
      date: expense.incurred_at,
      time: undefined, // Not stored separately in DB
      notes: expense.notes || undefined,
      createdAt: expense.created_at,
    }));
  } catch (error) {
    console.error('Error loading expenses:', error);
    return [];
  }
};

const saveExpense = async (accountId: string, farmId: string, tankId: string, entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => {
  try {
    const { error } = await supabase
      .from('expenses')
      .insert({
        account_id: accountId,
        farm_id: farmId,
        tank_id: tankId,
        category: entry.category,
        name: entry.name,
        description: entry.name,
        amount: entry.amount,
        incurred_at: entry.date,
        notes: entry.notes,
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
};

// Enhanced FeedingEntry with stock reference
interface FeedingEntryWithPrice extends FeedingEntry {
  stockId: string;
  pricePerUnit: number; // filled via stocks map
}

// Utility to scan feeding entries across crop (no FK join)
const listFeedingAcrossCrop = async (accountId: string, farmId: string, tankId: string, startISO?: string, endISO?: string): Promise<FeedingEntryWithPrice[]> => {
  try {
    let query = supabase
      .from('feeding_logs')
      .select('*')
      .eq('account_id', accountId)
      .eq('farm_id', farmId)
      .eq('tank_id', tankId);
    
    if (startISO) {
      query = query.gte('fed_at', startISO);
    }
    if (endISO) {
      query = query.lte('fed_at', endISO);
    }
    
    const { data, error } = await query.order('fed_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((log: any) => ({
      schedule: log.schedule || 'morning',
      stockName: 'Feed',
      unit: 'kg', // fallback; display only
      quantity: Number(log.quantity),
      time: new Date(log.fed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      createdAt: log.created_at,
      stockId: log.stock_id,
      pricePerUnit: 0,
    }));
  } catch (error) {
    console.error('Error loading feeding entries:', error);
    return [];
  }
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

const listMaterialsAcrossCrop = async (accountId: string, farmId: string, tankId: string, startISO?: string, endISO?: string): Promise<MaterialLogEntry[]> => {
  try {
    let query = supabase
      .from('material_logs')
      .select(`
        *,
        stocks!inner(name, unit, category)
      `)
      .eq('account_id', accountId)
      .eq('farm_id', farmId)
      .eq('tank_id', tankId);
    
    if (startISO) {
      query = query.gte('logged_at', startISO);
    }
    if (endISO) {
      query = query.lte('logged_at', endISO);
    }
    
    const { data, error } = await query.order('logged_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(log => ({
      stockId: log.stock_id,
      stockName: log.stocks.name,
      category: log.stocks.category as StockRecord["category"],
      unit: log.stocks.unit as StockRecord["unit"],
      quantity: Number(log.quantity),
      time: new Date(log.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      notes: log.note || undefined,
      createdAt: log.created_at,
    }));
  } catch (error) {
    console.error('Error loading material logs:', error);
    return [];
  }
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
  feed: "Feed",
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
  const [detail, setDetail] = useState<TankDetail | null>(null);
  const [feedEntries, setFeedEntries] = useState<FeedingEntryWithPrice[]>([]);
  const [materialsEntries, setMaterialsEntries] = useState<MaterialLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);

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

  // Load data when location/tank changes
  useEffect(() => {
    const loadData = async () => {
      if (!accountId || !location?.id || !tank?.id) return;
      
      setLoading(true);
      try {
        // Load all data in parallel
        const [stocksData, expensesData, tankDetail] = await Promise.all([
          loadStocks(accountId, location.id),
          loadExpenses(accountId, location.id, tank.id),
          loadTankDetail(accountId, tank.id)
        ]);

        setStocks(stocksData);
        setEntries(expensesData);
        setDetail(tankDetail);

        // Load feeding and materials data if we have crop dates
        if (tankDetail) {
          const [feedingData, materialsData] = await Promise.all([
            listFeedingAcrossCrop(accountId, location.id, tank.id, tankDetail.seedDate, tankDetail.cropEnd),
            listMaterialsAcrossCrop(accountId, location.id, tank.id, tankDetail.seedDate, tankDetail.cropEnd)
          ]);
          
          setFeedEntries(feedingData);
          setMaterialsEntries(materialsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: "Error", description: "Failed to load data" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accountId, location?.id, tank?.id]);

  // Derived expenses
  const seedCostFromDetail = detail?.price ?? 0;

  // Build price map by stock id (includes feed and materials)
  const priceByStockId = useMemo(() => {
    const map = new Map<string, number>();
    stocks.forEach(s => map.set(s.id, s.pricePerUnit || 0));
    return map;
  }, [stocks]);

  // Calculate feed cost from consumed quantities and stock prices
  const feedCost = useMemo(() =>
    feedEntries.reduce((sum, entry) => sum + (entry.quantity * (priceByStockId.get(entry.stockId) ?? 0)), 0),
    [feedEntries, priceByStockId]
  );

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

  const seedCost = (totalsByCat["seed"] ?? 0) || seedCostFromDetail;
  const leaseTotal = totalsByCat["lease"] ?? 0;
  const generatorTotal = totalsByCat["generator"] ?? 0;
  const manpowerTotal = totalsByCat["manpower"] ?? 0;
  const salariesTotal = totalsByCat["salaries"] ?? 0;
  const electricityTotal = totalsByCat["electricity"] ?? 0;
  const dieselTotal = totalsByCat["diesel"] ?? 0;
  const otherExpensesTotal = totalsByCat["other"] ?? 0;

  const grandTotal = useMemo(
    () => seedCost + leaseTotal + feedCost + materialsMedicineCost + materialsOtherCost + generatorTotal + manpowerTotal + salariesTotal + electricityTotal + dieselTotal + otherExpensesTotal,
    [seedCost, leaseTotal, feedCost, materialsMedicineCost, materialsOtherCost, generatorTotal, manpowerTotal, salariesTotal, electricityTotal, dieselTotal, otherExpensesTotal]
  );

  const isManager = hasRole(["manager"]);
  const fmt = (n: number) => (isManager ? "—" : `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

  const onEditExpense = (expense: ExpenseEntry) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setCustomName(expense.name);
    setAmount(expense.amount);
    setDateStr(expense.date);
    setNotes(expense.notes || "");
  };

  const onAdd = async () => {
    if (!accountId || !location?.id || !tank?.id) return;
    if (amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount." });
      return;
    }
    
    try {
      const name = category === "other" ? (customName.trim() || "Other") : categoryLabel[category];
      
      console.log("Saving expense:", {
        category,
        name,
        amount,
        date: dateStr,
        location: location.id,
        tank: tank.id,
        account: accountId
      });
      
      if (editingExpense) {
        // Update existing expense
        const { data, error } = await supabase
          .from('expenses')
          .update({
            category,
            name,
            description: name,
            amount,
            incurred_at: dateStr,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExpense.id)
          .eq('account_id', accountId)
          .select();
        
        if (error) {
          console.error("Expense update error:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error("No expense was updated. Expense may not exist or you may not have permission.");
        }
        
        console.log("Expense updated successfully:", data[0]);
      } else {
        // Create new expense
        const { data, error } = await supabase
          .from('expenses')
          .insert([{
            account_id: accountId,
            farm_id: location.id,
            tank_id: tank.id,
            category,
            name,
            description: name,
            amount,
            incurred_at: dateStr,
            notes: notes || null,
          }])
          .select();
          
        if (error) {
          console.error("Expense creation error:", error);
          throw error;
        }
        
        console.log("Expense created successfully:", data?.[0]);
      }

      // Reload expenses to reflect changes
      const updatedExpenses = await loadExpenses(accountId, location.id, tank.id);
      setEntries(updatedExpenses);

      // Reset form
      setAmount(0);
      setNotes("");
      setCustomName("");
      setCategory("manpower");
      setDateStr(todayKey);
      setEditingExpense(null);
      
      toast({ 
        title: editingExpense ? "Updated" : "Saved", 
        description: `${name} — ₹${amount.toFixed(2)}` 
      });
    } catch (error: any) {
      console.error(`Failed to ${editingExpense ? "update" : "create"} expense:`, error);
      const errorMsg = error?.message || `Failed to ${editingExpense ? "update" : "save"} expense. Please try again.`;
      toast({ 
        title: "Error", 
        description: errorMsg, 
        variant: "destructive" 
      });
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
            <CardContent className="text-sm text-muted-foreground">Choose a farm and tank above to manage expenses.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</CardTitle>
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

                <div className="mt-4 flex gap-2">
                  <Button onClick={onAdd} disabled={amount <= 0}>
                    {editingExpense ? "Update" : "Add"} Expense
                  </Button>
                  {editingExpense && (
                    <Button variant="outline" onClick={() => {
                      setEditingExpense(null);
                      setAmount(0);
                      setNotes("");
                      setCustomName("");
                      setCategory("manpower");
                      setDateStr(todayKey);
                    }}>
                      Cancel
                    </Button>
                  )}
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.filter(e => e.category !== 'feed' && e.category !== 'medicine').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No manual expenses added yet.</TableCell>
                      </TableRow>
                    ) : (
                      entries.filter(e => e.category !== 'feed' && e.category !== 'medicine').slice(0, 10).map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="capitalize">{categoryLabel[e.category]}</TableCell>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>{e.date}</TableCell>
                          <TableCell>{fmt(e.amount)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => onEditExpense(e)}>Edit</Button>
                          </TableCell>
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
                  <div className="flex items-center justify-between"><span>Feed cost</span><span>{fmt(feedCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Medicines (materials)</span><span>{fmt(materialsMedicineCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Other materials</span><span>{fmt(materialsOtherCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Generator</span><span>{fmt(generatorTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Man power</span><span>{fmt(manpowerTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Electricity</span><span>{fmt(electricityTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Diesel</span><span>{fmt(dieselTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Salaries</span><span>{fmt(salariesTotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Other expenses</span><span>{fmt(otherExpensesTotal)}</span></div>
                  <div className="border-t pt-2 flex items-center justify-between font-semibold text-foreground"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
      
    </div>
  );
};

export default Expenses;
