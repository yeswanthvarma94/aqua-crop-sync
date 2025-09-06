import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";

import { Pencil, Trash2, ListTree } from "lucide-react";
import { useSelection } from "@/state/SelectionContext";

import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { loadPlan, checkLocationLimit } from "@/lib/subscription";

interface Farm {
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

const Farms = () => {
  useSEO("Farms | AquaLedger", "Manage farms: list, create, edit, delete.");
  const navigate = useNavigate();
  const { setLocation, setTank } = useSelection();
  const { accountId } = useAuth();

  const [farms, setFarms] = useState<Farm[]>([]);
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Farm | null>(null);
  const [form, setForm] = useState<Pick<Farm, "name" | "address">>({ name: "", address: "" });

  const isValid = useMemo(() => form.name.trim().length > 0, [form.name]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", address: "" });
  };

  const load = async () => {
    if (!accountId) return;
    console.log("Loading farms for account:", accountId);
    
    const { data, error } = await supabase
      .from("farms")
      .select("id, name, address, account_id")
      .eq("account_id", accountId)
      .is("deleted_at", null) // Only load non-deleted farms
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      console.log("Loaded farms:", data);
      setFarms(data as any);
    } else {
      console.error("Error loading farms:", error);
      if (error) {
        toast({ 
          title: "Database Error", 
          description: "Failed to load farms. Please refresh the page.", 
          variant: "destructive" 
        });
      }
    }
  };


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const onSubmit = async () => {
    if (!isValid || !accountId) return;

    try {
      if (editing) {
        console.log("Updating farm:", editing.id, "with data:", {
          name: form.name.trim(),
          address: form.address?.trim() || null,
        });
        
        const { data, error } = await supabase
          .from("farms")
          .update({
            name: form.name.trim(),
            address: form.address?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editing.id)
          .eq("account_id", accountId)
          .select();
          
        if (error) {
          console.error("Farm update error:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error("No farm was updated. Please check if the farm exists and you have permission.");
        }
        
        console.log("Farm updated successfully:", data[0]);
        toast({ title: "Updated", description: `${form.name} has been updated successfully.` });
      } else {
        // Check location limit for new farm
        const plan = loadPlan();
        const limitCheck = await checkLocationLimit(accountId, plan);
        
        if (!limitCheck.canCreate) {
          toast({
            title: "Plan Limit Reached",
            description: limitCheck.message,
            variant: "destructive",
          });
          return;
        }

        const newFarm: Farm = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          address: form.address?.trim() || null,
          account_id: accountId,
        };
        
        console.log("Creating new farm:", newFarm);
        
        const { data, error } = await supabase
          .from("farms")
          .insert([newFarm])
          .select();
          
        if (error) {
          console.error("Farm creation error:", error);
          throw error;
        }
        
        console.log("Farm created successfully:", data[0]);
        toast({ title: "Created", description: `${form.name} has been created successfully.` });
      }
      setOpen(false);
      resetForm();
      
      // Force reload farms to reflect changes
      await load();
    } catch (error: any) {
      console.error(`Failed to ${editing ? "update" : "create"} farm:`, error);
      const errorMsg = error?.message || `Failed to ${editing ? "update" : "create"} farm. Please try again.`;
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const onEdit = (farm: Farm) => {
    setEditing(farm);
    setForm({ name: farm.name, address: farm.address || "" });
    setOpen(true);
  };

  const onDelete = async (farm: Farm) => {
    try {
      console.log("Deleting farm:", farm.id, "Account ID:", accountId);
      
      // Soft delete - add deleted_at timestamp instead of hard delete
      const { data, error } = await supabase
        .from("farms")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", farm.id)
        .eq("account_id", accountId)
        .select();
        
      if (error) {
        console.error("Delete error:", error);
        throw error;
      }
      
      // Check if any rows were actually updated
      if (!data || data.length === 0) {
        throw new Error("No records were updated. Farm may not exist or you may not have permission.");
      }
      
      console.log("Successfully soft deleted farm:", data[0]);
      toast({ title: "Farm Deleted", description: `${farm.name} has been moved to recycle bin` });
      await load();
    } catch (error: any) {
      console.error("Failed to delete farm:", error);
      const errorMessage = error?.message?.includes('foreign key') 
        ? 'Cannot delete farm with existing tanks. Delete tanks first.'
        : error?.message || 'Failed to delete farm. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openTanks = (farm: Farm) => {
    setLocation({ id: farm.id, name: farm.name });
    setTank(null);
    navigate(`/farms/${farm.id}/tanks`);
  };

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>← Home</Button>
          <h1 className="text-xl font-semibold">Farms</h1>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">Add Farm</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Farm" : "Add Farm"}</DialogTitle>
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
          <CardTitle>All Farms</CardTitle>
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
              {farms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No farms yet. Add your first one.</TableCell>
                </TableRow>
              ) : (
                farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-medium">{farm.name}</TableCell>
                    <TableCell>{farm.address || "—"}</TableCell>
                    <TableCell className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openTanks(farm)}>
                        <ListTree className="mr-1" size={16} /> Tanks
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(farm)}>
                        <Pencil className="mr-1" size={16} /> Edit
                      </Button>
                      <ConfirmDialog
                        title="Delete Farm"
                        description={`Are you sure you want to delete "${farm.name}"? This will move it to the recycle bin where it can be restored later.`}
                        confirmText="Delete Farm"
                        variant="destructive"
                        onConfirm={() => onDelete(farm)}
                      >
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-1" size={16} /> Delete
                        </Button>
                      </ConfirmDialog>
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

export default Farms;