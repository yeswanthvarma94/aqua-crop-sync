
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelection } from "@/state/SelectionContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, format } from "date-fns";
import { formatIST, nowIST } from "@/lib/time";

import { useAuth } from "@/state/AuthContext";
import { useOfflineStocks } from "@/hooks/useOfflineStocks";

interface StockRecord {
  id: string;
  name: string;
  category: "feed" | "medicine" | "equipment" | "others";
  unit: "kg" | "liters" | "bags" | "pieces";
  quantity: number;
  pricePerUnit: number; // latest price
  totalAmount: number; // cumulative amount spent
  minStock: number;
  expiryDate?: string; // ISO string
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

const Stocks = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { location, setLocation } = useSelection();
  const { toast } = useToast();
  const { accountId } = useAuth();

  const [open, setOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockRecord | null>(null);
  
  // Use offline storage
  const { data: offlineStocks, create, update } = useOfflineStocks();

  // Form state
  const [selectedName, setSelectedName] = useState<string>("");
  const [isOther, setIsOther] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [category, setCategory] = useState<StockRecord["category"]>("feed");
  const [unit, setUnit] = useState<StockRecord["unit"]>("kg");
  const [quantity, setQuantity] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(0);
  const [expiry, setExpiry] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState<string>("");

  useSEO("Stocks | AquaLedger", "Manage stock per farm: add, view, low-stock and expiry alerts.");

  useEffect(() => {
    if (!location && locationId) setLocation({ id: locationId, name: locationId });
  }, [location, locationId, setLocation]);

  // Filter stocks for current farm
  const stocks: StockRecord[] = useMemo(() => {
    if (!locationId) return [];
    return offlineStocks
      .filter(stock => stock.farm_id === locationId)
      .map((s): StockRecord => ({
        id: s.id,
        name: s.name,
        category: s.category as StockRecord["category"],
        unit: s.unit as StockRecord["unit"],
        quantity: Number(s.quantity || 0),
        pricePerUnit: Number(s.price_per_unit || 0),
        totalAmount: 0, // Calculate from price and quantity
        minStock: Number(s.min_stock || 0),
        expiryDate: s.expiry_date || undefined,
        notes: s.note || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
  }, [offlineStocks, locationId]);

  const existingNames: string[] = useMemo(() => Array.from(new Set(stocks.map(s => s.name))).sort(), [stocks]);

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      // reset form when closing
      setSelectedName("");
      setIsOther(false);
      setOtherName("");
      setCategory("feed");
      setUnit("kg");
      setQuantity(0);
      setPricePerUnit(0);
      setMinStock(0);
      setExpiry(undefined);
      setNotes("");
      setEditingStock(null);
    }
  };

  const onEditStock = (stock: StockRecord) => {
    setEditingStock(stock);
    setSelectedName(stock.name);
    setCategory(stock.category);
    setUnit(stock.unit);
    setQuantity(stock.quantity);
    setPricePerUnit(stock.pricePerUnit);
    setMinStock(stock.minStock);
    setExpiry(stock.expiryDate ? new Date(stock.expiryDate) : undefined);
    setNotes(stock.notes || "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    console.log("Form submission started", { locationId, accountId, quantity, pricePerUnit, minStock, selectedName, otherName, isOther });
    
    if (!locationId || !accountId) {
      console.log("Missing locationId or accountId", { locationId, accountId });
      return;
    }
    const name = isOther ? otherName.trim() : selectedName.trim();
    if (!name) {
      console.log("Missing name", { name, isOther, selectedName, otherName });
      toast({ title: "Missing stock name", description: "Please select or enter a stock name." });
      return;
    }
    if (quantity <= 0) {
      console.log("Invalid quantity", { quantity, type: typeof quantity });
      toast({ title: "Invalid quantity", description: "Quantity must be greater than zero." });
      return;
    }
    if (pricePerUnit < 0 || minStock < 0) {
      console.log("Invalid price or min stock", { pricePerUnit, minStock });
      toast({ title: "Invalid values", description: "Price and minimum stock cannot be negative." });
      return;
    }

    try {
      const expiryDateStr = expiry ? format(expiry, "yyyy-MM-dd") : null;

      if (editingStock) {
        // Update existing stock
        await update(editingStock.id, {
          name,
          category,
          unit: unit,
          quantity,
          price_per_unit: pricePerUnit,
          min_stock: minStock,
          expiry_date: expiryDateStr,
          note: notes || null,
        });
      } else {
        // Create new stock
        await create({
          account_id: accountId,
          farm_id: locationId,
          name,
          category,
          unit: unit,
          quantity,
          price_per_unit: pricePerUnit,
          min_stock: minStock,
          expiry_date: expiryDateStr,
          note: notes || null,
        });
      }

      handleOpen(false);
      toast({ 
        title: editingStock ? "Updated" : "Saved", 
        description: `${name} — ${quantity} ${unit}` 
      });
    } catch (e: any) {
      console.error(`Failed to ${editingStock ? "update" : "save"} stock:`, e);
      const errorMsg = e?.message || `Failed to ${editingStock ? "update" : "save"} stock. Please try again.`;
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
        <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Stocks</h1>
            <p className="text-xs text-muted-foreground">Per-location inventory with alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Home</Button>
            <Dialog open={open} onOpenChange={handleOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Stock</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>{editingStock ? "Edit Stock" : "Add Stock"}</DialogTitle>
                </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid gap-2">
                  <Label>Stock Name</Label>
                  <Select
                    value={isOther ? "__other" : selectedName}
                    onValueChange={(val) => {
                      if (val === "__other") { setIsOther(true); setSelectedName(""); }
                      else { setIsOther(false); setSelectedName(val); }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select existing or choose Other" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                       {existingNames.map((n: string) => (
                         <SelectItem key={n} value={n}>{n}</SelectItem>
                       ))}
                      <SelectItem value="__other">Other…</SelectItem>
                    </SelectContent>
                  </Select>
                  {isOther && (
                    <Input placeholder="Enter new stock name" value={otherName} onChange={(e) => setOtherName(e.target.value)} />
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="feed">Feed</SelectItem>
                      <SelectItem value="medicine">Medicine</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Quantity</Label>
                    <Input type="number" inputMode="decimal" min={0} step="any" value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Units</Label>
                    <Select value={unit} onValueChange={(v) => setUnit(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        <SelectItem value="kg">KG</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="bags">Bags</SelectItem>
                        <SelectItem value="pieces">Pieces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Price per unit (INR)</Label>
                    <Input type="number" inputMode="decimal" min={0} step="any" value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Min stock alert</Label>
                    <Input type="number" inputMode="decimal" min={0} step="any" value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Expiry date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start font-normal", !expiry && "text-muted-foreground")}> 
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiry ? format(expiry, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={expiry} onSelect={setExpiry} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Notes (optional)</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any remarks…" />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleSubmit}>{editingStock ? "Update" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price/unit</TableHead>
                <TableHead>Total amount</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No stock yet. Add your first item.</TableCell>
                </TableRow>
              ) : (
                stocks.map((s) => {
                  const exp = s.expiryDate ? new Date(s.expiryDate) : undefined;
                  const days = exp ? differenceInCalendarDays(exp, nowIST()) : undefined;
                  const low = s.quantity < s.minStock;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          {low && <Badge variant="destructive">Low stock</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{s.category}</TableCell>
                      <TableCell>{s.quantity}</TableCell>
                      <TableCell className="uppercase">{s.unit}</TableCell>
                      <TableCell>₹ {s.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell>₹ {s.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        {exp ? (
                          <div className="flex items-center gap-2">
                            <span>{formatIST(exp, "dd MMM yyyy")}</span>
                            {typeof days === "number" && days <= 30 && days >= 0 && (
                              <Badge variant="secondary">Expiring in {days}d</Badge>
                            )}
                            {typeof days === "number" && days < 0 && (
                              <Badge variant="outline">Expired</Badge>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={s.notes}>{s.notes || "—"}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => onEditStock(s)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableCaption className="px-4 pb-4">Price/unit shows weighted average. Total amount reflects value of available stock.</TableCaption>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Stocks;
