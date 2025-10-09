import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone, otp }: VerifyOtpRequest = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: 'Phone number and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the most recent unverified OTP for this phone
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      console.error('OTP fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'OTP has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify OTP
    if (otpRecord.otp_code !== otp) {
      // Increment attempts
      await supabase
        .from('otp_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      return new Response(
        JSON.stringify({ error: 'Invalid OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Try to find existing user by querying profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('phone', phone)
      .maybeSingle();

    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    if (profileData?.user_id) {
      // User exists - generate session tokens
      userId = profileData.user_id;
      
      // Update phone_confirmed_at to mark phone as verified
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { phone_confirm: true }
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
      }

      // Generate access token for existing user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `${phone.replace(/\D/g, '')}@temp.local`,
      });

      if (sessionError || !sessionData) {
        console.error('Session generation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract tokens from the properties object
      accessToken = sessionData.properties?.access_token || '';
      refreshToken = sessionData.properties?.refresh_token || '';
    } else {
      // Create new user
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
        user_metadata: {
          phone: phone,
        }
      });

      if (createError) {
        console.error('User creation error:', createError);
        
        // If user exists error, try to recover by finding the user
        if (createError.message?.includes('already registered')) {
          return new Response(
            JSON.stringify({ error: 'User already exists. Please try logging in again.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!newUserData.user) {
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUserData.user.id;

      // Generate session for new user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: `${phone.replace(/\D/g, '')}@temp.local`,
      });

      if (sessionError || !sessionData) {
        console.error('Session generation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract tokens
      accessToken = sessionData.properties?.access_token || '';
      refreshToken = sessionData.properties?.refresh_token || '';
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        userId,
        phone,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        message: 'OTP verified successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
