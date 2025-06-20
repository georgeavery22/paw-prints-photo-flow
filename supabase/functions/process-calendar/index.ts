
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, generateAll = false } = await req.json();
    
    console.log(`🚀 [API CALL] Process Calendar - Generation ${generationId}, generateAll: ${generateAll} at ${new Date().toISOString()}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (generateAll) {
      // Only update status to processing for full calendar generation
      console.log(`📊 [API CALL] Supabase Update - Setting status to processing for ${generationId}`);
      const { error: updateError } = await supabase
        .from('calendar_generations')
        .update({ status: 'processing' })
        .eq('id', generationId);
      
      if (updateError) {
        console.error('Error updating status:', updateError);
        throw updateError;
      }
      
      // Generate all 12 months with rate limiting (2 per minute = 30 seconds between each)
      console.log('🎨 Starting rate-limited generation of all 12 months (2 per minute)');
      
      // Use EdgeRuntime.waitUntil to handle background task
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            for (let month = 1; month <= 12; month++) {
              console.log(`🎯 [API CALL] Generate Month ${month} - Starting generation at ${new Date().toISOString()}`);
              
              const { data, error } = await supabase.functions
                .invoke('generate-calendar-month', {
                  body: { generationId, month }
                });
              
              if (error) {
                console.error(`❌ Error generating month ${month}:`, error);
                // Continue with next months even if one fails
              } else {
                console.log(`✅ Month ${month} generation initiated successfully`);
              }
              
              // Rate limiting: Wait 30 seconds between requests (2 per minute)
              if (month < 12) {
                console.log(`⏳ Rate limiting: Waiting 30 seconds before generating month ${month + 1}`);
                await new Promise(resolve => setTimeout(resolve, 30000));
              }
            }
            console.log('🎉 All 12 month generations have been initiated with rate limiting');
          } catch (error) {
            console.error('❌ Error in background generation process:', error);
          }
        })()
      );
      
      // Return immediate response
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Calendar generation started with rate limiting (2 per minute)',
          generationId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Generate just January for preview - DON'T change status to processing
      console.log(`🎯 [API CALL] Generate Preview - Month 1 for generation ${generationId}`);
      const { data, error } = await supabase.functions
        .invoke('generate-calendar-month', {
          body: { generationId, month: 1 }
        });
      
      if (error) {
        console.error('Preview generation error:', error);
        throw error;
      }
      
      console.log('✅ Preview generation completed successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          preview: true,
          generationId,
          data 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error(`❌ Error in process-calendar:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process calendar',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
