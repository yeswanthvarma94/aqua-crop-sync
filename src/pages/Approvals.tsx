import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import { useNavigate } from "react-router-dom";
import { PendingChange, loadPendingChanges } from "@/lib/approvals";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

// Keep minimal localStorage compatibility for read-only pages
const feedingKey = (locationId: string, tankId: string, dateKey: string) => `feeding:${locationId}:${tankId}:${dateKey}`;
const saveFeedingLocal = (locationId: string, tankId: string, dateKey: string, list: any[]) =>
  localStorage.setItem(feedingKey(locationId, tankId, dateKey), JSON.stringify(list));
const loadFeedingLocal = (locationId: string, tankId: string, dateKey: string) => {
  try { const raw = localStorage.getItem(feedingKey(locationId, tankId, dateKey)); return raw ? JSON.parse(raw) : []; } catch { return []; }
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
  const { user, accountId } = useAuth();
  const isOwner = user?.role === "owner";
  const { toast } = useToast();
  const navigate = useNavigate();

  const [list, setList] = useState<PendingChange[]>([]);

  const load = async () => {
    const res = await loadPendingChanges();
    setList(res);
  };

  useEffect(() => { load(); }, []);

  const removeById = (id: string) => {
    setList((prev) => prev.filter((c) => c.id !== id));
  };

  const approve = async (c: any) => {
    try {
      switch (c.type) {
        case "materials/log": {
          const { accountId: acc, locationId, tankId, dateKey, entry, stockId, quantity } = c.payload;
          const account = acc || accountId;
          const datePart = (dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
          const timePart = ((entry?.time as string) || "00:00").padStart(5, "0");
          const loggedAt = new Date(`${datePart}T${timePart}:00.000Z`).toISOString();

          await supabase.from("material_logs").insert([
            {
              account_id: account,
              location_id: locationId || null,
              stock_id: stockId || null,
              tank_id: tankId || null,
              quantity: Number(quantity || 0),
              note: entry?.notes || null,
              logged_at: loggedAt,
            },
          ]);

          if (stockId) {
            const { data: s } = await supabase.from("stocks").select("quantity").eq("id", stockId).maybeSingle();
            const currentQty = Number((s as any)?.quantity || 0);
            await supabase
              .from("stocks")
              .update({ quantity: Math.max(0, currentQty - Number(quantity || 0)) })
              .eq("id", stockId);
          }
          break;
        }
        case "feeding/log": {
          const { accountId: acc, locationId, tankId, dateKey, entry, stockId, quantity } = c.payload;
          // Mirror to localStorage for TankFeeding page compatibility
          const existing = loadFeedingLocal(locationId, tankId, dateKey);
          existing.push(entry);
          saveFeedingLocal(locationId, tankId, dateKey, existing);

          const account = acc || accountId;
          const datePart = (dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
          const timePart = ((entry?.time as string) || "00:00").padStart(5, "0");
          const loggedAt = new Date(`${datePart}T${timePart}:00.000Z`).toISOString();

          await supabase.from("material_logs").insert([
            {
              account_id: account,
              location_id: locationId || null,
              stock_id: stockId || null,
              tank_id: tankId || null,
              quantity: Number(quantity || 0),
              note: entry?.notes || null,
              logged_at: loggedAt,
            },
          ]);

          if (stockId) {
            const { data: s2 } = await supabase.from("stocks").select("quantity").eq("id", stockId).maybeSingle();
            const currentQty2 = Number((s2 as any)?.quantity || 0);
            await supabase
              .from("stocks")
              .update({ quantity: Math.max(0, currentQty2 - Number(quantity || 0)) })
              .eq("id", stockId);
          }
          break;
        }
        case "expenses/add": {
          const { accountId: acc, locationId, tankId, entry } = c.payload;
          const account = acc || accountId;
          const incurredAt = (entry?.date || entry?.dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
          await supabase.from("expenses").insert([
            {
              account_id: account,
              location_id: locationId || null,
              tank_id: tankId || null,
              category: entry?.category || null,
              name: entry?.name || null,
              notes: entry?.notes || null,
              description: entry?.name || entry?.category || 'Expense',
              amount: Number(entry?.amount || 0),
              incurred_at: incurredAt,
            },
          ]);
          break;
        }
        case "stocks/upsert": {
          const { accountId: acc, locationId, name, unit, quantity, category, pricePerUnit, minStock, expiryISO, notes } = c.payload;
          const account = acc || accountId;
          if (!account) throw new Error("No account available for stocks");

          const { data: existing } = await supabase
            .from("stocks")
            .select("id, quantity, total_amount")
            .eq("account_id", account)
            .eq("location_id", locationId)
            .eq("name", name)
            .eq("unit", unit)
            .maybeSingle();

          const qty = Number(quantity || 0);
          const ppu = Number(pricePerUnit || 0);
          const incrAmount = qty * ppu;

          if (existing?.id) {
            await supabase
              .from("stocks")
              .update({
                quantity: Math.max(0, Number((existing as any).quantity || 0) + qty),
                price_per_unit: ppu,
                min_stock: Number(minStock || 0),
                expiry_date: expiryISO ? new Date(expiryISO).toISOString().slice(0, 10) : null,
                notes: notes || null,
                total_amount: Number((existing as any).total_amount || 0) + incrAmount,
              })
              .eq("id", (existing as any).id);
          } else {
            await supabase.from("stocks").insert([
              {
                account_id: account,
                location_id: locationId || null,
                name,
                category: category || null,
                unit,
                quantity: Math.max(0, qty),
                price_per_unit: ppu,
                min_stock: Number(minStock || 0),
                expiry_date: expiryISO ? new Date(expiryISO).toISOString().slice(0, 10) : null,
                notes: notes || null,
                total_amount: incrAmount,
              },
            ]);
          }
          break;
        }
        case "tanks/create": {
          const { tank } = c.payload;
          await supabase.from("tanks").insert([{
            id: tank.id,
            account_id: tank.account_id || accountId,
            location_id: tank.locationId,
            name: tank.name,
            type: tank.type || null,
          }]);
          break;
        }
        case "tanks/start_crop": {
          const { tankId, iso } = c.payload;
          await supabase.from("tank_crops").insert([{
            account_id: accountId,
            tank_id: tankId,
            seed_date: new Date(iso).toISOString().slice(0, 10),
            end_date: null,
          }]);
          break;
        }
        case "tanks/end_crop": {
          const { tankId, iso } = c.payload;
          await supabase
            .from("tank_crops")
            .update({ end_date: new Date(iso).toISOString().slice(0, 10) })
            .eq("tank_id", tankId)
            .is("end_date", null);
          break;
        }
        case "locations/create": {
          const { location } = c.payload;
          await supabase.from("locations").insert([{
            id: location.id,
            account_id: location.account_id || accountId,
            name: location.name,
            address: location.address || null,
          }]);
          break;
        }
        case "locations/update": {
          const { id, updates } = c.payload;
          await supabase.from("locations").update({
            name: updates?.name ?? undefined,
            address: updates?.address ?? undefined,
          }).eq("id", id);
          break;
        }
        case "locations/delete": {
          const { id } = c.payload;
          await supabase.from("locations").delete().eq("id", id);
          break;
        }
        default:
          break;
      }

      // Mark pending change approved
      await supabase.from("pending_changes").update({
        status: "approved",
        approved_at: new Date().toISOString(),
      }).eq("id", c.id);

      toast({ title: "Approved", description: c.description });
      removeById(c.id);
    } catch (e) {
      console.error(e);
      toast({ title: "Approval failed", description: (e as Error).message || "Unknown error" });
    }
  };

  const reject = async (c: any) => {
    await supabase.from("pending_changes").update({ status: "rejected", approved_at: new Date().toISOString() }).eq("id", c.id);
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
        <Button variant="secondary" onClick={() => { load(); }}>Refresh</Button>
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
                    <TableCell>{c.description || c.payload?.description || "—"}</TableCell>
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
