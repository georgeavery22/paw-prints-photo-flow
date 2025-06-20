
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, userEmail, calendarTitle } = await req.json();
    
    console.log(`📧 [API CALL] Send Calendar Notification - Generation ${generationId} at ${new Date().toISOString()}`);
    console.log('📬 Sending to:', userEmail);
    console.log('📅 Calendar title:', calendarTitle);
    
    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not found - logging completion instead of sending email');
      console.log(`✅ CALENDAR COMPLETED: "${calendarTitle}" for ${userEmail}`);
      console.log('🎉 Your calendar is ready! All 12 months have been generated.');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Calendar completion logged (email sending skipped - no API key)',
          generationId,
          userEmail,
          calendarTitle
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Send email notification
    console.log('💌 [API CALL] Resend Email - Sending calendar completion notification');
    const emailResponse = await resend.emails.send({
      from: 'Paw Prints Calendar <noreply@yourdomain.com>',
      to: [userEmail],
      subject: `🎉 Your "${calendarTitle}" Calendar is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #d4a574; text-align: center;">🎉 Your Calendar is Complete!</h1>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Calendar Details</h2>
            <p><strong>Title:</strong> ${calendarTitle}</p>
            <p><strong>Status:</strong> All 12 months generated successfully!</p>
            <p><strong>Generation ID:</strong> ${generationId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; color: #333;">Your personalized dog calendar featuring all 12 months is now ready!</p>
            <p style="color: #666;">You can view and download your complete calendar from the Shop page in your account.</p>
          </div>
          
          <div style="background-color: #d4a574; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">🐾 Thank you for using Paw Prints Calendar! 🐾</p>
          </div>
          
          <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('❌ Resend email error:', emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log('✅ [API CALL] Resend Success - Calendar completion email sent');
    console.log('📧 Email ID:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendar completion email sent successfully',
        emailId: emailResponse.data?.id,
        generationId,
        userEmail,
        calendarTitle
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error sending calendar notification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send calendar notification', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
