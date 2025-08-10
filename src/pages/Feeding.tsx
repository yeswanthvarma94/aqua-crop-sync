import { useEffect, useMemo, useState } from "react";
import HeaderPickers from "@/components/HeaderPickers";
import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useSelection } from "@/state/SelectionContext";
import { useToast } from "@/hooks/use-toast";
import { cropDayFromStartIST } from "@/lib/time";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }
interface TankDetail { seedDate?: string; cropEnd?: string }

const loadTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
  }
};
const loadDetail = (tankId: string): TankDetail | null => {
  try {
    const raw = localStorage.getItem(`tankDetail:${tankId}`);
    return raw ? (JSON.parse(raw) as TankDetail) : null;
  } catch {
    return null;
  }
};

const Feeding = () => {
  const navigate = useNavigate();
  const { location } = useSelection();
  const { toast } = useToast();

  const [tanksAll, setTanksAll] = useState<Tank[]>(() => loadTanks());

  useEffect(() => {
    setTanksAll(loadTanks());
  }, []);

  const tanks = useMemo(() => tanksAll.filter((t) => t.locationId === location?.id), [tanksAll, location?.id]);

  const goFeeding = (t: Tank) => {
    const d = loadDetail(t.id);
    if (!d || !d.seedDate || d.cropEnd) {
      toast({ title: "Inactive tank", description: "Start crop to enable feeding." });
      return;
    }
    navigate(`/locations/${t.locationId}/tanks/${t.id}/feeding`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <HeaderPickers />
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-base font-semibold">Feeding</h2>
            <Button size="sm" variant="secondary" onClick={() => navigate("/")}>Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-4">
        {!location ? (
          <Card>
            <CardHeader>
              <CardTitle>Select a location</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Choose a location to view its tanks for feeding.</p>
              <Button onClick={() => navigate("/locations")}>Go to Locations</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Tanks at {location.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tanks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No tanks found for this location.</TableCell>
                    </TableRow>
                  ) : (
                    tanks.map((t) => {
                      const d = loadDetail(t.id);
                      const active = d?.seedDate && !d?.cropEnd;
                      const day = active ? cropDayFromStartIST(new Date(d!.seedDate!)) : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="capitalize">{t.type}</TableCell>
                          <TableCell>{active ? `Day ${day}` : "Not active"}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => goFeeding(t)}>Open</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      <TabBar />
    </div>
  );
};

export default Feeding;
