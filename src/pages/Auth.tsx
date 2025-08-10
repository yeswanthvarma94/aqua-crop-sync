import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

const Auth = () => {
  useSEO("Sign in | AquaLedger", "Login with Google, Email/Mobile, or Username, and reset password.");
  const { toast } = useToast();
  const { signInDev, isDevLoginEnabled, signInLocal } = useAuth();

  // Email/Mobile
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Username
  const [uname, setUname] = useState("");
  const [upass, setUpass] = useState("");

  const googleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Google login failed", description: e.message });
    }
  };

  const emailOrPhoneLogin = async () => {
    setLoading(true);
    try {
      const value = identifier.trim();
      if (!value || !password) throw new Error("Enter email/mobile and password");
      const isEmail = /@/.test(value);
      const { error } = await supabase.auth.signInWithPassword(
        isEmail ? { email: value, password } : ({ phone: value, password } as any)
      );
      if (error) throw error;
      toast({ title: "Signed in", description: "Welcome back!" });
      setIdentifier(""); setPassword("");
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const usernameLogin = async () => {
    const u = uname.trim();
    if (!u || !upass) { toast({ title: "Missing fields", description: "Enter username and password" }); return; }
    const res = await signInLocal(u, upass);
    if (res.ok) {
      toast({ title: "Signed in", description: `Welcome ${u}` });
      setUname(""); setUpass("");
    } else {
      toast({ title: "Login failed", description: res.message || "Invalid credentials" });
    }
  };

  const forgotPassword = async () => {
    const value = identifier.trim();
    if (!/@/.test(value)) { toast({ title: "Enter email", description: "Please enter your email to reset password." }); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      toast({ title: "Reset link sent", description: "Check your email for reset instructions." });
    } catch (e: any) {
      toast({ title: "Unable to send reset", description: e.message });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h1 className="text-base font-semibold">Sign in</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Continue with Google</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={googleLogin}>Sign in with Google</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email or Mobile + Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Email or Mobile</Label>
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com or 9876543210" />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={emailOrPhoneLogin} disabled={loading}>Sign in</Button>
              <Button variant="secondary" onClick={forgotPassword}>Forgot password</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Username + Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input value={uname} onChange={(e) => setUname(e.target.value)} placeholder="username" />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input type="password" value={upass} onChange={(e) => setUpass(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={usernameLogin}>Sign in</Button>
          </CardContent>
        </Card>

        {isDevLoginEnabled && (
          <Card>
            <CardHeader>
              <CardTitle>Dev Test Login</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => signInDev("owner")}>Owner</Button>
              <Button variant="secondary" onClick={() => signInDev("manager")}>Manager</Button>
              <Button variant="secondary" onClick={() => signInDev("partner")}>Partner</Button>
            </CardContent>
          </Card>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">By signing in, you agree to the Terms and Privacy Policy.</p>
      </main>
    </div>
  );
};

export default Auth;
