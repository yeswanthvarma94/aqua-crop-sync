import TabBar from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";

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
interface TeamUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}
const TEAM_KEY = "team.users";
const loadTeam = (): TeamUser[] => {
  try { const raw = localStorage.getItem(TEAM_KEY); return raw ? (JSON.parse(raw) as TeamUser[]) : []; } catch { return []; }
};
const saveTeam = (list: TeamUser[]) => localStorage.setItem(TEAM_KEY, JSON.stringify(list));

async function hashPassword(pw: string): Promise<string> {
  if (!window.crypto?.subtle) return btoa(unescape(encodeURIComponent(pw)));
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const { user, signInDev, signOut, isDevLoginEnabled } = useAuth();
  const { toast } = useToast();

  // Plan
  const [plan, setPlan] = useState<Plan>(() => loadPlan());
  useEffect(() => { savePlan(plan); }, [plan]);

  // Theme
  const [darkMode, setDarkMode] = useState<boolean>(() => getStoredTheme() === "dark");
  useEffect(() => { applyTheme(darkMode ? "dark" : "light"); }, [darkMode]);

  // Team state
  const [team, setTeam] = useState<TeamUser[]>(() => loadTeam());
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeamUser | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [password, setPassword] = useState("");

  const isOwner = user?.role === "owner";
  const canManageTeam = isOwner && plan === "Enterprise";

  const limits = useMemo(() => {
    switch (plan) {
      case "Enterprise": return { team: true, locations: "Unlimited", tanksPerLoc: "Unlimited" };
      case "Pro": return { team: false, locations: 5, tanksPerLoc: 20 } as const;
      default: return { team: false, locations: 2, tanksPerLoc: 10 } as const;
    }
  }, [plan]);


  const storageBytes = bytesForLocalStorage();
  const storageKB = Math.round(storageBytes / 1024);

  const handleAddUser = async () => {
    const u = username.trim().toLowerCase();
    const n = name.trim();
    if (!u || !n || !password) { toast({ title: "Missing fields", description: "Fill all fields to add a user." }); return; }
    if (team.some(t => t.username === u)) { toast({ title: "Username taken", description: "Choose a different username." }); return; }
    const hash = await hashPassword(password);
    const created: TeamUser = { id: crypto.randomUUID(), username: u, name: n, role, passwordHash: hash, createdAt: new Date().toISOString() };
    const next = [created, ...team];
    setTeam(next); saveTeam(next);
    setAddOpen(false); setName(""); setUsername(""); setPassword(""); setRole("manager");
    toast({ title: "Team member added", description: `${n} — ${role}` });
  };

  const handleDeleteUser = (id: string) => {
    const next = team.filter(t => t.id !== id);
    setTeam(next); saveTeam(next);
    toast({ title: "Removed", description: "Team member deleted." });
  };

  const handleResetPassword = async () => {
    if (!resetTarget || !password) return;
    const hash = await hashPassword(password);
    const next = team.map(t => t.id === resetTarget.id ? { ...t, passwordHash: hash } : t);
    setTeam(next); saveTeam(next);
    setResetTarget(null); setPassword("");
    toast({ title: "Password updated", description: `Password reset for ${resetTarget.name}` });
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
              {user && <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>}
            </div>
          ) : (
            user && <Button variant="destructive" onClick={() => signOut()}>Sign out</Button>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Subscription plan & limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="Free">Free</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 text-sm">
                <div>Team access: <span className="font-medium">{limits.team ? "Enabled" : "Disabled"}</span></div>
                <div>Team access: <span className="font-medium">{limits.team ? "Enabled" : "Disabled"}</span></div>
                <div>Locations: <span className="font-medium">{String(limits.locations)}</span></div>
                <div>Tanks/location: <span className="font-medium">{String(limits.tanksPerLoc)}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team (Enterprise only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManageTeam ? (
              <p className="text-sm text-muted-foreground">Team management is available on Enterprise and requires Owner access.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Members</h4>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">Add member</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px]">
                      <DialogHeader>
                        <DialogTitle>Add team member</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Username</Label>
                          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
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
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Temporary password</Label>
                          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddUser}>Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
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
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell>{m.username}</TableCell>
                            <TableCell className="uppercase"><Badge variant="secondary">{m.role}</Badge></TableCell>
                            <TableCell className="text-right space-x-2">
                              <Dialog open={resetTarget?.id === m.id} onOpenChange={(v) => { if (!v) { setResetTarget(null); setPassword(""); } }}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="secondary" onClick={() => setResetTarget(m)}>Reset Password</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[420px]">
                                  <DialogHeader>
                                    <DialogTitle>Reset password — {m.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-2">
                                    <Label>New password</Label>
                                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleResetPassword}>Update</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(m.id)}>Delete</Button>
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

      <TabBar />
    </div>
  );
};

export default Settings;
