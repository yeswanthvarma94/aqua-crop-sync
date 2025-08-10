
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelection } from "@/state/SelectionContext";
import { cropDayFromStartIST, nowIST } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";
import { enqueueChange } from "@/lib/approvals";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/AuthContext";

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
  const [tanksAll, setTanksAll] = useState<Tank[]>([]);
  const { toast } = useToast();
  const [rev, setRev] = useState(0);
  const { accountId } = useAuth();

  useSEO("Tanks | AquaLedger", "Manage tanks for the selected location. Add, view, and open details.");

  // Ensure selection context includes this location id
  useEffect(() => {
    if (!location && locationId) {
      // Best-effort set with id; name will resolve later when DB is wired
      setLocation({ id: locationId, name: locationId });
    }
  }, [location, locationId, setLocation]);

  const loadTanks = async () => {
    if (!locationId) return;
    const { data, error } = await supabase
      .from("tanks")
      .select("id, name, type, location_id")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });
    if (!error) {
      const mapped = (data || []).map((t: any) => ({ id: t.id, name: t.name, type: t.type, locationId: t.location_id })) as Tank[];
      setTanksAll(mapped);
    }
  };

  useEffect(() => {
    loadTanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, rev]);

  const [activeCrops, setActiveCrops] = useState<Record<string, TankDetail>>({});
  const loadActiveCrops = async (tankIds: string[]) => {
    if (tankIds.length === 0) { setActiveCrops({}); return; }
    const { data } = await supabase
      .from("tank_crops")
      .select("tank_id, seed_date, end_date")
      .in("tank_id", tankIds)
      .is("end_date", null);
    const map: Record<string, TankDetail> = {};
    (data || []).forEach((row: any) => {
      map[row.tank_id] = { seedDate: row.seed_date, cropEnd: row.end_date || undefined };
    });
    setActiveCrops(map);
  };

  useEffect(() => {
    loadActiveCrops(tanksAll.map(t => t.id));
  }, [tanksAll]);

  const tanks = useMemo(() => tanksAll.filter((t) => t.locationId === locationId), [tanksAll, locationId]);

  const handleSelectTank = (t: Tank) => {
    setTank({ id: t.id, name: t.name, type: t.type });
    navigate(`/locations/${t.locationId}/tanks/${t.id}`);
  };

  const isValid = formName.trim().length > 0;
  const onCreateTank = async () => {
    if (!locationId || !isValid) return;
    const payload = { tank: { id: crypto.randomUUID(), locationId, name: formName.trim(), type: formType, account_id: accountId } };
    await enqueueChange("tanks/create", payload as any, `Tank: ${payload.tank.name}`);
    setOpen(false);
    setFormName("");
    setFormType("fish");
    toast({ title: "Submitted for approval", description: `${payload.tank.name}` });
  };

  const onStartCrop = async (t: Tank) => {
    const now = nowIST();
    await enqueueChange("tanks/start_crop", { tankId: t.id, iso: now.toISOString() }, `Start crop — ${t.name}`);
    setRev((r) => r + 1);
    toast({ title: "Submitted for approval", description: `${t.name}: start crop` });
  };

  const onEndCrop = async (t: Tank) => {
    const now = new Date();
    await enqueueChange("tanks/end_crop", { tankId: t.id, iso: now.toISOString() }, `End crop — ${t.name}`);
    setRev((r) => r + 1);
    toast({ title: "Submitted for approval", description: `${t.name}: end crop` });
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tanks {location ? `— ${location.name}` : ""}</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Dashboard</Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/locations")}>Back to Locations</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add Tank</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tank</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="tankName">Name</Label>
                  <Input id="tankName" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Tank 1" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tankType">Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as "fish" | "shrimp") }>
                    <SelectTrigger id="tankType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fish">Fish</SelectItem>
                      <SelectItem value="shrimp">Shrimp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={onCreateTank} disabled={!isValid}>Create</Button>
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
                        {d?.seedDate && !d?.cropEnd ? (
                          <Button variant="destructive" size="sm" onClick={() => onEndCrop(t)}>End Crop</Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => onStartCrop(t)}>Start Crop</Button>
                        )}
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
