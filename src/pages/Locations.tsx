
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ListTree, Clock, Info } from "lucide-react";
import { useSelection } from "@/state/SelectionContext";
import { enqueueChange } from "@/lib/approvals";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Location {
  id: string;
  name: string;
  address?: string;
  account_id?: string;
}

interface PendingChange {
  id: string;
  type: string;
  description: string;
  payload: any;
  created_at: string;
  status: string;
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

const Locations = () => {
  useSEO("Locations | AquaLedger", "Manage farm locations: list, create, edit, delete.");
  const navigate = useNavigate();
  const { setLocation, setTank } = useSelection();
  const { accountId, user, hasRole } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<Pick<Location, "name" | "address">>({ name: "", address: "" });

  const isValid = useMemo(() => form.name.trim().length > 0, [form.name]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", address: "" });
  };

  const load = async () => {
    if (!accountId) return;
    const { data, error } = await supabase
      .from("locations")
      .select("id, name, address, account_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (!error) setLocations(data as any);
  };

  const loadPendingChanges = async () => {
    if (!accountId) return;
    const { data, error } = await supabase
      .from("pending_changes")
      .select("id, type, description, payload, created_at, status")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .in("type", ["locations/create", "locations/update", "locations/delete"])
      .order("created_at", { ascending: false });
    if (!error) setPendingChanges(data as any);
  };

  useEffect(() => {
    load();
    loadPendingChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const onSubmit = async () => {
    if (!isValid) return;
    if (!accountId) return;
    
    try {
      if (editing) {
        await enqueueChange("locations/update", { id: editing.id, updates: { name: form.name.trim(), address: form.address?.trim() } }, `Update Location: ${editing.name}`);
        toast({
          title: hasRole(["owner"]) ? "Updated" : "Update Requested",
          description: hasRole(["owner"]) 
            ? "Location updated successfully."
            : "Location update has been sent for approval. An owner will review it soon.",
        });
      } else {
        const newLoc: Location = { id: crypto.randomUUID(), name: form.name.trim(), address: form.address?.trim(), account_id: accountId };
        await enqueueChange("locations/create", { location: newLoc }, `Create Location: ${newLoc.name}`);
        toast({
          title: hasRole(["owner"]) ? "Created" : "Location Creation Requested",
          description: hasRole(["owner"]) 
            ? "Location created successfully."
            : "Your location has been sent for approval. An owner will review it soon.",
        });
      }
      setOpen(false);
      resetForm();
      await load();
      await loadPendingChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEdit = (loc: Location) => {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address || "" });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    try {
      await enqueueChange("locations/delete", { id }, `Delete Location`);
      toast({
        title: hasRole(["owner"]) ? "Deleted" : "Deletion Requested",
        description: hasRole(["owner"]) 
          ? "Location deleted successfully."
          : "Location deletion has been sent for approval. An owner will review it soon.",
      });
      await load();
      await loadPendingChanges();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit deletion request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openTanks = (loc: Location) => {
    setLocation({ id: loc.id, name: loc.name });
    setTank(null);
    navigate(`/locations/${loc.id}/tanks`);
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>← Dashboard</Button>
          <h1 className="text-xl font-semibold">Locations</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">Add Location</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Location" : "Add Location"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g., Farm A" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Village, District" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={onSubmit} disabled={!isValid}>{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {pendingChanges.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Location Changes ({pendingChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingChanges.map((change) => (
                <div key={change.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {change.type.split('/')[1]}
                    </Badge>
                    <span className="text-sm">{change.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(change.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            {hasRole(["owner"]) && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/approvals")}
                  className="w-full"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Go to Approvals to Review Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No locations yet. Add your first one.</TableCell>
                </TableRow>
              ) : (
                locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell>{loc.address || "—"}</TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openTanks(loc)}>
                        <ListTree className="mr-1" size={16} /> Tanks
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(loc)}>
                        <Pencil className="mr-1" size={16} /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(loc.id)}>
                        <Trash2 className="mr-1" size={16} /> Delete
                      </Button>
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

export default Locations;
