import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Code } from "lucide-react";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

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
  useSEO("Sign In", "Sign in to your AquaLedger account");
  
  const navigate = useNavigate();
  const { signInLocal, signInDev, isDevLoginEnabled } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  
  const sendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    try {
      setOtpLoading(true);
      const phoneNumber = `+91${phone}`;
      
      // Check if this phone number exists as a team member username
      const { data: usernameExists } = await supabase
        .from("usernames")
        .select("username")
        .eq("username", phoneNumber)
        .maybeSingle();

      // Send OTP regardless of new/existing, backend will handle user creation
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: { channel: 'sms' }
      });

      if (error) {
        console.error('OTP send error:', error);
        const msg = error.message || "Failed to send OTP";
        toast.error(msg);
        // Detect Twilio trial/unsupported SMS errors and suggest password login
        if (/21608|unverified|Trial accounts cannot send messages/i.test(msg)) {
          toast.info("SMS is unavailable on trial. Use password login.");
          setMode('password');
        }
        return;
      }

      setOtpSent(true);
      toast.success("OTP sent to your phone number");
    } catch (error: any) {
      console.error('OTP send error:', error);
      toast.error("Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the OTP");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms'
      });

      if (error) {
        console.error('OTP verification error:', error);
        toast.error(error.message || "Invalid OTP");
        return;
      }

      toast.success("Successfully signed in!");
      navigate("/");
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };
  
  const signInWithPassword = async () => {
    if (!phone.trim() || !password) {
      toast.error("Enter phone and password");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        phone: `+91${phone}`,
        password,
      });
      if (error) {
        console.error('Password login error:', error);
        toast.error(error.message || 'Invalid phone or password');
        return;
      }
      toast.success('Signed in successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Password login error:', error);
      toast.error('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };
  
  const googleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        console.error('Google login error:', error);
        toast.error(error.message);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="text-4xl font-bold text-primary">AquaLedger</div>
          <div>
            <CardTitle className="text-2xl font-semibold">Welcome Back</CardTitle>
                    <CardDescription>
                      Sign in with phone number (owners and team members)
                    </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {mode === 'password' ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <span className="text-2xl">🇮🇳</span>
                      <span className="text-sm text-muted-foreground">+91</span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-20"
                      onKeyPress={(e) => e.key === 'Enter' && signInWithPassword()}
                    />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && signInWithPassword()}
                />
              </div>
            </div>

            <Button 
              onClick={signInWithPassword}
              disabled={loading || !phone.trim() || !password}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center">
              <Button variant="link" className="px-0 text-sm" onClick={() => setMode('otp')}>
                Use OTP instead
              </Button>
            </div>
          </>
          ) : (
            <>
              {!otpSent ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <span className="text-2xl">🇮🇳</span>
                          <span className="text-sm text-muted-foreground">+91</span>
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="pl-20"
                          onKeyPress={(e) => e.key === 'Enter' && sendOtp()}
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={sendOtp} 
                    disabled={otpLoading || !phone.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {otpLoading ? "Sending OTP..." : "Get OTP"}
                  </Button>
                  <div className="text-center">
                    <Button variant="link" className="px-0 text-sm" onClick={() => setMode('password')}>
                      Use password instead
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter the 6-digit OTP sent to +91{phone}
                      </p>
                      <InputOTP 
                        maxLength={6} 
                        value={otp} 
                        onChange={setOtp}
                        onComplete={(value) => {
                          setOtp(value);
                          setTimeout(() => verifyOtp(), 100);
                        }}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <Button
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                        }}
                      >
                        Change Number
                      </Button>
                      <Button
                        variant="link"
                        className="px-0 text-sm"
                        onClick={sendOtp}
                        disabled={otpLoading}
                      >
                        {otpLoading ? "Resending..." : "Resend OTP"}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={verifyOtp} 
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <div className="text-center">
                    <Button variant="link" className="px-0 text-sm" onClick={() => setMode('password')}>
                      Trouble receiving SMS? Use password instead
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={googleLogin} 
              disabled={loading}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>

            <Button 
              variant="outline" 
              disabled={loading}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
            
          {isDevLoginEnabled && (
            <Button 
              variant="outline" 
              onClick={() => signInDev()}
              className="w-full"
            >
              <Code className="mr-2 h-4 w-4" />
              Dev Login
            </Button>
          )}

          <div className="text-center">
            <span className="text-sm text-muted-foreground">
              New owner?{" "}
            </span>
            <Button
              variant="link"
              className="text-sm p-0 h-auto font-medium"
              onClick={() => navigate("/signup")}
            >
              Create account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;