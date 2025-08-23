import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";

interface DeletedTank { 
  id: string; 
  locationId: string; 
  name: string; 
  type: "shrimp" | "fish";
  seed_weight?: number | null;
  pl_size?: number | null;
  total_seed?: number | null;
  area?: number | null;
  status?: string;
  deleted_at: string;
}

interface TankDetail {
  seedDate?: string;
  cropEnd?: string;
  seed_weight?: number | null;
  pl_size?: number | null;
  total_seed?: number | null;
  area?: number | null;
}

interface FeedingEntry { 
  schedule: string; 
  stockName: string; 
  unit: "kg" | "liters" | "bags" | "pieces"; 
  quantity: number; 
  time: string; 
  createdAt: string; 
}

interface MaterialLogEntry { 
  tankId: string; 
  stockId: string; 
  stockName: string; 
  category: "feed" | "medicine" | "equipment" | "others"; 
  unit: "kg" | "liters" | "bags" | "pieces"; 
  quantity: number; 
  time: string; 
  createdAt: string; 
  note?: string;
}

interface ExpenseEntry { 
  id: string; 
  category: string; 
  name: string; 
  amount: number; 
  date: string; 
  time?: string; 
  createdAt: string;
}

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

const RecycleBin = () => {
  const navigate = useNavigate();
  const [deletedTanks, setDeletedTanks] = useState<DeletedTank[]>([]);
  const [selectedTank, setSelectedTank] = useState<DeletedTank | null>(null);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const [rev, setRev] = useState(0);
  const { accountId } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  // Report data states
  const [feedEntries, setFeedEntries] = useState<FeedingEntry[]>([]);
  const [materialEntries, setMaterialEntries] = useState<MaterialLogEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [activeCrop, setActiveCrop] = useState<TankDetail | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useSEO("Recycle Bin | AquaLedger", "View and restore deleted tanks from the recycle bin.");

  const loadDeletedTanks = async () => {
    if (!accountId) return;
    console.log("Loading deleted tanks for account:", accountId);
    
    const { data, error } = await supabase
      .from("tanks")
      .select("id, name, type, location_id, seed_weight, pl_size, total_seed, area, status, deleted_at")
      .eq("account_id", accountId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    
    if (!error && data) {
      console.log("Loaded deleted tanks:", data);
      const mapped = (data || []).map((t: any) => ({ 
        id: t.id, 
        name: t.name, 
        type: t.type, 
        locationId: t.location_id,
        seed_weight: t.seed_weight,
        pl_size: t.pl_size,
        total_seed: t.total_seed,
        area: t.area,
        status: t.status,
        deleted_at: t.deleted_at
      })) as DeletedTank[];
      setDeletedTanks(mapped);
    } else {
      console.error("Error loading deleted tanks:", error);
      if (error) {
        toast({ 
          title: "Database Error", 
          description: "Failed to load deleted tanks. Please refresh the page.", 
          variant: "destructive" 
        });
      }
    }
  };

  useEffect(() => {
    loadDeletedTanks();
  }, [accountId, rev]);

  const onRestoreTank = async (tank: DeletedTank) => {
    try {
      console.log("Restoring tank:", tank.id, "Account ID:", accountId);
      
      const { data, error } = await supabase
        .from("tanks")
        .update({ deleted_at: null, updated_at: new Date().toISOString() })
        .eq("id", tank.id)
        .eq("account_id", accountId)
        .select();
      
      if (error) {
        console.error("Restore tank error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No tank was restored. Tank may not exist or you may not have permission.");
      }
      
      console.log("Tank restored successfully:", data[0]);
      
      // Force reload deleted tanks
      await loadDeletedTanks();
      setRev((r) => r + 1);
      toast({ title: "Restored", description: `${tank.name} has been restored successfully` });
    } catch (e: any) {
      console.error("Failed to restore tank:", e);
      const errorMsg = e?.message || "Failed to restore tank. Please try again.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  const onPermanentDelete = async (tank: DeletedTank) => {
    try {
      console.log("Permanently deleting tank:", tank.id, "Account ID:", accountId);
      
      // Hard delete the tank and all associated data
      const deletePromises = [
        supabase.from("tank_crops").delete().eq("tank_id", tank.id).eq("account_id", accountId),
        supabase.from("feeding_logs").delete().eq("tank_id", tank.id).eq("account_id", accountId),
        supabase.from("material_logs").delete().eq("tank_id", tank.id).eq("account_id", accountId),
        supabase.from("expenses").delete().eq("tank_id", tank.id).eq("account_id", accountId),
      ];
      
      const results = await Promise.allSettled(deletePromises);
      
      // Log any errors from associated data deletion
      results.forEach((result, index) => {
        const tables = ["tank_crops", "feeding_logs", "material_logs", "expenses"];
        if (result.status === "rejected") {
          console.warn(`Failed to delete ${tables[index]} for tank ${tank.id}:`, result.reason);
        }
      });

      const { data, error } = await supabase
        .from("tanks")
        .delete()
        .eq("id", tank.id)
        .eq("account_id", accountId)
        .select();
      
      if (error) {
        console.error("Permanent delete tank error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No tank was deleted. Tank may not exist or you may not have permission.");
      }
      
      console.log("Tank permanently deleted successfully");
      
      // Force reload deleted tanks
      await loadDeletedTanks();
      setRev((r) => r + 1);
      toast({ title: "Permanently Deleted", description: `${tank.name} has been permanently deleted` });
    } catch (e: any) {
      console.error("Failed to permanently delete tank:", e);
      const errorMsg = e?.message || "Failed to permanently delete tank. Please try again.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  };

  const loadTankReportData = async (tank: DeletedTank) => {
    if (!accountId) return;

    // Load active crop data for the tank
    const { data: cropData } = await supabase
      .from("tank_crops")
      .select("seed_date, end_date, seed_weight, pl_size, total_seed, area")
      .eq("tank_id", tank.id)
      .eq("account_id", accountId)
      .order("seed_date", { ascending: false })
      .limit(1);

    if (cropData && cropData.length > 0) {
      const crop = cropData[0] as any;
      setActiveCrop({
        seedDate: crop.seed_date,
        cropEnd: crop.end_date,
        seed_weight: crop.seed_weight,
        pl_size: crop.pl_size,
        total_seed: crop.total_seed,
        area: crop.area
      });
      
      // Set default date range based on crop dates
      if (crop.seed_date) {
        setStartDate(crop.seed_date);
        setEndDate(crop.end_date || format(new Date(), "yyyy-MM-dd"));
      }
    } else {
      setActiveCrop(null);
      // Set default date range to last 30 days
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));
    }

    // Load feeding, material, and expense data
    const startTs = `${startDate || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}T00:00:00`;
    const endTs = `${endDate || format(new Date(), "yyyy-MM-dd")}T23:59:59`;

    const [fRes, mRes, eRes] = await Promise.all([
      supabase.from("feeding_logs").select("id, schedule, stock_id, quantity, fed_at, notes").eq("account_id", accountId).eq("tank_id", tank.id).gte("fed_at", startTs).lte("fed_at", endTs).order("fed_at", { ascending: true }),
      supabase.from("material_logs").select("id, stock_id, quantity, logged_at, note").eq("account_id", accountId).eq("tank_id", tank.id).gte("logged_at", startTs).lte("logged_at", endTs).order("logged_at", { ascending: true }),
      supabase.from("expenses").select("id, name, amount, incurred_at, notes, category").eq("account_id", accountId).eq("tank_id", tank.id).gte("incurred_at", startDate).lte("incurred_at", endDate).order("incurred_at", { ascending: true }),
    ]);

    const fData = (fRes as any).data || [];
    const mData = (mRes as any).data || [];
    const eData = (eRes as any).data || [];

    // Load stock information
    const stockIds = Array.from(new Set([
      ...fData.map((d: any) => d.stock_id).filter(Boolean),
      ...mData.map((d: any) => d.stock_id).filter(Boolean),
    ]));

    const stocksMap = new Map<string, { name: string; unit?: string; category?: string; price_per_unit?: number }>();
    if (stockIds.length) {
      const { data: sData } = await supabase.from("stocks").select("id, name, unit, category, price_per_unit").eq("account_id", accountId).in("id", stockIds as any);
      sData?.forEach((s: any) => stocksMap.set(s.id, { name: s.name, unit: s.unit || undefined, category: s.category || undefined, price_per_unit: Number(s.price_per_unit) || 0 }));
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

  const showTankReport = async (tank: DeletedTank) => {
    setSelectedTank(tank);
    await loadTankReportData(tank);
    setShowReport(true);
  };

  const exportPDF = async () => {
    const target = reportRef.current;
    if (!target || !selectedTank) return;

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

    pdf.save(`deleted-tank-report-${selectedTank.name}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
  };

  const exportCSV = () => {
    if (!selectedTank) return;

    // Group data by date
    const dataByDate = new Map<string, {
      date: string;
      scheduleFeeds: Map<string, number>;
      materials: Array<{ name: string; quantity: number; unit: string }>;
      expenses: Array<{ name: string; amount: number }>;
    }>();

    const sDate = new Date(`${startDate}T00:00:00`);
    const eDate = new Date(`${endDate}T23:59:59`);
    const days: string[] = [];
    for (let t = sDate.getTime(); t <= eDate.getTime(); t += 24*60*60*1000) {
      days.push(format(new Date(t), "yyyy-MM-dd"));
    }

    // Initialize with date range
    for (const day of days) {
      dataByDate.set(day, {
        date: day,
        scheduleFeeds: new Map(),
        materials: [],
        expenses: []
      });
    }

    // Process feeding data by schedule
    feedEntries.forEach(entry => {
      const day = entry.createdAt.slice(0, 10);
      const dayData = dataByDate.get(day);
      if (dayData && entry.unit === "kg") {
        const current = dayData.scheduleFeeds.get(entry.schedule) || 0;
        dayData.scheduleFeeds.set(entry.schedule, current + entry.quantity);
      }
    });

    // Process materials data
    materialEntries.forEach(entry => {
      const day = entry.createdAt.slice(0, 10);
      const dayData = dataByDate.get(day);
      if (dayData) {
        dayData.materials.push({
          name: entry.stockName,
          quantity: entry.quantity,
          unit: entry.unit
        });
      }
    });

    // Process expenses data
    expenseEntries.forEach(entry => {
      const dayData = dataByDate.get(entry.date);
      if (dayData) {
        dayData.expenses.push({
          name: entry.name,
          amount: entry.amount
        });
      }
    });

    // Generate CSV content
    const headers = [
      "Date",
      "Schedule 1",
      "Schedule 2", 
      "Schedule 3",
      "Materials",
      "Material Quantity Used",
      "Expenses Name",
      "Quantity Consumed Till Date",
      "Total Amount"
    ];

    let csvContent = headers.join(",") + "\n";
    let totalFeedConsumed = 0;
    let totalExpenseAmount = 0;

    const sortedDates = Array.from(dataByDate.keys()).sort();
    
    sortedDates.forEach(date => {
      const dayData = dataByDate.get(date)!;
      
      const schedule1 = dayData.scheduleFeeds.get("Schedule 1") || 0;
      const schedule2 = dayData.scheduleFeeds.get("Schedule 2") || 0;
      const schedule3 = dayData.scheduleFeeds.get("Schedule 3") || 0;
      
      totalFeedConsumed += schedule1 + schedule2 + schedule3;
      
      const materials = dayData.materials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join("; ");
      const materialQty = dayData.materials.map(m => `${m.quantity} ${m.unit}`).join("; ");
      const expenses = dayData.expenses.map(e => e.name).join("; ");
      const expenseAmounts = dayData.expenses.reduce((sum, e) => sum + e.amount, 0);
      totalExpenseAmount += expenseAmounts;

      const row = [
        date,
        schedule1.toFixed(2),
        schedule2.toFixed(2),
        schedule3.toFixed(2),
        materials || "",
        materialQty || "",
        expenses || "",
        totalFeedConsumed.toFixed(2),
        `₹${totalExpenseAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
      ];

      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `deleted-tank-report-${selectedTank.name}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate costs for the report
  const feedCost = useMemo(() => feedEntries.reduce((sum, e) => sum + (e.quantity * 0), 0), [feedEntries]);
  const materialsMedicineCost = useMemo(() => materialEntries.filter(m => m.category === "medicine").reduce((s, m) => s + (m.quantity * 0), 0), [materialEntries]);
  const materialsOtherCost = useMemo(() => materialEntries.filter(m => m.category !== "medicine").reduce((s, m) => s + (m.quantity * 0), 0), [materialEntries]);
  const otherExpenses = useMemo(() => expenseEntries.reduce((s, e) => s + e.amount, 0), [expenseEntries]);
  const grandTotal = feedCost + materialsMedicineCost + materialsOtherCost + otherExpenses;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recycle Bin</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Tanks</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tanks in the recycle bin are automatically deleted after 6 months
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Deleted Date</TableHead>
                <TableHead>Days Remaining</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deletedTanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No deleted tanks found.
                  </TableCell>
                </TableRow>
              ) : (
                deletedTanks.map((tank) => {
                  const deletedDate = new Date(tank.deleted_at);
                  const expiryDate = new Date(deletedDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months
                  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
                  
                  return (
                    <TableRow key={tank.id}>
                      <TableCell className="font-medium">{tank.name}</TableCell>
                      <TableCell className="capitalize">{tank.type}</TableCell>
                      <TableCell>{format(deletedDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          daysRemaining < 30 ? "bg-red-100 text-red-700" : 
                          daysRemaining < 60 ? "bg-yellow-100 text-yellow-700" : 
                          "bg-green-100 text-green-700"
                        }`}>
                          {daysRemaining} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => showTankReport(tank)}>
                            View Report
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onRestoreTank(tank)}>
                            Restore
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onPermanentDelete(tank)}>
                            Delete Forever
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tank Report - {selectedTank?.name}</DialogTitle>
          </DialogHeader>
          
          <div ref={reportRef} className="space-y-4 p-4">
            {selectedTank && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Date Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => setStartDate(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => setEndDate(e.target.value)} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tank Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Tank:</span> {selectedTank.name}</div>
                      <div><span className="font-medium">Type:</span> {selectedTank.type}</div>
                      <div><span className="font-medium">Deleted:</span> {format(new Date(selectedTank.deleted_at), "PPP")}</div>
                      <div><span className="font-medium">Period:</span> {startDate} to {endDate}</div>
                      {activeCrop?.seedDate && (
                        <div><span className="font-medium">Seed Date:</span> {format(new Date(activeCrop.seedDate), "PPP")}</div>
                      )}
                      {activeCrop?.total_seed && (
                        <div><span className="font-medium">Total Seed:</span> {activeCrop.total_seed.toLocaleString()}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Feed Cost:</span>
                        <span>₹ {feedCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medicine Cost:</span>
                        <span>₹ {materialsMedicineCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Materials:</span>
                        <span>₹ {materialsOtherCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Expenses:</span>
                        <span>₹ {otherExpenses.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Cost:</span>
                        <span>₹ {grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{feedEntries.length}</div>
                        <div>Feeding Records</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{materialEntries.length}</div>
                        <div>Material Logs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{expenseEntries.length}</div>
                        <div>Expense Records</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>Close</Button>
            <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
            <Button onClick={exportPDF}>Export PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default RecycleBin;