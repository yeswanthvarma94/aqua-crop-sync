import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2, Mail, Phone, UserPlus, ChevronLeft } from "lucide-react";

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

const SignUp = () => {
  useSEO("Aqua Management | Sign up", "Create your Aqua Management account.");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all fields." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Invalid email", description: "Enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Use at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Make sure both passwords match." });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name: trimmedName, phone: trimmedMobile }
        }
      });

      if (error) {
        const msg = error.message || "Sign up failed";
        if (/already/i.test(msg) && /registered|exists/i.test(msg)) {
          toast({ title: "Account exists", description: "You already have an account. Please sign in." });
          navigate("/auth");
        } else {
          toast({ title: "Sign up failed", description: msg });
        }
        return;
      }

      toast({ title: "Check your email", description: "We sent a confirmation link to finish creating your account." });
      navigate("/auth");
    } catch (e: any) {
      toast({ title: "Sign up error", description: e.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <main className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Create your account</h1>
          <p className="text-muted-foreground">Sign up to start managing your aquaculture operations</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Mobile number</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. +15551234567"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="grid gap-2">
                <Label>Confirm password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSignUp} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create account
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">Already have an account?</span>
              <Separator className="flex-1" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Sign in instead
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to the Terms and Privacy Policy.
        </p>
      </main>
    </div>
  );
};

export default SignUp;
