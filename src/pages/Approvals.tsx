import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import { useNavigate } from "react-router-dom";
import { PendingChange, loadPendingChanges, savePendingChanges } from "@/lib/approvals";
import { format } from "date-fns";

// LOCAL HELPERS — mirror storage keys used across pages
const stockKey = (locationId: string) => `stocks:${locationId}`;
const loadStocks = (locationId: string) => {
  try { const raw = localStorage.getItem(stockKey(locationId)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveStocks = (locationId: string, items: any[]) => localStorage.setItem(stockKey(locationId), JSON.stringify(items));

const logsKey = (locationId: string, tankId: string, dateKey: string) => `materials:logs:${locationId}:${tankId}:${dateKey}`;
const loadLogs = (locationId: string, tankId: string, dateKey: string) => {
  try { const raw = localStorage.getItem(logsKey(locationId, tankId, dateKey)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveLogs = (locationId: string, tankId: string, dateKey: string, list: any[]) => localStorage.setItem(logsKey(locationId, tankId, dateKey), JSON.stringify(list));

const feedingKey = (locationId: string, tankId: string, dateKey: string) => `feeding:${locationId}:${tankId}:${dateKey}`;
const loadFeeding = (locationId: string, tankId: string, dateKey: string) => {
  try { const raw = localStorage.getItem(feedingKey(locationId, tankId, dateKey)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveFeeding = (locationId: string, tankId: string, dateKey: string, list: any[]) => localStorage.setItem(feedingKey(locationId, tankId, dateKey), JSON.stringify(list));

const expensesKey = (locationId: string, tankId: string) => `expenses:${locationId}:${tankId}`;
const loadExpenses = (locationId: string, tankId: string) => {
  try { const raw = localStorage.getItem(expensesKey(locationId, tankId)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveExpenses = (locationId: string, tankId: string, list: any[]) => localStorage.setItem(expensesKey(locationId, tankId), JSON.stringify(list));

const loadTanks = () => { try { const raw = localStorage.getItem("tanks"); return raw ? JSON.parse(raw) : []; } catch { return []; } };
const saveTanks = (list: any[]) => localStorage.setItem("tanks", JSON.stringify(list));

const loadDetail = (tankId: string) => { try { const raw = localStorage.getItem(`tankDetail:${tankId}`); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveDetail = (tankId: string, detail: any) => localStorage.setItem(`tankDetail:${tankId}`, JSON.stringify(detail));
const clearDetail = (tankId: string) => localStorage.removeItem(`tankDetail:${tankId}`);
const pushRecycleBin = (endedDetail: any & { tankId: string }) => {
  try { const raw = localStorage.getItem("recycleBin.crops"); const arr = raw ? JSON.parse(raw) : []; arr.unshift(endedDetail); localStorage.setItem("recycleBin.crops", JSON.stringify(arr)); } catch {}
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

const Approvals = () => {
  useSEO("Approvals | AquaLedger", "Owner approvals for all pending changes: feeding, materials, stocks, tanks, expenses, locations.");
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const { toast } = useToast();
  const navigate = useNavigate();

  const [list, setList] = useState<PendingChange[]>(() => loadPendingChanges());

  useEffect(() => { setList(loadPendingChanges()); }, []);

  const removeById = (id: string) => {
    const next = list.filter((c) => c.id !== id);
    savePendingChanges(next);
    setList(next);
  };

  const approve = (c: PendingChange) => {
    try {
      switch (c.type) {
        case "materials/log": {
          const { locationId, tankId, dateKey, entry, stockId, quantity } = c.payload;
          const logs = loadLogs(locationId, tankId, dateKey); logs.push(entry); saveLogs(locationId, tankId, dateKey, logs);
          const stocks = loadStocks(locationId); const idx = stocks.findIndex((s: any) => s.id === stockId);
          if (idx >= 0) { stocks[idx] = { ...stocks[idx], quantity: Math.max(0, (stocks[idx].quantity || 0) - quantity), updatedAt: new Date().toISOString() }; saveStocks(locationId, stocks);}          
          break;
        }
        case "feeding/log": {
          const { locationId, tankId, dateKey, entry, stockId, quantity } = c.payload;
          const listF = loadFeeding(locationId, tankId, dateKey); listF.push(entry); saveFeeding(locationId, tankId, dateKey, listF);
          const stocks = loadStocks(locationId); const idx = stocks.findIndex((s: any) => s.id === stockId);
          if (idx >= 0) { stocks[idx] = { ...stocks[idx], quantity: Math.max(0, (stocks[idx].quantity || 0) - quantity), updatedAt: new Date().toISOString() }; saveStocks(locationId, stocks);}          
          break;
        }
        case "expenses/add": {
          const { locationId, tankId, entry } = c.payload;
          const arr = loadExpenses(locationId, tankId); arr.unshift(entry); saveExpenses(locationId, tankId, arr);
          break;
        }
        case "stocks/upsert": {
          const { locationId, name, category, unit, quantity, pricePerUnit, minStock, expiryISO, notes, nowISO } = c.payload;
          const listS = loadStocks(locationId);
          const idx = listS.findIndex((s: any) => s.name.toLowerCase() === name.toLowerCase() && s.category === category && s.unit === unit);
          const amount = (pricePerUnit || 0) * (quantity || 0);
          const now = nowISO || new Date().toISOString();
          if (idx >= 0) {
            const s = listS[idx];
            listS[idx] = {
              ...s,
              quantity: Math.max(0, (s.quantity || 0) + quantity),
              totalAmount: (s.totalAmount || 0) + amount,
              pricePerUnit: pricePerUnit || s.pricePerUnit,
              minStock: Math.max(0, minStock ?? s.minStock ?? 0),
              expiryDate: expiryISO ?? s.expiryDate,
              notes: notes || s.notes,
              updatedAt: now,
            };
          } else {
            listS.unshift({
              id: crypto.randomUUID(),
              name, category, unit,
              quantity: Math.max(0, quantity || 0),
              pricePerUnit: pricePerUnit || 0,
              totalAmount: amount,
              minStock: Math.max(0, minStock || 0),
              expiryDate: expiryISO,
              notes: notes || undefined,
              createdAt: now,
              updatedAt: now,
            });
          }
          saveStocks(locationId, listS);
          break;
        }
        case "tanks/create": {
          const { tank } = c.payload; const listT = loadTanks(); listT.unshift(tank); saveTanks(listT); break;
        }
        case "tanks/start_crop": {
          const { tankId, iso } = c.payload; const existing = loadDetail(tankId) || {}; saveDetail(tankId, { ...existing, seedDate: iso, cropEnd: undefined }); break;
        }
        case "tanks/end_crop": {
          const { tankId, iso } = c.payload; const existing = loadDetail(tankId); if (existing) { pushRecycleBin({ ...existing, cropEnd: iso, tankId }); clearDetail(tankId); } break;
        }
        case "locations/create": {
          const { location } = c.payload; const raw = localStorage.getItem("locations"); const listL = raw ? JSON.parse(raw) : []; listL.unshift(location); localStorage.setItem("locations", JSON.stringify(listL)); break;
        }
        case "locations/update": {
          const { id, updates } = c.payload; const raw = localStorage.getItem("locations"); const listL = raw ? JSON.parse(raw) : []; const idx = listL.findIndex((l: any) => l.id === id); if (idx >= 0) { listL[idx] = { ...listL[idx], ...updates }; localStorage.setItem("locations", JSON.stringify(listL)); }
          break;
        }
        case "locations/delete": {
          const { id } = c.payload; const raw = localStorage.getItem("locations"); const listL = raw ? JSON.parse(raw) : []; const next = listL.filter((l: any) => l.id !== id); localStorage.setItem("locations", JSON.stringify(next)); break;
        }
        default:
          break;
      }
      toast({ title: "Approved", description: c.description });
      removeById(c.id);
    } catch (e) {
      toast({ title: "Approval failed", description: (e as Error).message || "Unknown error" });
    }
  };

  const reject = (c: PendingChange) => {
    removeById(c.id);
    toast({ title: "Rejected", description: c.description });
  };

  if (!isOwner) {
    return (
      <main className="p-4">
        <Card>
          <CardHeader><CardTitle>Approvals</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Only owners can access this page.</p>
            <div className="mt-3"><Button variant="secondary" onClick={() => navigate("/")}>Back to Dashboard</Button></div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Approvals</h1>
        <Button variant="secondary" onClick={() => navigate("/")}>Dashboard</Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pending changes ({list.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No pending changes.</TableCell>
                </TableRow>
              ) : (
                list.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.type}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>{format(new Date(c.createdAt), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => approve(c)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(c)}>Reject</Button>
                    </TableCell>
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

export default Approvals;
