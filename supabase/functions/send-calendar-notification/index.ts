
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, userEmail, calendarTitle } = await req.json();
    
    console.log('Sending completion email for generation:', generationId);
    
    const emailResponse = await resend.emails.send({
      from: 'Paw Prints <noreply@resend.dev>',
      to: [userEmail],
      subject: `Your "${calendarTitle}" calendar is ready!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #8B4513;">🐾 Your Calendar is Ready!</h1>
          <p>Great news! Your custom dog calendar "<strong>${calendarTitle}</strong>" has finished generating.</p>
          <p>All 12 months are now complete and ready for you to view and download.</p>
          <p style="margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'https://your-app.vercel.app'}/my-generations" 
               style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Your Calendar
            </a>
          </p>
          <p>Thank you for using Paw Prints!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            This email was sent because your calendar generation completed. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error sending notification email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification email', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
