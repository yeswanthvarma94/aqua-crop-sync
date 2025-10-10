import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PhoneInput } from '@/components/ui/phone-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Separator } from '@/components/ui/separator';
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
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get the correct redirect URL based on platform
  const getRedirectUrl = () => {
    if (Capacitor.isNativePlatform()) {
      return 'app.lovable.08a558a8aca8494b8002d1fc467ee319://auth/callback';
    }
    return `${window.location.origin}/auth/callback`;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log("User authenticated via AuthContext, redirecting to dashboard...");
      navigate("/");
    }
  }, [user, navigate]);

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
      });

      if (error) {
        console.error('OTP send error:', error);
        setError(error.message || 'Failed to send OTP');
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
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms'
      });

      if (error) {
        console.error('OTP verification error:', error);
        setError(error.message || 'Invalid OTP');
        return;
      }

      toast({
        title: "Login successful!",
        description: "Welcome to AquaLedger.",
      });
      navigate('/');
    } catch (error: any) {
      console.error('Unexpected error during OTP verification:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Initiating Google OAuth with redirect URL:', getRedirectUrl());
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Google login error:', error);
        setError(`Google login failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Unexpected error during Google login:', error);
      setError('Failed to initialize Google login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const facebookLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Initiating Facebook OAuth with redirect URL:', getRedirectUrl());
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: getRedirectUrl(),
        },
      });
      
      if (error) {
        console.error('Facebook login error:', error);
        setError(`Facebook login failed: ${error.message}`);
      }
    } catch (error: any) {
      console.error('Unexpected error during Facebook login:', error);
      setError('Failed to initialize Facebook login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          {import.meta.env.DEV && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-secondary/50 rounded">
              Platform: {Capacitor.isNativePlatform() ? 'Mobile App' : 'Web Browser'}
              <br />
              Redirect URL: {getRedirectUrl()}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              className="w-full"
              disabled={isLoading || otpSent}
            />
          </div>

          {!otpSent ? (
            <Button 
              onClick={sendOtp} 
              disabled={isLoading || !phone}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Button>
          ) : (
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

              <Button 
                onClick={verifyOtp} 
                disabled={isLoading || otp.length !== 6}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError('');
                }}
                className="w-full"
                disabled={isLoading}
              >
                Change Phone Number
              </Button>
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
              className="w-full"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            
            <Button
              variant="outline"
              onClick={facebookLogin}
              className="w-full"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
