import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Minimal OAuth callback handler page
// - Parses the tokens from the URL (handled by supabase client detectSessionInUrl)
// - Waits for onAuthStateChange to fire, then redirects to dashboard
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe for a short time to capture the OAuth session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate('/', { replace: true });
      }
    });

    // Also force a session check in case the event has already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate('/', { replace: true });
      }
    });

    // Cleanup
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-sm text-muted-foreground">Completing sign-in…</div>
    </div>
  );
}
