
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useSelection } from "@/state/SelectionContext";
import { cropDayFromStartIST, nowIST } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";
import { loadPlan, checkTankLimit } from "@/lib/subscription";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }

interface TankDetail {
  seedDate?: string;
  cropEnd?: string;
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

const Tanks = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { location, setLocation, setTank } = useSelection();

  const [open, setOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"shrimp" | "fish">("fish");
  const [formSeedDate, setFormSeedDate] = useState<Date | undefined>();
  const [formSeedWeight, setFormSeedWeight] = useState("");
  const [formPLSize, setFormPLSize] = useState("");
  const [formTotalSeed, setFormTotalSeed] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [tanksAll, setTanksAll] = useState<Tank[]>([]);
  const { toast } = useToast();
  const [rev, setRev] = useState(0);
  const { accountId } = useAuth();

  useSEO("Tanks | AquaLedger", "Manage tanks for the selected location. Add, view, and open details.");

  // Ensure selection context includes actual location name from DB
  useEffect(() => {
    let ignore = false;
    const loadLocation = async () => {
      if (!locationId) return;
      // If already set correctly, skip
      if (location?.id === locationId && location?.name && location.name !== locationId) return;
        const { data } = await supabase
          .from("locations")
          .select("id,name")
          .eq("account_id", accountId)
          .eq("id", locationId)
          .maybeSingle();
      if (!ignore && data) {
        setLocation({ id: (data as any).id, name: (data as any).name });
      }
    };
    loadLocation();
    return () => { ignore = true; };
  }, [locationId, setLocation, location?.id, location?.name]);

  const loadTanks = async () => {
    if (!accountId || !locationId) return;
    const { data, error } = await supabase
      .from("tanks")
      .select("id, name, type, location_id")
      .eq("account_id", accountId)
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    if (!error) {
      const mapped = (data || []).map((t: any) => ({ id: t.id, name: t.name, type: t.type, locationId: t.location_id })) as Tank[];
      setTanksAll(mapped);
    } else {
      console.error("Error loading tanks:", error);
    }
  };

  useEffect(() => {
    loadTanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, rev, accountId]);

  const [activeCrops, setActiveCrops] = useState<Record<string, TankDetail>>({});
  const loadActiveCrops = async (tankIds: string[]) => {
    if (tankIds.length === 0 || !accountId) { setActiveCrops({}); return; }
    const { data } = await supabase
      .from("tank_crops")
      .select("tank_id, seed_date, end_date")
      .in("tank_id", tankIds)
      .eq("account_id", accountId)
      .is("end_date", null);
    const map: Record<string, TankDetail> = {};
    (data || []).forEach((row: any) => {
      map[row.tank_id] = { seedDate: row.seed_date, cropEnd: row.end_date || undefined };
    });
    setActiveCrops(map);
  };

  useEffect(() => {
    if (tanksAll.length > 0) {
      loadActiveCrops(tanksAll.map(t => t.id));
    }
  }, [tanksAll, accountId]);

  const tanks = useMemo(() => tanksAll.filter((t) => t.locationId === locationId), [tanksAll, locationId]);

  const handleSelectTank = (t: Tank) => {
    setTank({ id: t.id, name: t.name, type: t.type });
    navigate(`/locations/${t.locationId}/tanks/${t.id}`);
  };

  const isValid = formName.trim().length > 0;
  
  const onEditTank = (tank: Tank) => {
    setEditingTank(tank);
    setFormName(tank.name);
    setFormType(tank.type);
    
    // Clear other form fields for edit mode
    setFormSeedDate(undefined);
    setFormSeedWeight("");
    setFormPLSize("");
    setFormTotalSeed("");
    setFormArea("");
    
    setOpen(true);
  };

  const onCreateTank = async () => {
    if (!locationId || !isValid || !accountId) return;
    
    // Check tank limit
    const plan = loadPlan();
    const limitCheck = await checkTankLimit(accountId, locationId, plan);
    
    if (!limitCheck.canCreate) {
      toast({
        title: "Plan Limit Reached",
        description: limitCheck.message,
        variant: "destructive",
      });
      return;
    }

    const name = formName.trim();
    try {
      if (editingTank) {
        // Update existing tank with all details
        const tankData = {
          name,
          type: formType,
          seed_weight: formSeedWeight ? parseFloat(formSeedWeight) : null,
          pl_size: formPLSize ? parseFloat(formPLSize) : null,
          total_seed: formTotalSeed ? parseFloat(formTotalSeed) : null,
          area: formArea ? parseFloat(formArea) : null,
        };
        
        const { error } = await supabase
          .from("tanks")
          .update(tankData)
          .eq("id", editingTank.id)
          .eq("account_id", accountId);
        if (error) throw error;
        
        // Update crop data if seed date is provided
        if (formSeedDate) {
          const cropData = {
            seed_date: formSeedDate.toISOString().slice(0, 10),
            seed_weight: formSeedWeight ? parseFloat(formSeedWeight) : null,
            pl_size: formPLSize ? parseFloat(formPLSize) : null,
            total_seed: formTotalSeed ? parseFloat(formTotalSeed) : null,
            area: formArea ? parseFloat(formArea) : null,
          };
          
          // Check if there's an active crop to update
          const { data: existingCrop } = await supabase
            .from("tank_crops")
            .select("id")
            .eq("tank_id", editingTank.id)
            .eq("account_id", accountId)
            .is("end_date", null)
            .maybeSingle();
            
          if (existingCrop) {
            await supabase
              .from("tank_crops")
              .update(cropData)
              .eq("id", existingCrop.id);
          } else {
            await supabase.from("tank_crops").insert([
              { 
                account_id: accountId, 
                tank_id: editingTank.id, 
                end_date: null,
                ...cropData
              },
            ]);
          }
        }
      } else {
        // Create new tank with all details
        const id = crypto.randomUUID();
        const tankData = {
          id, 
          account_id: accountId, 
          location_id: locationId, 
          name, 
          type: formType,
          seed_weight: formSeedWeight ? parseFloat(formSeedWeight) : null,
          pl_size: formPLSize ? parseFloat(formPLSize) : null,
          total_seed: formTotalSeed ? parseFloat(formTotalSeed) : null,
          area: formArea ? parseFloat(formArea) : null,
        };
        
        const { error } = await supabase.from("tanks").insert([tankData]);
        if (error) throw error;
        
        // If seed date is provided, also create a crop entry with details
        if (formSeedDate) {
          const cropData = {
            account_id: accountId, 
            tank_id: id, 
            seed_date: formSeedDate.toISOString().slice(0, 10), 
            end_date: null,
            seed_weight: formSeedWeight ? parseFloat(formSeedWeight) : null,
            pl_size: formPLSize ? parseFloat(formPLSize) : null,
            total_seed: formTotalSeed ? parseFloat(formTotalSeed) : null,
            area: formArea ? parseFloat(formArea) : null,
          };
          
          await supabase.from("tank_crops").insert([cropData]);
        }
      }
      
      setOpen(false);
      // Reset all form fields
      setFormName("");
      setFormType("fish");
      setFormSeedDate(undefined);
      setFormSeedWeight("");
      setFormPLSize("");
      setFormTotalSeed("");
      setFormArea("");
      setEditingTank(null);
      
      toast({ 
        title: editingTank ? "Tank Updated" : "Tank Created", 
        description: `${name} has been ${editingTank ? "updated" : "added"} successfully` 
      });
      setRev((r) => r + 1);
    } catch (e) {
      toast({ title: "Error", description: `Failed to ${editingTank ? "update" : "create"} tank.`, variant: "destructive" });
    }
  };

  const onStartCrop = async (t: Tank) => {
    try {
      const now = nowIST();
      const seedDate = now.toISOString().slice(0, 10);
      const { error } = await supabase.from("tank_crops").insert([
        { account_id: accountId, tank_id: t.id, seed_date: seedDate, end_date: null },
      ]);
      if (error) throw error;
      setRev((r) => r + 1);
      toast({ title: "Saved", description: `${t.name}: start crop` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to start crop.", variant: "destructive" });
    }
  };

  const onEndCrop = async (t: Tank) => {
    try {
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      const { error } = await supabase
        .from("tank_crops")
        .update({ end_date: endDate })
        .eq("tank_id", t.id)
        .eq("account_id", accountId)
        .is("end_date", null);
      if (error) throw error;
      setRev((r) => r + 1);
      toast({ title: "Saved", description: `${t.name}: end crop` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to end crop.", variant: "destructive" });
    }
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tanks {location ? `— ${location.name}` : ""}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Dashboard</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add Tank</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {editingTank ? "Edit Tank" : "Add Tank"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tankName">Tank Name</Label>
                    <Input 
                      id="tankName" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                      placeholder="Enter tank name" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tankType">Tank Type</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as "fish" | "shrimp")}>
                      <SelectTrigger id="tankType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fish">Fish</SelectItem>
                        <SelectItem value="shrimp">Shrimp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Seed Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formSeedDate ? format(formSeedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formSeedDate}
                          onSelect={setFormSeedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    {formType === "fish" ? (
                      <>
                        <Label htmlFor="seedWeight">Seed weight (g)</Label>
                        <Input 
                          id="seedWeight" 
                          type="number"
                          step="0.1"
                          value={formSeedWeight} 
                          onChange={(e) => setFormSeedWeight(e.target.value)} 
                          placeholder="e.g. 2" 
                        />
                      </>
                    ) : (
                      <>
                        <Label htmlFor="plSize">PL Size</Label>
                        <Input 
                          id="plSize" 
                          type="number"
                          step="0.1"
                          value={formPLSize} 
                          onChange={(e) => setFormPLSize(e.target.value)} 
                          placeholder="e.g. 10" 
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="totalSeed">Total seed</Label>
                    <Input 
                      id="totalSeed" 
                      type="number"
                      value={formTotalSeed} 
                      onChange={(e) => setFormTotalSeed(e.target.value)} 
                      placeholder="e.g. 5000" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="area">Area (acres)</Label>
                    <Input 
                      id="area" 
                      type="number"
                      step="0.01"
                      value={formArea} 
                      onChange={(e) => setFormArea(e.target.value)} 
                      placeholder="e.g. 1.50" 
                    />
                  </div>
                </div>

              </div>
              <DialogFooter>
                <Button onClick={onCreateTank} disabled={!isValid} className="bg-cyan-500 hover:bg-cyan-600 text-white">
                  {editingTank ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Tanks{location ? ` at ${location.name}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Seed Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No tanks found for this location.</TableCell>
                </TableRow>
              ) : (
                tanks.map((t) => {
                  const d = activeCrops[t.id];
                  return (
                    <TableRow key={t.id} onClick={() => handleSelectTank(t)} className="cursor-pointer">
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="capitalize">{t.type}</TableCell>
                      <TableCell>{d?.seedDate ? new Date(d.seedDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{d?.seedDate && !d?.cropEnd ? `Day ${cropDayFromStartIST(new Date(d.seedDate))}` : d?.cropEnd ? `Ended` : "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => onEditTank(t)}>Edit</Button>
                          {d?.seedDate && !d?.cropEnd ? (
                            <Button variant="destructive" size="sm" onClick={() => onEndCrop(t)}>End Crop</Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => onStartCrop(t)}>Start Crop</Button>
                          )}
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
    </main>
  );
};

export default Tanks;
