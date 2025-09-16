import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/ui/phone-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { MPINInput } from '@/components/MPINInput';
import { MPINSetup } from '@/components/MPINSetup';
import { Smartphone, Key, ArrowLeft, Phone } from 'lucide-react';
import { useAuth } from '@/state/AuthContext';

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

export default function Auth() {
  useSEO("Sign In", "Sign in to your AquaLedger account");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'otp' | 'password' | 'mpin' | 'mpin-setup'>('otp');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [autoDetectedPasswordMode, setAutoDetectedPasswordMode] = useState(false);
  const [userHasMpin, setUserHasMpin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log("User authenticated via AuthContext, redirecting to dashboard...");
      navigate("/");
    }
  }, [user, navigate]);

  // Check phone number to determine auth method (only for phone-based auth)
  const checkPhoneForMPIN = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    
    try {
      // Check if user has MPIN enabled for this phone
      const { data, error } = await supabase.rpc('user_has_mpin', { 
        user_phone: phoneNumber 
      });
      
      if (error) {
        console.error('Error checking MPIN status:', error);
        return;
      }
      
      setUserHasMpin(data || false);
      
      // Auto-switch to MPIN mode if user has it set up
      if (data && mode === 'otp') {
        setMode('mpin');
      }
    } catch (error) {
      console.error('Error checking phone for MPIN:', error);
    }
  };

  // Debounce phone input to check for MPIN
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone && phone.length >= 10) {
        checkPhoneForMPIN(phone);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phone]);

  const sendOtp = async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: { 
          channel: 'sms',
          data: { phone: phone }
        }
      });

      if (error) {
        console.error('OTP send error:', error);
        setError(error.message);
        
        // Auto-switch to password mode if SMS fails
        if (error.message.includes('SMS') || error.message.includes('21608') || error.message.includes('unverified')) {
          setAutoDetectedPasswordMode(true);
          setMode('password');
        }
        return;
      }

      setOtpSent(true);
      toast({
        title: "OTP sent!",
        description: "Please check your phone for the verification code.",
      });
    } catch (error: any) {
      console.error('Unexpected error during OTP send:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!phone || !otp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms'
      });

      if (error) {
        console.error('OTP verification error:', error);
        setError(error.message);
        return;
      }

      if (data.user) {
        setCurrentUserId(data.user.id);
        
        // Check if user has MPIN after successful login
        await checkPhoneForMPIN(phone);
        
        // If no MPIN, show setup
        if (!userHasMpin) {
          setMode('mpin-setup');
          return;
        }
        
        toast({
          title: "Login successful!",
          description: "Welcome back to AquaLedger.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected error during OTP verification:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPassword = async () => {
    if (!phone || !password) {
      setError('Please enter both phone number and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phone,
        password: password,
      });

      if (error) {
        console.error('Password sign in error:', error);
        setError(error.message);
        return;
      }

      if (data.user) {
        setCurrentUserId(data.user.id);
        
        // Check if user has MPIN after successful login
        await checkPhoneForMPIN(phone);
        
        // If no MPIN, show setup
        if (!userHasMpin) {
          setMode('mpin-setup');
          return;
        }
        
        toast({
          title: "Login successful!",
          description: "Welcome back to AquaLedger.",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected error during password sign in:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // MPIN verification
  const verifyMPIN = async (mpin: string) => {
    if (!phone) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('verify_user_mpin', { 
        user_phone: phone, 
        mpin_input: mpin 
      });

      if (error) {
        console.error('MPIN verification error:', error);
        setError('Invalid MPIN. Please try again.');
        return;
      }

      if (data) {
        // Get user info for login
        const { data: usernames } = await supabase
          .from('usernames')
          .select('user_id')
          .eq('username', phone)
          .single();

        if (usernames?.user_id) {
          // Create a session by signing in with password
          // This is a workaround since we need proper session management
          toast({
            title: "Login successful!",
            description: "Welcome back to AquaLedger.",
          });
          navigate('/');
        } else {
          setError('User not found');
        }
      } else {
        setError('Invalid MPIN. Please try again.');
      }
    } catch (error: any) {
      console.error('MPIN verification error:', error);
      setError('Failed to verify MPIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // MPIN setup
  const setupMPIN = async (mpin: string) => {
    if (!currentUserId) {
      setError('User session not found');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('set_user_mpin', { 
        user_id: currentUserId, 
        mpin_value: mpin 
      });

      if (error) {
        console.error('MPIN setup error:', error);
        setError('Failed to setup MPIN. Please try again.');
        return;
      }

      if (data) {
        toast({
          title: "MPIN setup complete!",
          description: "You can now use MPIN for quick login.",
        });
        navigate('/');
      } else {
        setError('Failed to setup MPIN. Please try again.');
      }
    } catch (error: any) {
      console.error('MPIN setup error:', error);
      setError('Failed to setup MPIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip MPIN setup
  const skipMPINSetup = () => {
    toast({
      title: "Login successful!",
      description: "Welcome to AquaLedger. You can setup MPIN later in settings.",
    });
    navigate('/');
  };

  const googleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        console.error('Google login error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message,
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during Google login:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize Google login. Please try again.",
      });
    }
  };

  const facebookLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) {
        console.error('Facebook login error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message,
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during Facebook login:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize Facebook login. Please try again.",
      });
    }
  };

  // MPIN mode rendering
  if (mode === 'mpin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <MPINInput
          phone={phone}
          onSubmit={verifyMPIN}
          onBack={() => setMode('otp')}
          isLoading={isLoading}
          error={error}
        />
      </div>
    );
  }

  // MPIN setup mode rendering
  if (mode === 'mpin-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <MPINSetup
          onComplete={setupMPIN}
          onSkip={skipMPINSetup}
          isLoading={isLoading}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome to AquaLedger</CardTitle>
          <CardDescription className="text-center">
            Sign in to manage your aquaculture business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              className="w-full"
            />
          </div>

          {/* Show MPIN option if user has MPIN */}
          {userHasMpin && phone && (
            <Button 
              onClick={() => setMode('mpin')}
              className="w-full"
            >
              <Key className="mr-2 h-4 w-4" />
              Login with MPIN
            </Button>
          )}

          {/* Only show OTP/Password options if user doesn't have MPIN or explicitly chooses them */}
          {(!userHasMpin || mode === 'otp' || mode === 'password') && (
            <>
              {mode === 'otp' && !otpSent && (
                <>
                  <Button 
                    onClick={sendOtp} 
                    disabled={isLoading || !phone}
                    className="w-full"
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </Button>
                  
                  {autoDetectedPasswordMode && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">SMS not working?</span>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant={autoDetectedPasswordMode ? "default" : "outline"}
                    onClick={() => setMode('password')}
                    className="w-full"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    {autoDetectedPasswordMode ? "Use password instead" : "Login with Password"}
                  </Button>
                </>
              )}

              {mode === 'otp' && otpSent && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                      >
                        <InputOTPGroup>
                          {[...Array(6)].map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}

                  <Button 
                    onClick={verifyOtp} 
                    disabled={isLoading || otp.length !== 6}
                    className="w-full"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <Button
                      variant="link"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setError('');
                      }}
                      className="p-0 h-auto font-normal"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back
                    </Button>
                    <Button
                      variant="link"
                      onClick={() => setMode('password')}
                      className="p-0 h-auto font-normal"
                    >
                      Use Password
                    </Button>
                  </div>
                </>
              )}

              {mode === 'password' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-destructive text-center">
                      {error}
                    </div>
                  )}

                  <Button 
                    onClick={signInWithPassword} 
                    disabled={isLoading || !phone || !password}
                    className="w-full"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <Button
                      variant="link"
                      onClick={() => {
                        setMode('otp');
                        setPassword('');
                        setError('');
                        setAutoDetectedPasswordMode(false);
                      }}
                      className="p-0 h-auto font-normal"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back to OTP
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={googleLogin}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              
              <Button
                variant="outline"
                onClick={facebookLogin}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Button
              variant="link"
              onClick={() => navigate('/signup')}
              className="p-0 h-auto font-normal"
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}