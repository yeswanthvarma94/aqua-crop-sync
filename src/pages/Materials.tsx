
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
import { Edit2, Trash2 } from "lucide-react";

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
  const { accountId } = useAuth();

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
  const [editingMaterial, setEditingMaterial] = useState<any>(null);

  const loadStocks = async (farmId: string) => {
    if (!accountId) return;
    console.log("Loading stocks for materials page. Farm:", farmId, "Account:", accountId);
    
    const { data, error } = await supabase
      .from("stocks")
      .select("id, name, category, unit, quantity, price_per_unit, total_amount, min_stock, expiry_date, notes, created_at, updated_at")
      .eq("account_id", accountId)
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      console.log("Loaded stocks for materials:", data.length, "items");
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
        updatedAt: s.updated_at,
      }));
      setStocks(mapped);
    } else {
      console.error("Error loading stocks for materials:", error);
      if (error) {
        toast({ 
          title: "Database Error", 
          description: "Failed to load stocks. Please refresh the page.", 
          variant: "destructive" 
        });
      }
    }
  };

  const loadLogs = async (farmId: string, tankId: string, dateKey: string) => {
    if (!accountId) return;
    console.log("Loading material logs. Farm:", farmId, "Tank:", tankId, "Date:", dateKey, "Account:", accountId);
    
    const start = new Date(`${dateKey}T00:00:00.000Z`);
    const end = new Date(`${dateKey}T23:59:59.999Z`);
    
    const { data, error } = await supabase
      .from("material_logs")
      .select("id, stock_id, quantity, note, tank_id, farm_id, logged_at, stocks(name, category, unit)")
      .eq("account_id", accountId)
      .eq("farm_id", farmId)
      .eq("tank_id", tankId)
      .gte("logged_at", start.toISOString())
      .lte("logged_at", end.toISOString())
      .order("logged_at", { ascending: true });
      
    if (!error && data) {
      console.log("Loaded material logs:", data.length, "entries");
      const mapped: MaterialLogEntry[] = (data || []).map((e: any) => ({
        tankId: e.tank_id,
        stockId: e.stock_id,
        stockName: e.stocks?.name || "",
        category: e.stocks?.category || "others",
        unit: e.stocks?.unit || "kg",
        quantity: Number(e.quantity),
        time: new Date(e.logged_at).toISOString().slice(11, 16),
        notes: e.note || undefined,
        createdAt: e.id, // Use id for editing/deleting instead of logged_at
      }));
      setEntries(mapped);
    } else {
      console.error("Error loading material logs:", error);
      if (error) {
        toast({ 
          title: "Database Error", 
          description: "Failed to load material logs. Please refresh the page.", 
          variant: "destructive" 
        });
      }
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

  const onEditMaterial = (entry: any, materialId: string) => {
    setEditingMaterial({ ...entry, id: materialId });
    setSelectedStockId(entry.stockId);
    setQuantity(entry.quantity);
    setTimeStr(entry.time);
    setNotes(entry.notes || "");
  };

  const onDeleteMaterial = async (materialId: string) => {
    if (!accountId) return;
    
    try {
      // First get the material entry details to restore stock
      const { data: materialEntry, error: fetchError } = await supabase
        .from("material_logs")
        .select("stock_id, quantity")
        .eq("id", materialId)
        .eq("account_id", accountId)
        .single();

      if (fetchError) {
        console.error("Error fetching material entry:", fetchError);
        throw fetchError;
      }

      if (!materialEntry) {
        throw new Error("Material entry not found");
      }

      // Restore stock quantity
      const { data: currentStock, error: stockFetchError } = await supabase
        .from("stocks")
        .select("quantity")
        .eq("id", materialEntry.stock_id)
        .single();

      if (stockFetchError) {
        console.error("Error fetching current stock:", stockFetchError);
        throw stockFetchError;
      }

      const restoredQuantity = Number(currentStock.quantity) + Number(materialEntry.quantity);
      
      const { error: stockUpdateError } = await supabase
        .from("stocks")
        .update({ quantity: restoredQuantity })
        .eq("id", materialEntry.stock_id);

      if (stockUpdateError) {
        console.error("Error restoring stock:", stockUpdateError);
        throw stockUpdateError;
      }

      // Delete the material entry
      const { error: deleteError } = await supabase
        .from("material_logs")
        .delete()
        .eq("id", materialId)
        .eq("account_id", accountId);

      if (deleteError) {
        console.error("Delete material entry error:", deleteError);
        throw deleteError;
      }

      // Delete associated expense entries  
      await supabase
        .from("expenses")
        .delete()
        .eq("account_id", accountId)
        .eq("tank_id", tank?.id)
        .ilike("description", "%material usage%");
      
      console.log("Material entry deleted and stock restored successfully");
      
      // Force reload data
      if (location?.id) {
        await loadStocks(location.id);
        if (tank?.id) {
          await loadLogs(location.id, tank.id, todayKey);
        }
      }
      setRev(r => r + 1);
      
      toast({ title: "Deleted", description: "Material usage removed and stock restored" });
    } catch (error: any) {
      console.error("Failed to delete material entry:", error);
      const errorMsg = error?.message || "Failed to delete material entry. Please try again.";
      toast({ 
        title: "Error", 
        description: errorMsg, 
        variant: "destructive" 
      });
    }
  };

  const saveUsage = async () => {
    if (!location?.id || !tank?.id || !accountId) return;
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

    try {
      console.log("Saving material usage:", {
        stock: selectedStock.name,
        quantity,
        location: location.id,
        tank: tank.id,
        account: accountId,
        isEditing: !!editingMaterial
      });
      
      // Compute logged_at from selected date (todayKey) and time
      const loggedAt = new Date(`${todayKey}T${timeStr}:00.000Z`);
      const weightedAvgPrice = selectedStock.pricePerUnit || 0;

      if (editingMaterial) {
        // Editing existing material entry
        // 1) Get original entry to restore stock
        const { data: originalEntry, error: fetchError } = await supabase
          .from("material_logs")
          .select("stock_id, quantity")
          .eq("id", editingMaterial.id)
          .single();

        if (fetchError) throw fetchError;

        // 2) Restore original quantity to stock
        const { data: currentStock, error: stockFetchError } = await supabase
          .from("stocks")
          .select("quantity")
          .eq("id", originalEntry.stock_id)
          .single();

        if (stockFetchError) throw stockFetchError;

        const restoredQuantity = Number(currentStock.quantity) + Number(originalEntry.quantity);
        
        // 3) Subtract new quantity
        const finalQuantity = restoredQuantity - quantity;
        
        if (finalQuantity < 0) {
          throw new Error(`Insufficient stock. Available: ${restoredQuantity}, Required: ${quantity}`);
        }

        // 4) Update stock with final quantity
        const { error: stockUpdateError } = await supabase
          .from("stocks")
          .update({ quantity: finalQuantity })
          .eq("id", selectedStock.id);

        if (stockUpdateError) throw stockUpdateError;

        // 5) Update material log
        const { error: updateError } = await supabase
          .from("material_logs")
          .update({
            stock_id: selectedStock.id,
            quantity: quantity,
            price_per_unit: weightedAvgPrice,
            note: notes || null,
            logged_at: loggedAt.toISOString(),
          })
          .eq("id", editingMaterial.id);

        if (updateError) throw updateError;

        // 6) Update associated expense
        const materialAmount = quantity * weightedAvgPrice;
        const incurredDate = loggedAt.toISOString().slice(0, 10);
        
        await supabase
          .from("expenses")
          .update({
            name: `${selectedStock.name} ${selectedStock.category}`,
            description: `Auto-added for material usage (₹${weightedAvgPrice.toFixed(2)}/unit)`,
            amount: materialAmount,
            incurred_at: incurredDate,
            notes: notes || null,
          })
          .eq("account_id", accountId)
          .eq("tank_id", tank.id)
          .eq("category", selectedStock.category)
          .ilike("description", "%material usage%");

        toast({ title: "Updated", description: "Material usage updated successfully" });
      } else {
        // Creating new material entry
        // 1) Insert material log with weighted average price
        const { data: logData, error: logError } = await supabase
          .from("material_logs")
          .insert([{
            account_id: accountId,
            farm_id: location.id,
            tank_id: tank.id,
            stock_id: selectedStock.id,
            quantity,
            price_per_unit: weightedAvgPrice,
            note: notes || null,
            logged_at: loggedAt.toISOString(),
          }])
          .select();
          
        if (logError) {
          console.error("Material log creation error:", logError);
          throw logError;
        }
        
        console.log("Material log created successfully:", logData?.[0]);

        // 2) Fetch latest stock quantity and subtract used quantity
        const { data: stockRow, error: stockFetchError } = await supabase
          .from("stocks")
          .select("quantity")
          .eq("id", selectedStock.id)
          .eq("account_id", accountId)
          .maybeSingle();
          
        if (stockFetchError) {
          console.error("Error fetching stock for update:", stockFetchError);
          throw stockFetchError;
        }
        
        const currentQty = Number(stockRow?.quantity ?? 0);
        const newQty = Math.max(0, currentQty - Number(quantity));
        
        console.log("Updating stock quantity from", currentQty, "to", newQty);
        
        const { data: stockUpdateData, error: stockUpdateError } = await supabase
          .from("stocks")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", selectedStock.id)
          .eq("account_id", accountId)
          .select();
          
        if (stockUpdateError) {
          console.error("Stock update error:", stockUpdateError);
          throw stockUpdateError;
        }
        
        console.log("Stock updated successfully:", stockUpdateData?.[0]);

        // 3) Create expense for material usage
        const materialAmount = quantity * weightedAvgPrice;
        const incurredDate = loggedAt.toISOString().slice(0, 10);
        
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .insert([{
            account_id: accountId,
            farm_id: location.id,
            tank_id: tank.id,
            category: selectedStock.category,
            name: `${selectedStock.name} ${selectedStock.category}`,
            description: `Auto-added for material usage (₹${weightedAvgPrice.toFixed(2)}/unit)`,
            amount: materialAmount,
            incurred_at: incurredDate,
            notes: notes || null,
          }])
          .select();
          
        if (expenseError) {
          console.error("Expense creation error:", expenseError);
          throw expenseError;
        }
        
        console.log("Expense created successfully:", expenseData?.[0]);

        toast({ 
          title: "Saved", 
          description: `${selectedStock.name} — ${quantity} ${selectedStock.unit} (₹${materialAmount.toFixed(2)})` 
        });
      }

      // Reset inputs and refresh data
      setQuantity(0);
      setNotes("");
      setSelectedStockId("");
      setEditingMaterial(null);
      
      // Force reload data to reflect changes
      await loadStocks(location.id);
      await loadLogs(location.id, tank.id, todayKey);
      
      setRev((r) => r + 1);
    } catch (e: any) {
      console.error("Failed to save material usage:", e);
      const errorMsg = e?.message || "Failed to save material usage. Please try again.";
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
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Materials</h2>
            <Button size="sm" variant="secondary" onClick={() => navigate("/")}>Home</Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {!location ? (
          <Card>
            <CardHeader>
              <CardTitle>Select a farm</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Choose a farm to manage materials.</p>
              <Button onClick={() => navigate("/farms")}>Go to Farms</Button>
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
                <CardTitle>{editingMaterial ? "Edit Material Usage" : "Log Material Usage"}</CardTitle>
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

                <div className="mt-4 flex gap-2">
                  <Button onClick={saveUsage} disabled={!tank?.id || !selectedStock || quantity <= 0 || quantity > remaining}>
                    {editingMaterial ? "Update" : "Save"}
                  </Button>
                  {editingMaterial && (
                    <Button variant="outline" onClick={() => {
                      setEditingMaterial(null);
                      setQuantity(0);
                      setNotes("");
                      setSelectedStockId("");
                    }}>
                      Cancel
                    </Button>
                  )}
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No usage logged yet.</TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{e.stockName || e.stockId}</TableCell>
                          <TableCell>{e.quantity}</TableCell>
                          <TableCell className="uppercase">{e.unit}</TableCell>
                          <TableCell className="capitalize">{e.category}</TableCell>
                          <TableCell>{e.time}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onEditMaterial(e, e.createdAt)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onDeleteMaterial(e.createdAt)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
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

      
    </div>
  );
};

export default Materials;
