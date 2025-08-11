
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Pencil, Trash2, ListTree } from "lucide-react";
import { useSelection } from "@/state/SelectionContext";

import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Location {
  id: string;
  name: string;
  address?: string;
  account_id?: string;
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
  const { accountId } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  
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


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const onSubmit = async () => {
    if (!isValid || !accountId) return;

    try {
      if (editing) {
        const { error } = await supabase
          .from("locations")
          .update({
            name: form.name.trim(),
            address: form.address?.trim() || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Updated" });
      } else {
        const newLoc: Location = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          address: form.address?.trim() || null,
          account_id: accountId,
        };
        const { error } = await supabase.from("locations").insert([newLoc]);
        if (error) throw error;
        toast({ title: "Created" });
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
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
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      await load();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
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
