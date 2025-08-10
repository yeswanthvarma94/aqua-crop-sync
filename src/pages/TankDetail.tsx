import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cropDayFromStartIST } from "@/lib/time";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }

interface TankDetail {
  tankId: string;
  name: string;
  type: "shrimp" | "fish";
  seedDate?: string; // ISO string
  seedWeight?: number; // fish only
  plSize?: number; // shrimp only
  totalSeed?: number;
  areaAcres?: number;
  price?: number;
  cropStart?: string; // ISO
  cropEnd?: string; // ISO
}

const loadTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
  }
};

const loadActiveDetail = (tankId: string): TankDetail | null => {
  try {
    const raw = localStorage.getItem(`tankDetail:${tankId}`);
    return raw ? (JSON.parse(raw) as TankDetail) : null;
  } catch {
    return null;
  }
};

const saveActiveDetail = (tankId: string, detail: TankDetail) => {
  localStorage.setItem(`tankDetail:${tankId}`, JSON.stringify(detail));
};

const clearActiveDetail = (tankId: string) => {
  localStorage.removeItem(`tankDetail:${tankId}`);
};

const pushRecycleBin = (endedDetail: TankDetail) => {
  try {
    const raw = localStorage.getItem("recycleBin.crops");
    const arr = raw ? (JSON.parse(raw) as TankDetail[]) : [];
    arr.unshift(endedDetail);
    localStorage.setItem("recycleBin.crops", JSON.stringify(arr));
  } catch {
    // no-op
  }
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

const TankDetailPage = () => {
  const { locationId, tankId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tanks = useMemo(() => loadTanks(), []);
  const baseTank = tanks.find((t) => t.id === tankId);

  const [name, setName] = useState<string>(baseTank?.name ?? "");
  const [type, setType] = useState<"shrimp" | "fish">((baseTank?.type as any) ?? "fish");
  const [seedDate, setSeedDate] = useState<Date | undefined>(undefined);
  const [seedWeight, setSeedWeight] = useState<number | undefined>(undefined);
  const [plSize, setPlSize] = useState<number | undefined>(undefined);
  const [totalSeed, setTotalSeed] = useState<number | undefined>(undefined);
  const [areaAcres, setAreaAcres] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [cropEnd, setCropEnd] = useState<Date | undefined>(undefined);

  // Load existing active crop if any
  useEffect(() => {
    if (!tankId) return;
    const existing = loadActiveDetail(tankId);
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setSeedDate(existing.seedDate ? new Date(existing.seedDate) : undefined);
      setSeedWeight(existing.seedWeight);
      setPlSize(existing.plSize);
      setTotalSeed(existing.totalSeed);
      setAreaAcres(existing.areaAcres);
      setPrice(existing.price);
      setCropEnd(existing.cropEnd ? new Date(existing.cropEnd) : undefined);
    }
  }, [tankId]);

  const dayCounter = useMemo(() => {
    if (seedDate && !cropEnd) {
      return cropDayFromStartIST(seedDate);
    }
    return null;
  }, [seedDate, cropEnd]);

  useSEO(
    `Tank Detail${name ? ` — ${name}` : ""} | AquaLedger`,
    `Manage tank detail, seeding, and crop status for ${name || "selected tank"}.`
  );

  const handleSave = () => {
    if (!tankId) return;
    // Basic validation
    if (!name || !type) {
      toast({ title: "Missing info", description: "Please provide tank name and type." });
      return;
    }

    // Persist base tank name/type changes back to list for consistency
    if (baseTank) {
      const updated = tanks.map((t) => (t.id === tankId ? { ...t, name, type } : t));
      localStorage.setItem("tanks", JSON.stringify(updated));
    }

    const detail: TankDetail = {
      tankId,
      name,
      type,
      seedDate: seedDate ? seedDate.toISOString() : undefined,
      seedWeight: type === "fish" ? seedWeight : undefined,
      plSize: type === "shrimp" ? plSize : undefined,
      totalSeed,
      areaAcres,
      price,
      cropStart: seedDate ? seedDate.toISOString() : undefined,
      cropEnd: cropEnd ? cropEnd.toISOString() : undefined,
    };

    saveActiveDetail(tankId, detail);
    toast({ title: "Saved", description: "Tank details have been saved." });
    navigate(`/locations/${locationId}/tanks`);
  };

  const handleEndCrop = () => {
    if (!tankId) return;
    const now = new Date();
    const ended: TankDetail = {
      tankId,
      name,
      type,
      seedDate: seedDate ? seedDate.toISOString() : undefined,
      seedWeight: type === "fish" ? seedWeight : undefined,
      plSize: type === "shrimp" ? plSize : undefined,
      totalSeed,
      areaAcres,
      price,
      cropStart: seedDate ? seedDate.toISOString() : undefined,
      cropEnd: now.toISOString(),
    };
    // Move to recycle bin and clear active
    pushRecycleBin(ended);
    clearActiveDetail(tankId);

    setCropEnd(now);
    toast({ title: "Crop ended", description: "Moved to Recycle Bin." });
  };

  const hasActiveCrop = !!seedDate && !cropEnd;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/locations/${locationId}/tanks`)}>← Tanks</Button>
          <h1 className="text-xl font-semibold">Tank Detail{ name ? ` — ${name}` : "" }</h1>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveCrop && (
            <span className="text-sm text-muted-foreground">Day {dayCounter}</span>
          )}
          {hasActiveCrop && (
            <Button variant="destructive" size="sm" onClick={handleEndCrop}>End Crop</Button>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tank Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter tank name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tank Type</Label>
              <Select value={type} onValueChange={(v: "fish" | "shrimp") => { setType(v); setSeedWeight(undefined); setPlSize(undefined); }}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="shrimp">Shrimp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seed Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !seedDate && "text-muted-foreground")}> 
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {seedDate ? seedDate.toLocaleDateString() : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={seedDate} onSelect={setSeedDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {type === "fish" ? (
              <div className="space-y-2">
                <Label htmlFor="seedWeight">Seed weight (g)</Label>
                <Input id="seedWeight" type="number" inputMode="decimal" value={seedWeight ?? ""} onChange={(e) => setSeedWeight(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 2" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="plSize">PL size</Label>
                <Input id="plSize" type="number" inputMode="decimal" value={plSize ?? ""} onChange={(e) => setPlSize(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 12" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="totalSeed">Total seed</Label>
              <Input id="totalSeed" type="number" inputMode="numeric" value={totalSeed ?? ""} onChange={(e) => setTotalSeed(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 5000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaAcres">Area (acres)</Label>
              <Input id="areaAcres" type="number" inputMode="decimal" step="0.01" value={areaAcres ?? ""} onChange={(e) => setAreaAcres(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 1.50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" inputMode="decimal" step="0.01" value={price ?? ""} onChange={(e) => setPrice(e.target.value === "" ? undefined : Number(e.target.value))} placeholder="e.g. 25000" />
            </div>

          </section>

          <div className="mt-6 flex items-center gap-2">
            <Button onClick={handleSave}>Save</Button>
          </div>

          {cropEnd && (
            <p className="mt-4 text-sm text-muted-foreground">Crop ended on {cropEnd.toLocaleDateString()}.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default TankDetailPage;
