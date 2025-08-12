import { useEffect, useMemo, useRef, useState } from "react";
import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSelection } from "@/state/SelectionContext";
import { useAuth } from "@/state/AuthContext";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

// Local models reused
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
interface FeedingEntry { schedule: string; stockName: string; unit: StockRecord["unit"]; quantity: number; time: string; createdAt: string; }
interface MaterialLogEntry { tankId: string; stockId: string; stockName: string; category: StockRecord["category"]; unit: StockRecord["unit"]; quantity: number; time: string; createdAt: string; note?: string }
interface ExpenseEntry { id: string; category: string; name: string; amount: number; date: string; time?: string; createdAt: string }
interface TankDetail { tankId: string; name: string; type: "shrimp" | "fish"; seedDate?: string; cropEnd?: string; totalSeed?: number }

const stockKey = (locationId: string) => `stocks:${locationId}`;
const loadStocks = (locationId: string): StockRecord[] => {
  try { const raw = localStorage.getItem(stockKey(locationId)); return raw ? JSON.parse(raw) as StockRecord[] : []; } catch { return []; }
};
const loadTankDetail = (tankId: string): TankDetail | null => {
  try { const raw = localStorage.getItem(`tankDetail:${tankId}`); return raw ? JSON.parse(raw) as TankDetail : null; } catch { return null; }
};

const feedingKeyPrefix = (locationId: string, tankId: string) => `feeding:${locationId}:${tankId}:`;
const materialsKeyPrefix = (locationId: string, tankId: string) => `materials:logs:${locationId}:${tankId}:`;
const expensesKey = (locationId: string, tankId: string) => `expenses:${locationId}:${tankId}`;

const listFeedingInRange = (locationId: string, tankId: string, start: Date, end: Date): FeedingEntry[] => {
  const items: FeedingEntry[] = [];
  const prefix = feedingKeyPrefix(locationId, tankId);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith(prefix)) continue;
    const dateStr = key.substring(prefix.length);
    const d = new Date(`${dateStr}T00:00:00`);
    if (d < start || d > end) continue;
    try { const raw = localStorage.getItem(key); if (raw) items.push(...(JSON.parse(raw) as FeedingEntry[])); } catch {}
  }
  return items;
};

const listMaterialsInRange = (locationId: string, tankId: string, start: Date, end: Date): MaterialLogEntry[] => {
  const items: MaterialLogEntry[] = [];
  const prefix = materialsKeyPrefix(locationId, tankId);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith(prefix)) continue;
    const dateStr = key.substring(prefix.length);
    const d = new Date(`${dateStr}T00:00:00`);
    if (d < start || d > end) continue;
    try { const raw = localStorage.getItem(key); if (raw) items.push(...(JSON.parse(raw) as MaterialLogEntry[])); } catch {}
  }
  return items;
};

