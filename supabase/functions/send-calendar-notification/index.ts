
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, userEmail, calendarTitle } = await req.json();
    
    console.log('Calendar completion notification for generation:', generationId);
    console.log('User email:', userEmail);
    console.log('Calendar title:', calendarTitle);
    
    // For now, just log the completion - you can add actual email sending later with a proper API key
    console.log(`✅ CALENDAR COMPLETED: "${calendarTitle}" for ${userEmail}`);
    console.log('🎉 Your calendar is ready! All 12 months have been generated.');
    
    // Simulate successful email sending
    const emailResponse = {
      success: true,
      message: 'Calendar completion logged successfully',
      generationId,
      userEmail,
      calendarTitle
    };

    console.log('Notification processed successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process notification', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
