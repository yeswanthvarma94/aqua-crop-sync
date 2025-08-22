import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TestAuth = () => {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("test123456");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Clean up any existing auth state
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Account created! You can now test CRUD operations.",
      });
      
      // Navigate to home after successful signup
      navigate("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Clean up any existing auth state
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Success", 
        description: "Signed in! CRUD operations should now work.",
      });
      
      // Navigate to home after successful signin
      navigate("/");
    } catch (error: any) {
      console.error("Signin error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Test Authentication</CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Sign in or create a test account to enable CRUD operations
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                Sign In
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="w-full" 
                disabled={loading}
                onClick={handleSignUp}
              >
                Create Test Account
              </Button>
            </div>
          </form>
          
          <div className="text-xs text-muted-foreground text-center space-y-2">
            <p><strong>For Testing:</strong></p>
            <p>• Use email: test@example.com</p>
            <p>• Use password: test123456</p>
            <p>• Create account first, then sign in</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAuth;