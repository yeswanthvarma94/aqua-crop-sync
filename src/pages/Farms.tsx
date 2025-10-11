import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import { Pencil, Trash2, ListTree, Plus, ArrowLeft } from "lucide-react";
import { useSelection } from "@/state/SelectionContext";
import { useAuth } from "@/state/AuthContext";
import { useOfflineFarms } from "@/hooks/useOfflineFarms";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useLoading } from "@/contexts/LoadingContext";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  }, [title, description]);
};

const Farms = () => {
  useSEO("Farms | AquaLedger", "Manage farms: list, create, edit, delete.");
  const navigate = useNavigate();
  const { setLocation, setTank } = useSelection();
  const { accountId } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { isLoading } = useLoading();
  
  const { data: farms, create, update, remove, refresh, isInitialized } = useOfflineFarms();
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Farm | null>(null);
  const [form, setForm] = useState<Pick<Farm, "name" | "address">>({ name: "", address: "" });

  const isValid = useMemo(() => form.name.trim().length > 0, [form.name]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", address: "" });
  };

  const onSubmit = async () => {
    if (!isValid || !accountId) return;

    try {
      if (editing) {
        await update(editing.id, {
          name: form.name.trim(),
          address: form.address?.trim() || null,
        });
      } else {
        await create({
          name: form.name.trim(),
          address: form.address?.trim() || null,
          account_id: accountId
        });
      }

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Farm operation error:", error);
      toast({
        title: "Error",
        description: "Failed to save farm. Please try again.",
        variant: "destructive"
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
      await remove(farm.id);
    } catch (error: any) {
      console.error("Failed to delete farm:", error);
      toast({
        title: "Error", 
        description: "Failed to delete farm. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openTanks = (farm: Farm) => {
    setLocation({ id: farm.id, name: farm.name });
    setTank(null);
    navigate(`/farms/${farm.id}/tanks`);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6 flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Farms</h1>
        {!isOnline && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive">
            Offline Mode
          </Badge>
        )}
      </div>

      {/* Farms Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Farms</span>
            {isLoading('farms') && <LoadingSpinner />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isInitialized ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
              <span className="ml-2">Loading farms...</span>
            </div>
          ) : farms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No farms available yet.</p>
              <Button
                onClick={() => setOpen(true)}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Farm
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farms.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-medium">{farm.name}</TableCell>
                    <TableCell>{farm.address || "—"}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => openTanks(farm)}>
                        <ListTree className="mr-1 h-3 w-3" />
                        Tanks
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit(farm)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <ConfirmDialog
                        onConfirm={() => onDelete(farm)}
                        title="Delete Farm"
                        description={`Are you sure you want to delete "${farm.name}"? This action will move it to the recycle bin.`}
                      >
                        <Button size="sm" variant="outline">
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </ConfirmDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Farm Button - Centered below table */}
      <div className="flex justify-center mt-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Farm
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Farm" : "Add New Farm"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                  placeholder="Enter farm name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  className="col-span-3"
                  placeholder="Enter address (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onSubmit} disabled={!isValid}>
                {editing ? "Update" : "Create"} Farm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Farms;