const loadExpenses = (locationId: string, tankId: string): ExpenseEntry[] => {
  try { const raw = localStorage.getItem(expensesKey(locationId, tankId)); return raw ? JSON.parse(raw) as ExpenseEntry[] : []; } catch { return []; }
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

const Reports = () => {
  const { location, tank } = useSelection();
  const { accountId, hasRole } = useAuth();
  useSEO("Reports | AquaLedger", "Reports with date range, FCR trend, feed/day and cost breakdown.");

  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const statementRef = useRef<HTMLDivElement>(null);

  const detail = useMemo(() => (tank ? loadTankDetail(tank.id) : null), [tank?.id]);
  const defaultStart = useMemo(() => detail?.seedDate ? new Date(detail.seedDate) : new Date(Date.now() - 13*24*60*60*1000), [detail?.seedDate]);
  const [startDate, setStartDate] = useState<string>(format(defaultStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [abw, setAbw] = useState<number>(1); // g
  const [fr, setFr] = useState<number>(2); // %
  const [sr, setSr] = useState<number>(90); // %

  // stocks will be loaded from Supabase based on entries used in the selected period

  const priceByStockName = useMemo(() => {
    const map = new Map<string, number>();
    stocks.filter(s => s.category === "feed").forEach(s => map.set(s.name, s.pricePerUnit || 0));
    return map;
  }, [stocks]);
  const priceByStockId = useMemo(() => {
    const map = new Map<string, number>();
    stocks.filter(s => s.category !== "feed").forEach(s => map.set(s.id, s.pricePerUnit || 0));
    return map;
  }, [stocks]);

  const sDate = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const eDate = useMemo(() => new Date(`${endDate}T23:59:59`), [endDate]);

  const [feedEntries, setFeedEntries] = useState<FeedingEntry[]>([]);
  const [materialEntries, setMaterialEntries] = useState<MaterialLogEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!accountId || !location?.id || !tank?.id) {
        setFeedEntries([]); setMaterialEntries([]); setExpenseEntries([]); setStocks([]);
        return;
      }
      const startTs = `${startDate}T00:00:00`;
      const endTs = `${endDate}T23:59:59`;
      const [fRes, mRes, eRes] = await Promise.all([
        supabase.from("feeding_logs").select("id, schedule, stock_id, quantity, fed_at, notes").eq("account_id", accountId).eq("location_id", location.id).eq("tank_id", tank.id).gte("fed_at", startTs).lte("fed_at", endTs).order("fed_at", { ascending: true }),
        supabase.from("material_logs").select("id, stock_id, quantity, logged_at, note").eq("account_id", accountId).eq("location_id", location.id).eq("tank_id", tank.id).gte("logged_at", startTs).lte("logged_at", endTs).order("logged_at", { ascending: true }),
        supabase.from("expenses").select("id, name, amount, incurred_at, notes, category").eq("account_id", accountId).eq("location_id", location.id).eq("tank_id", tank.id).gte("incurred_at", startDate).lte("incurred_at", endDate).order("incurred_at", { ascending: true }),
      ]);
      const fData = (fRes as any).data || [];
      const mData = (mRes as any).data || [];
      const eData = (eRes as any).data || [];

      const stockIds = Array.from(new Set([
        ...fData.map((d: any) => d.stock_id).filter(Boolean),
        ...mData.map((d: any) => d.stock_id).filter(Boolean),
      ]));

      const stocksMap = new Map<string, { name: string; unit?: string; category?: string; price_per_unit?: number }>();
      if (stockIds.length) {
        const { data: sData } = await supabase.from("stocks").select("id, name, unit, category, price_per_unit").eq("account_id", accountId).in("id", stockIds as any);
        sData?.forEach((s: any) => stocksMap.set(s.id, { name: s.name, unit: s.unit || undefined, category: s.category || undefined, price_per_unit: Number(s.price_per_unit) || 0 }));
        setStocks((sData || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          unit: (s.unit || "kg") as any,
          category: (s.category || "others") as any,
          quantity: 0,
          pricePerUnit: Number(s.price_per_unit) || 0,
          totalAmount: 0,
          minStock: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as StockRecord)));
      } else {
        setStocks([]);
      }

      setFeedEntries(fData.map((d: any) => ({
        schedule: d.schedule || "",
        stockName: stocksMap.get(d.stock_id || "")?.name || "",
        unit: (stocksMap.get(d.stock_id || "")?.unit || "kg") as any,
        quantity: Number(d.quantity) || 0,
        time: new Date(d.fed_at).toLocaleTimeString(),
        createdAt: new Date(d.fed_at).toISOString(),
      })));

      setMaterialEntries(mData.map((d: any) => ({
        tankId: tank.id,
        stockId: d.stock_id || "",
        stockName: stocksMap.get(d.stock_id || "")?.name || "",
        category: (stocksMap.get(d.stock_id || "")?.category || "others") as any,
        unit: (stocksMap.get(d.stock_id || "")?.unit || "kg") as any,
        quantity: Number(d.quantity) || 0,
        time: new Date(d.logged_at).toLocaleTimeString(),
        createdAt: new Date(d.logged_at).toISOString(),
        note: d.note || "",
      })));

      setExpenseEntries(eData.map((d: any) => ({
        id: d.id,
        category: d.category || "",
        name: d.name || "",
        amount: Number(d.amount) || 0,
        date: d.incurred_at,
        createdAt: new Date(d.incurred_at).toISOString(),
      })));
    };
    load();
  }, [accountId, location?.id, tank?.id, startDate, endDate]);

  // per-day aggregation
  const days: string[] = useMemo(() => {
    const res: string[] = [];
    for (let t = sDate.getTime(); t <= eDate.getTime(); t += 24*60*60*1000) res.push(format(new Date(t), "yyyy-MM-dd"));
    return res;
  }, [sDate, eDate]);

  const initialStock = detail?.totalSeed ?? 0;
  const recommendedFeedPerDay = useMemo(() => {
    const rec = new Map<string, number>();
    for (const d of days) {
      const kg = (initialStock * abw * fr * sr) / 1000 / 100 / 100; // divide by 100 for % FR and SR
      rec.set(d, Number.isFinite(kg) ? kg : 0);
    }
    return rec;
  }, [days, initialStock, abw, fr, sr]);

  const actualFeedPerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) map.set(d, 0);
    for (const e of feedEntries) {
      const day = e.createdAt.slice(0,10);
      if (!map.has(day)) map.set(day, 0);
      // assume feed quantity is in kg when unit is kg, otherwise skip
      if (e.unit === "kg") map.set(day, (map.get(day) || 0) + e.quantity);
    }
    return map;
  }, [days, feedEntries]);

  const fcrTrendData = useMemo(() => {
    const data: { date: string; fcr?: number; actual: number; rec: number; biomass?: number }[] = [];
    let cumFeed = 0;
    for (const d of days) {
      const actual = actualFeedPerDay.get(d) || 0;
      const rec = recommendedFeedPerDay.get(d) || 0;
      cumFeed += actual;
      const biomass = fr > 0 ? actual / (fr/100) : undefined;
      const fcr = biomass && biomass > 0 ? cumFeed / biomass : undefined;
      data.push({ date: d, fcr, actual, rec, biomass });
    }
    return data;
  }, [days, actualFeedPerDay, recommendedFeedPerDay, fr]);

  const feedTable = useMemo(() => {
    let cum = 0;
    return fcrTrendData.map((r) => {
      cum += r.actual || 0;
      return { ...r, cum };
    });
  }, [fcrTrendData]);

  // costs in range
  const feedCost = useMemo(() => feedEntries.reduce((sum, e) => sum + (e.quantity * (priceByStockName.get(e.stockName) ?? 0)), 0), [feedEntries, priceByStockName]);
  const materialsMedicineCost = useMemo(() => materialEntries.filter(m => m.category === "medicine").reduce((s, m) => s + (m.quantity * (priceByStockId.get(m.stockId) ?? 0)), 0), [materialEntries, priceByStockId]);
  const materialsOtherCost = useMemo(() => materialEntries.filter(m => m.category !== "medicine").reduce((s, m) => s + (m.quantity * (priceByStockId.get(m.stockId) ?? 0)), 0), [materialEntries, priceByStockId]);
  const otherExpenses = useMemo(() => expenseEntries.reduce((s, e) => s + e.amount, 0), [expenseEntries]);
  const grandTotal = feedCost + materialsMedicineCost + materialsOtherCost + otherExpenses;

  const isManager = hasRole(["manager"]);
  const fmt = (n: number) => (isManager ? "—" : `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);

  const statement = useMemo(() => {
    const map = new Map<string, { feed: FeedingEntry[]; materials: MaterialLogEntry[]; expenses: ExpenseEntry[] }>();
    const ensure = (d: string) => {
      if (!map.has(d)) map.set(d, { feed: [], materials: [], expenses: [] });
      return map.get(d)!;
    };
    feedEntries.forEach((e) => ensure(e.createdAt.slice(0,10)).feed.push(e));
    materialEntries.forEach((m) => ensure(m.createdAt.slice(0,10)).materials.push(m));
    expenseEntries.forEach((e) => ensure(e.date).expenses.push(e));
    const dates = Array.from(map.keys()).sort();
    return { map, dates };
  }, [feedEntries, materialEntries, expenseEntries]);

  const rootRef = useRef<HTMLDivElement>(null);
  const exportPDF = async () => {
    const target = statementRef.current || rootRef.current;
    if (!target) return;
    window.scrollTo(0, 0);
    const canvas = await html2canvas(target, {
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save(`tank-statement-${tank?.name || "report"}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-base font-semibold">Reports</h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={exportPDF}>Export PDF</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4" ref={rootRef} id="reportRoot">
        {!location || !tank ? (
          <Card>
            <CardHeader><CardTitle>Select a tank</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Choose a location and tank above to view reports.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Filters & Formula Inputs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Start date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Initial Stocking (pcs)</Label><Input type="number" value={initialStock} readOnly /></div>
                  <div className="space-y-2"><Label>ABW (g)</Label><Input type="number" inputMode="decimal" step="any" value={abw} onChange={(e) => setAbw(Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>FR (%)</Label><Input type="number" inputMode="decimal" step="any" value={fr} onChange={(e) => setFr(Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>SR (%)</Label><Input type="number" inputMode="decimal" step="any" value={sr} onChange={(e) => setSr(Number(e.target.value))} /></div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Formulas: Daily Feed (kg) = Initial Stocking × ABW × FR × SR / 1000. Biomass (kg) = Daily Feed (kg) ÷ FR(%). FCR = Cumulative Feed ÷ Biomass.</p>
              </CardContent>
            </Card>

            <div ref={statementRef} id="tank-statement">
              <Card>
                <CardHeader>
                  <CardTitle>Tank Statement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Tank:</span> {tank.name}</div>
                    <div><span className="font-medium">Location:</span> {location.name}</div>
                    <div><span className="font-medium">Period:</span> {startDate} to {endDate}</div>
                  </div>
                  {statement.dates.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No activity in the selected period.</p>
                  ) : (
                    <div className="mt-4 space-y-6">
                      {statement.dates.map((d) => {
                        const day = statement.map.get(d)!;
                        return (
                          <div key={d} className="space-y-3">
                            <div className="text-sm font-semibold">{d}</div>
                            {day.feed.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Daily Feed</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Time</TableHead>
                                      <TableHead>Schedule</TableHead>
                                      <TableHead>Feed</TableHead>
                                      <TableHead>Qty</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.feed.map((e, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{e.time}</TableCell>
                                        <TableCell>{e.schedule}</TableCell>
                                        <TableCell>{e.stockName}</TableCell>
                                        <TableCell>{`${e.quantity} ${e.unit}`}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            {day.materials.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Materials Used</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Time</TableHead>
                                      <TableHead>Material</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead>Notes</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.materials.map((m, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{m.time}</TableCell>
                                        <TableCell>{m.stockName}</TableCell>
                                        <TableCell>{m.quantity}</TableCell>
                                        <TableCell className="uppercase">{m.unit}</TableCell>
                                        <TableCell>{m.note}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            {day.expenses.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Expenses</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.expenses.map((e) => (
                                      <TableRow key={e.id}>
                                        <TableCell>{e.name}</TableCell>
                                        <TableCell>{fmt(e.amount)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Feed per Day</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={fcrTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="actual" name="Actual (kg)" fill="hsl(var(--primary))" />
                    <Bar yAxisId="left" dataKey="rec" name="Recommended (kg)" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>FCR Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={fcrTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="fcr" name="FCR" stroke="hsl(var(--primary))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Feed per Day (table)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Actual (kg)</TableHead>
                      <TableHead>Recommended (kg)</TableHead>
                      <TableHead>Cumulative Feed (kg)</TableHead>
                      <TableHead>Biomass (kg)</TableHead>
                      <TableHead>FCR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedTable.map((r) => (
                      <TableRow key={r.date}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{(r.actual ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{(r.rec ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{(r.cum ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{(r.biomass ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{r.fcr ? r.fcr.toFixed(2) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Costs (selected period)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Feed cost</span><span>{fmt(feedCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Medicines</span><span>{fmt(materialsMedicineCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Other materials</span><span>{fmt(materialsOtherCost)}</span></div>
                  <div className="flex items-center justify-between"><span>Other expenses</span><span>{fmt(otherExpenses)}</span></div>
                  <div className="border-t pt-2 flex items-center justify-between font-semibold text-foreground"><span>Grand Total</span><span>{fmt(grandTotal)}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Materials used (selected period)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialEntries.map((m, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{m.createdAt.slice(0,10)}</TableCell>
                        <TableCell>{m.stockName}</TableCell>
                        <TableCell className="capitalize">{m.category}</TableCell>
                        <TableCell>{m.quantity}</TableCell>
                        <TableCell className="uppercase">{m.unit}</TableCell>
                        <TableCell>{fmt(m.quantity * (priceByStockId.get(m.stockId) ?? 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expenses (selected period)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.date}</TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{fmt(e.amount)}</TableCell>
                      </TableRow>
                    ))}
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

export default Reports;
