
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
    const { generationId, userEmail, calendarTitle, status = 'completed', successCount = 12, totalCount = 12 } = await req.json();
    
    console.log(`📧 [API CALL] Send Calendar Notification - Generation ${generationId} at ${new Date().toISOString()}`);
    console.log('📬 Sending to:', userEmail);
    console.log('📅 Calendar title:', calendarTitle);
    console.log('📊 Status:', status, `(${successCount}/${totalCount})`);
    
    // Check if RESEND_API_KEY is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not found - logging completion instead of sending email');
      console.log(`✅ CALENDAR ${status.toUpperCase()}: "${calendarTitle}" for ${userEmail}`);
      console.log(`🎉 Your calendar status: ${status} (${successCount}/${totalCount} months generated)`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Calendar completion logged (email sending skipped - no API key)`,
          generationId,
          userEmail,
          calendarTitle,
          status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Determine email content based on status
    let subject, statusMessage;
    if (status === 'completed') {
      subject = `🎉 Your "${calendarTitle}" Calendar is Ready!`;
      statusMessage = `All ${totalCount} months generated successfully!`;
    } else if (status === 'partial') {
      subject = `📅 Your "${calendarTitle}" Calendar is Partially Complete`;
      statusMessage = `${successCount} out of ${totalCount} months generated successfully.`;
    } else {
      subject = `⚠️ Issue with Your "${calendarTitle}" Calendar`;
      statusMessage = `Calendar generation encountered issues (${successCount}/${totalCount} months completed).`;
    }
    
    // Send email notification
    console.log('💌 [API CALL] Resend Email - Sending calendar completion notification');
    const emailResponse = await resend.emails.send({
      from: 'Paw Prints Calendar <noreply@yourdomain.com>',
      to: [userEmail],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #d4a574; text-align: center;">${status === 'completed' ? '🎉' : status === 'partial' ? '📅' : '⚠️'} Calendar Update</h1>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Calendar Details</h2>
            <p><strong>Title:</strong> ${calendarTitle}</p>
            <p><strong>Status:</strong> ${statusMessage}</p>
            <p><strong>Generation ID:</strong> ${generationId}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            ${status === 'completed' 
              ? `<p style="font-size: 18px; color: #333;">Your personalized dog calendar is now ready!</p>
                 <p style="color: #666;">You can view and download your complete calendar from the Shop page in your account.</p>`
              : status === 'partial'
              ? `<p style="font-size: 18px; color: #333;">Your calendar is partially complete with ${successCount} months generated.</p>
                 <p style="color: #666;">You can view the completed months in the Shop page. We'll continue working on the remaining months.</p>`
              : `<p style="font-size: 18px; color: #333;">We encountered some issues generating your calendar.</p>
                 <p style="color: #666;">Please contact support or try generating again from your account.</p>`
            }
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

    console.log('✅ [API CALL] Resend Success - Calendar notification email sent');
    console.log('📧 Email ID:', emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendar notification email sent successfully',
        emailId: emailResponse.data?.id,
        generationId,
        userEmail,
        calendarTitle,
        status
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
