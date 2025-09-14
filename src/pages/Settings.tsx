import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { useEffect, useMemo, useState } from "react";

// SEO hook
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

// Plan storage
type Plan = "Free" | "Pro" | "Enterprise";
const PLAN_KEY = "aqualedger.plan";
const loadPlan = (): Plan => {
  const raw = localStorage.getItem(PLAN_KEY);
  if (raw === "Pro" || raw === "Enterprise" || raw === "Free") return raw;
  return "Free";
};
const savePlan = (p: Plan) => localStorage.setItem(PLAN_KEY, p);

// Theme
const THEME_KEY = "theme"; // values: light | dark
const getStoredTheme = () => (localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light");
const applyTheme = (theme: "light" | "dark") => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem(THEME_KEY, theme);
};

// Team
type UserRole = "owner" | "manager" | "partner";
interface TeamRow {
  user_id: string;
  name: string;
  phone: string;
  role: UserRole;
}

// Diagnostics helpers
const bytesForLocalStorage = (): number => {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    const v = localStorage.getItem(k) || "";
    total += k.length + v.length;
  }
  return total;
};

const Settings = () => {
  useSEO("Settings | AquaLedger", "Manage profile, plan, team access, theme, and diagnostics.");
  const { user, accountId, signInDev, signOut, isDevLoginEnabled } = useAuth();
  const { toast } = useToast();

  // Plan
  const [plan, setPlan] = useState<Plan>(() => loadPlan());
  useEffect(() => { savePlan(plan); }, [plan]);

  // Compute plan limits for UI
  type PlanLimits = { team: boolean; locations: number | "Unlimited"; tanksPerLoc: number | "Unlimited"; price: string; originalPrice: string };
  const limits: PlanLimits = useMemo(() => {
    if (plan === "Enterprise") return { 
      team: true, 
      locations: "Unlimited", 
      tanksPerLoc: "Unlimited",
      price: "₹2,999/Year",
      originalPrice: "₹5,999/Year"
    };
    if (plan === "Pro") return { 
      team: false, 
      locations: 3, 
      tanksPerLoc: 4,
      price: "₹599/Year", 
      originalPrice: "₹999/Year"
    };
    return { 
      team: false, 
      locations: 1, 
      tanksPerLoc: 2,
      price: "₹0/Year",
      originalPrice: "₹199/Year"
    };
  }, [plan]);

  // Theme
  const [darkMode, setDarkMode] = useState<boolean>(() => getStoredTheme() === "dark");
  useEffect(() => { applyTheme(darkMode ? "dark" : "light"); }, [darkMode]);

  // Diagnostics
  const storageBytes = bytesForLocalStorage();
  const storageKB = Math.round(storageBytes / 1024);

  // Team state
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeamRow | null>(null);

  const [username, setUsername] = useState("");
  const [memberName, setMemberName] = useState("");
  const [role, setRole] = useState<UserRole>("manager");

  const isOwner = user?.role === "owner";
  const canManageTeam = isOwner && plan === "Enterprise";

  const refreshTeam = async () => {
    if (!accountId) return;
    try {
      const { data, error } = await supabase.rpc('get_team_members', { 
        account_id_param: accountId 
      });
      
      if (error) throw error;
      
      const rows: TeamRow[] = (data || []).map((member: any) => ({
        user_id: member.user_id,
        name: member.name || "—",
        phone: member.phone || "—",
        role: member.role as UserRole,
      }));
      
      setTeam(rows);
      setMemberCount(rows.length);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeam([]);
      setMemberCount(0);
    }
  };

  useEffect(() => { refreshTeam(); }, [accountId]);

  const createMember = async () => {
    const phoneNumber = username.trim();
    const name = memberName.trim();
    
    if (!phoneNumber || !name) { 
      toast({ title: "Missing fields", description: "Enter phone number and name." }); 
      return; 
    }
    
    // Basic phone number validation
    if (!/^[+]?[1-9]\d{7,14}$/.test(phoneNumber.replace(/[\s\-]/g, ''))) {
      toast({ title: "Invalid phone number", description: "Please enter a valid phone number." });
      return;
    }
    
    if (!accountId) { toast({ title: "No account", description: "Account not ready." }); return; }
    
    await createMemberDirectly(phoneNumber, name, role);
  };

  const createMemberDirectly = async (phoneNumber: string, name: string, memberRole: UserRole) => {
    try {
      const { data, error } = await supabase.functions.invoke("team-create-user", {
        body: { 
          accountId, 
          username: phoneNumber, 
          role: memberRole, 
          name,
          skipOtpVerification: true // Skip OTP verification
        },
      });
      if (error) throw error;
      
      // Reset form
      setAddOpen(false); 
      setUsername(""); 
      setMemberName("");
      setRole("manager");
      
      await refreshTeam();
      
      // Show different message based on whether temporary password is provided
      if (data.tempPassword) {
        toast({ 
          title: "Member added successfully", 
          description: `${name} added as ${memberRole}. Temporary password: ${data.tempPassword}. Share this securely with the user.`,
          duration: 10000 // Show longer for password
        });
      } else {
        toast({ 
          title: "Member added", 
          description: `${name} added as ${memberRole}. They will receive login credentials via SMS.` 
        });
      }
    } catch (e: any) {
      toast({ title: "Failed to add member", description: e.message || "Error" });
    }
  };


  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!accountId) return;
    try {
      const { error } = await supabase.functions.invoke("team-reset-password", {
        body: { accountId, username: resetTarget.phone },
      } as any);
      if (error) throw error;
      setResetTarget(null);
      toast({ title: "Reset initiated", description: `OTP sent to ${resetTarget.phone} for password reset` });
    } catch (e: any) {
      toast({ title: "Failed to reset", description: e.message || "Error" });
    }
  };

  // Account deletion function
  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will delete all your data including locations, tanks, stocks, and feeding records."
    );
    
    if (!confirmed) return;
    
    try {
      // Call the database function to delete all user data
      const { error } = await supabase.rpc('delete_user_account', { 
        user_uuid: user.id 
      });
      
      if (error) throw error;
      
      // Sign out the user after successful deletion
      await signOut();
      toast({ title: "Account deleted", description: "Your account has been successfully deleted." });
    } catch (e: any) {
      toast({ title: "Failed to delete account", description: e.message || "Error" });
    }
  };
  const handleDeleteUser = async (userId: string) => {
    if (!accountId) return;
    try {
      const { error: memErr } = await supabase
        .from("account_members")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", userId);
      if (memErr) throw memErr;

      // Remove username mapping for this account (best effort)
      const { error: nameErr } = await supabase
        .from("usernames")
        .delete()
        .eq("account_id", accountId)
        .eq("user_id", userId);
      if (nameErr) throw nameErr;

      await refreshTeam();
      toast({ title: "Member deleted", description: "The member was removed from this account." });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message || "Error" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-md mx-auto px-4 py-3">
          <h2 className="text-base font-semibold">Settings</h2>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 pb-24 pt-4 space-y-6">
        <section className="space-y-2">
          <h3 className="font-medium">Profile</h3>
          <div className="flex items-center gap-3 text-sm">
            <div>
              <div className="font-medium">{user ? user.name : "Not signed in"}</div>
              <div className="text-muted-foreground">{user?.email || "—"}</div>
            </div>
            {user && <Badge variant="secondary" className="ml-auto uppercase">{user.role}</Badge>}
          </div>
          {isDevLoginEnabled ? (
            <div className="space-x-2">
              <Button onClick={() => signInDev("owner")}>Dev Login as Owner</Button>
              <Button variant="secondary" onClick={() => signInDev("manager")}>Dev Login as Manager</Button>
              <Button variant="secondary" onClick={() => signInDev("partner")}>Dev Login as Partner</Button>
              <div className="flex gap-2 mt-2">
                {user && <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>}
                {user && isOwner && (
                  <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {user && <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>}
              {user && isOwner && (
                <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
              )}
            </div>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Free Plan */}
              <div className={`border rounded-lg p-4 cursor-pointer transition-all ${plan === 'Free' ? 'border-primary bg-primary/5' : 'border-border'}`} 
                   onClick={() => setPlan('Free')}>
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Free</h3>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">₹0/Year</div>
                      <div className="text-sm text-muted-foreground line-through">₹199/Year</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>• 1 Farm</div>
                    <div>• 2 Tanks per farm</div>
                    <div>• All features included</div>
                    <div className="text-muted-foreground">• No team access</div>
                  </div>
                </div>
              </div>

              {/* Pro Plan */}
              <div className={`border rounded-lg p-4 cursor-pointer transition-all ${plan === 'Pro' ? 'border-primary bg-primary/5' : 'border-border'}`} 
                   onClick={() => setPlan('Pro')}>
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Pro</h3>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">₹599/Year</div>
                      <div className="text-sm text-muted-foreground line-through">₹999/Year</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>• 3 Farms</div>
                    <div>• 4 Tanks per farm</div>
                    <div>• All features included</div>
                    <div className="text-muted-foreground">• No team access</div>
                  </div>
                </div>
              </div>

              {/* Enterprise Plan */}
              <div className={`border rounded-lg p-4 cursor-pointer transition-all ${plan === 'Enterprise' ? 'border-primary bg-primary/5' : 'border-border'}`} 
                   onClick={() => setPlan('Enterprise')}>
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Enterprise</h3>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">₹2,999/Year</div>
                      <div className="text-sm text-muted-foreground line-through">₹5,999/Year</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>• Unlimited Farms</div>
                    <div>• Unlimited Tanks</div>
                    <div>• All features included</div>
                    <div>• Team access (User roles)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80">
                Upgrade Plan - Secure Payment via Razorpay
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Secure transactions in Indian Rupees (₹)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team (Enterprise only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageTeam ? (
              <p className="text-sm text-muted-foreground">
                Team management is available for Enterprise plan owners only.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Members</h4>
                  <Dialog open={addOpen} onOpenChange={(open) => {
                    setAddOpen(open);
                    if (!open) {
                      // Reset form when dialog closes
                      setUsername("");
                      setMemberName("");
                      setRole("manager");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">Add member</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                      <DialogHeader>
                        <DialogTitle>Add team member</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>Full Name</Label>
                          <Input 
                            value={memberName} 
                            onChange={(e) => setMemberName(e.target.value)} 
                            placeholder="Enter full name" 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Phone Number</Label>
                          <PhoneInput 
                            value={username} 
                            onChange={(value) => setUsername(value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Role</Label>
                          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="partner">Partner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={createMember}>Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">No team members yet.</TableCell>
                          </TableRow>
                        ) : (
                          team.map((m) => (
                            <TableRow key={m.user_id}>
                              <TableCell className="font-medium">{m.name}</TableCell>
                              <TableCell>{m.phone}</TableCell>
                              <TableCell className="uppercase"><Badge variant="secondary">{m.role}</Badge></TableCell>
                              <TableCell className="text-right space-x-2">
                                {m.role !== "owner" && (
                                  <>
                                    <Dialog
                                      open={resetTarget?.user_id === m.user_id}
                                      onOpenChange={(v) => { if (!v) { setResetTarget(null); } }}
                                    >
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="secondary" onClick={() => setResetTarget(m)}>Reset Password</Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[420px]">
                                        <DialogHeader>
                                          <DialogTitle>Reset password — {m.phone}</DialogTitle>
                                        </DialogHeader>
                                        <div className="text-sm text-muted-foreground">
                                          An OTP will be sent to {m.phone} to reset their password.
                                        </div>
                                        <DialogFooter>
                                          <Button onClick={handleResetPassword}>Send Reset OTP</Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(m.user_id)}>Delete</Button>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="font-medium">Dark mode</div>
              <div className="text-sm text-muted-foreground">Switch between light and dark themes</div>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offline / Sync diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between"><span>Local storage usage</span><span className="font-medium">{storageKB} KB</span></div>
                <div className="flex items-center justify-between"><span>Keys</span><span className="font-medium">{localStorage.length}</span></div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Detailed sync engine coming soon.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      
    </div>
  );
};

export default Settings;
