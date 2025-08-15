import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/authCleanup";
import { Mail, Phone, Eye, EyeOff, Loader2, LogIn, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
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
  useSEO("Aqua Management | Sign in", "Secure login for Aqua Management aquaculture system.");
  const { toast } = useToast();
  const { signInDev, isDevLoginEnabled, signInLocal } = useAuth();
  const navigate = useNavigate();

  // Login modes
  const [loginType, setLoginType] = useState<"credentials" | "username">("credentials");
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Username login (for team members)
  const [username, setUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");

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
      if (!value || !password) throw new Error("Enter credentials");

      // Clean any stale auth before signing in
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: "global" } as any); } catch {}

      if (mode === "email") {
        if (/@/.test(value)) {
          const { error } = await supabase.auth.signInWithPassword({ email: value, password });
          if (error) throw error;
        } else {
          // Treat as username handle
          const aliasEmail = `${value.toLowerCase()}@users.aqualedger.local`;
          const { error } = await supabase.auth.signInWithPassword({ email: aliasEmail, password });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ phone: value as any, password } as any);
        if (error) throw error;
      }

      // Hard refresh to ensure clean state
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const usernameLogin = async () => {
    setLoading(true);
    try {
      const u = username.trim();
      if (!u || !userPassword) {
        toast({ title: "Missing fields", description: "Enter username and password" });
        return;
      }
      
      const res = await signInLocal(u, userPassword);
      if (res.ok) {
        toast({ title: "Signed in", description: `Welcome ${u}` });
        setUsername("");
        setUserPassword("");
        window.location.href = "/";
      } else {
        toast({ title: "Login failed", description: res.message || "Invalid credentials" });
      }
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message });
    } finally {
      setLoading(false);
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

  const signUp = async () => {
    if (mode !== "email") { toast({ title: "Use email to create account", description: "Sign up currently supports email only." }); return; }
    const email = identifier.trim();
    if (!email || !password) { toast({ title: "Missing fields", description: "Enter email and password" }); return; }
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    if (error) {
      toast({ title: "Sign up failed", description: error.message });
    } else {
      toast({ title: "Check your email", description: "Confirm your address to finish signing up." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <main className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Aqua Management</h1>
          <p className="text-muted-foreground">Professional aquaculture management system</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={loginType} onValueChange={(v) => setLoginType(v as "credentials" | "username")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="credentials">Email/Mobile</TabsTrigger>
                <TabsTrigger value="username">Username</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials" className="space-y-4">
                <Tabs value={mode} onValueChange={(v) => setMode(v as "email" | "mobile")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Mobile
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="email" className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Email address</Label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="mobile" className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Mobile number</Label>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="e.g. +15551234567"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowForgotPassword(!showForgotPassword)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && emailOrPhoneLogin()}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {showForgotPassword && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Enter your email address to receive a password reset link.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={forgotPassword}
                      disabled={!identifier.includes('@')}
                    >
                      Send reset link
                    </Button>
                  </div>
                )}

                <Button className="w-full" onClick={emailOrPhoneLogin} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                  {mode === "email" ? "Sign in with Email" : "Sign in with Mobile"}
                </Button>
              </TabsContent>

              <TabsContent value="username" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && usernameLogin()}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button className="w-full" onClick={usernameLogin} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Sign in with Username
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Username accounts are created by the system administrator.
                </p>
              </TabsContent>
            </Tabs>

            <div className="text-center">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                onClick={() => navigate("/signup")}
              >
                Create a new account <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">Or continue with</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="outline" className="w-full" onClick={googleLogin}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>

        {isDevLoginEnabled && (
          <div className="text-center">
            <div className="inline-flex gap-2">
              <Button size="sm" onClick={() => signInDev("owner")}>Owner</Button>
              <Button size="sm" variant="secondary" onClick={() => signInDev("manager")}>Manager</Button>
              <Button size="sm" variant="secondary" onClick={() => signInDev("partner")}>Partner</Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          By signing in, you agree to the Terms and Privacy Policy.
        </p>
      </main>
    </div>
  );
};

export default Auth;
