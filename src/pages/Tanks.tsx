import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useSelection } from "@/state/SelectionContext";

interface Tank { id: string; locationId: string; name: string; type: "shrimp" | "fish" }

const loadTanks = (): Tank[] => {
  try {
    const raw = localStorage.getItem("tanks");
    return raw ? (JSON.parse(raw) as Tank[]) : [];
  } catch {
    return [];
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

const Tanks = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const { location, setLocation, setTank } = useSelection();

  useSEO("Tanks | AquaLedger", "View tanks for the selected location.");

  // Ensure selection context includes this location id
  useEffect(() => {
    if (!location && locationId) {
      // Best-effort set with id; name will resolve later when DB is wired
      setLocation({ id: locationId, name: locationId });
    }
  }, [location, locationId, setLocation]);

  const tanks = useMemo(() => loadTanks().filter((t) => t.locationId === locationId), [locationId]);

  const handleSelectTank = (t: Tank) => {
    setTank({ id: t.id, name: t.name, type: t.type });
    navigate(`/locations/${t.locationId}/tanks/${t.id}`);
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tanks {location ? `— ${location.name}` : ""}</h1>
        <Button variant="secondary" size="sm" onClick={() => navigate("/locations")}>Back to Locations</Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">No tanks found for this location.</TableCell>
                </TableRow>
              ) : (
                tanks.map((t) => (
                  <TableRow key={t.id} onClick={() => handleSelectTank(t)} className="cursor-pointer">
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="capitalize">{t.type}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default Tanks;
