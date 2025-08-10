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
import { cropDayFromStartIST } from "@/lib/time";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }

interface TankDetail {
  seedDate?: string;
  seedWeight?: number;
  plSize?: number;
  totalSeed?: number;
  areaAcres?: number;
  price?: number;
  cropEnd?: string;
}

const loadDetail = (tankId: string): TankDetail | null => {
  try {
    const raw = localStorage.getItem(`tankDetail:${tankId}`);
    return raw ? (JSON.parse(raw) as TankDetail) : null;
  } catch {
    return null;
  }
};

const loadTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
  }
};

const saveTanks = (list: Tank[]) => {
  localStorage.setItem("tanks", JSON.stringify(list));
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

const Tanks = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { location, setLocation, setTank } = useSelection();

  const [open, setOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"shrimp" | "fish">("fish");
  const [tanksAll, setTanksAll] = useState<Tank[]>(() => loadTanks());
  useSEO("Tanks | AquaLedger", "Manage tanks for the selected location. Add, view, and open details.");

  // Ensure selection context includes this location id
  useEffect(() => {
    if (!location && locationId) {
      // Best-effort set with id; name will resolve later when DB is wired
      setLocation({ id: locationId, name: locationId });
    }
  }, [location, locationId, setLocation]);

  const tanks = useMemo(() => tanksAll.filter((t) => t.locationId === locationId), [tanksAll, locationId]);
  const details = useMemo(() => {
    const map = new Map<string, TankDetail | null>();
    const list = tanksAll.filter((t) => t.locationId === locationId);
    list.forEach((t) => map.set(t.id, loadDetail(t.id)));
    return map;
  }, [tanksAll, locationId]);

  const handleSelectTank = (t: Tank) => {
    setTank({ id: t.id, name: t.name, type: t.type });
    navigate(`/locations/${t.locationId}/tanks/${t.id}`);
  };

  const isValid = formName.trim().length > 0;
  const onCreateTank = () => {
    if (!locationId || !isValid) return;
    const newTank: Tank = { id: crypto.randomUUID(), locationId, name: formName.trim(), type: formType };
    const next = [newTank, ...tanksAll];
    setTanksAll(next);
    saveTanks(next);
    setOpen(false);
    setFormName("");
    setFormType("fish");
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tanks {location ? `— ${location.name}` : ""}</h1>
        <div className="flex items-center gap-2">
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
                <TableHead>Seed Info</TableHead>
                <TableHead>Total Seed</TableHead>
                <TableHead>Area (acres)</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No tanks found for this location.</TableCell>
                </TableRow>
              ) : (
                tanks.map((t) => {
                  const d = details.get(t.id);
                  return (
                    <TableRow key={t.id} onClick={() => handleSelectTank(t)} className="cursor-pointer">
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="capitalize">{t.type}</TableCell>
                      <TableCell>{d?.seedDate ? new Date(d.seedDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{t.type === "fish" ? (d?.seedWeight != null ? `${d.seedWeight} g` : "—") : (d?.plSize != null ? `PL ${d.plSize}` : "—")}</TableCell>
                      <TableCell>{d?.totalSeed ?? "—"}</TableCell>
                      <TableCell>{d?.areaAcres ?? "—"}</TableCell>
                      <TableCell>{d?.price ?? "—"}</TableCell>
                      <TableCell>{d?.seedDate && !d?.cropEnd ? `Day ${cropDayFromStartIST(new Date(d.seedDate))}` : d?.cropEnd ? `Ended` : "—"}</TableCell>
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
