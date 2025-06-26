
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
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
    
    // Get generation data and check if dog descriptions exist
    console.log(`📊 [API CALL] Supabase Fetch - Generation data for ${generationId}`);
    const { data: generationData, error: fetchError } = await supabase
      .from('calendar_generations')
      .select('dog_descriptions, artist_style, user_id')
      .eq('id', generationId)
      .single();
    
    if (fetchError || !generationData) {
      throw new Error('Could not fetch generation data');
    }
    
    // If dog descriptions don't exist, generate them first
    if (!generationData.dog_descriptions || generationData.dog_descriptions.length === 0) {
      console.log(`🔍 [AI ANALYSIS] Generating dog descriptions for ${generationId}`);
      
      // Get the uploaded photos for this generation
      const { data: photosData, error: photosError } = await supabase
        .from('generation_photos')
        .select(`
          dog_photos!inner(file_path)
        `)
        .eq('generation_id', generationId);
      
      if (photosError || !photosData || photosData.length === 0) {
        throw new Error('Could not fetch dog photos for analysis');
      }
      
      const dogDescriptions = [];
      
      // Analyze each photo
      for (let i = 0; i < photosData.length; i++) {
        const photo = photosData[i];
        const filePath = photo.dog_photos.file_path;
        
        // Get public URL for the photo
        const { data: urlData } = supabase.storage
          .from('dog_photos')
          .getPublicUrl(filePath);
        
        console.log(`🤖 [API CALL] OpenAI Vision - Analyzing dog photo ${i + 1}`);
        
        // Call OpenAI Vision API to analyze the dog photo
        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this dog photo and provide a detailed but concise description focusing on: breed (if identifiable), coat color and pattern, size, distinctive features, and overall appearance. Keep it to 2-3 sentences that would help an artist paint this specific dog.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: urlData.publicUrl
                    }
                  }
                ]
              }
            ],
            max_tokens: 150
          }),
        });
        
        if (!visionResponse.ok) {
          console.error('OpenAI Vision API error:', await visionResponse.text());
          // Use a fallback description if AI analysis fails
          dogDescriptions.push('a beautiful dog with distinctive features');
        } else {
          const visionData = await visionResponse.json();
          const description = visionData.choices[0].message.content.trim();
          dogDescriptions.push(description);
          console.log(`✅ Generated description for dog ${i + 1}: ${description}`);
        }
      }
      
      // Save the dog descriptions to the database
      console.log(`💾 [API CALL] Supabase Update - Saving dog descriptions for ${generationId}`);
      const { error: updateError } = await supabase
        .from('calendar_generations')
        .update({
          dog_descriptions: dogDescriptions
        })
        .eq('id', generationId);
      
      if (updateError) {
        console.error('Error updating dog descriptions:', updateError);
        throw updateError;
      }
      
      console.log(`✅ Successfully generated and saved ${dogDescriptions.length} dog descriptions`);
    }
    
    if (generateAll) {
      // Update status to processing for full calendar generation
      console.log(`📊 [API CALL] Supabase Update - Setting status to processing for ${generationId}`);
      const { error: updateError } = await supabase
        .from('calendar_generations')
        .update({ status: 'processing' })
        .eq('id', generationId);
      
      if (updateError) {
        console.error('Error updating status:', updateError);
        throw updateError;
      }
      
      // Check if January already exists (from preview generation)
      console.log(`🔍 [API CALL] Supabase Check - Looking for existing January image`);
      const { data: existingJanuary } = await supabase
        .from('calendars')
        .select('id')
        .eq('generation_id', generationId)
        .eq('month', 1)
        .single();
      
      // Start from month 1 if no January exists, otherwise start from month 2
      const startMonth = existingJanuary ? 2 : 1;
      
      console.log(`🎨 Starting sequential generation of months ${startMonth}-12 for ${generationId}`);
      
      // Generate each month sequentially with proper delays
      const results = [];
      let successCount = existingJanuary ? 1 : 0; // Count January if it exists
      let failureCount = 0;
      
      for (let month = startMonth; month <= 12; month++) {
        try {
          console.log(`🎯 [SEQUENTIAL] Generate Month ${month} - Starting at ${new Date().toISOString()}`);
          
          const { data, error } = await supabase.functions
            .invoke('generate-calendar-month', {
              body: { generationId, month }
            });
          
          if (error) {
            console.error(`❌ Error generating month ${month}:`, error);
            failureCount++;
            results.push({ month, success: false, error: error.message });
            
            // Try once more after 30 seconds
            console.log(`🔄 Retrying month ${month} after 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            
            const { data: retryData, error: retryError } = await supabase.functions
              .invoke('generate-calendar-month', {
                body: { generationId, month }
              });
            
            if (retryError) {
              console.error(`❌ Retry failed for month ${month}:`, retryError);
              results[results.length - 1] = { month, success: false, error: retryError.message, retried: true };
            } else {
              console.log(`✅ Retry successful for month ${month}`);
              successCount++;
              failureCount--; // Adjust count since retry succeeded
              results[results.length - 1] = { month, success: true, retried: true };
            }
          } else {
            console.log(`✅ Month ${month} generation completed successfully`);
            successCount++;
            results.push({ month, success: true });
          }
          
          // CRITICAL: Always wait 20 seconds after each generation attempt
          if (month < 12) { // Don't wait after the last month
            console.log(`⏱️ [SEQUENTIAL] Waiting 20 seconds before next generation...`);
            await new Promise(resolve => setTimeout(resolve, 20000));
          }
          
        } catch (error) {
          console.error(`❌ Unexpected error for month ${month}:`, error);
          failureCount++;
          results.push({ month, success: false, error: error.message });
          
          // Still wait 20 seconds even after errors to maintain rate limiting
          if (month < 12) {
            console.log(`⏱️ [SEQUENTIAL] Waiting 20 seconds after error before continuing...`);
            await new Promise(resolve => setTimeout(resolve, 20000));
          }
        }
      }
      
      console.log(`🎉 [SEQUENTIAL] All months processed: ${successCount} successful, ${failureCount} failed`);
      
      // Update final status based on results
      const finalStatus = successCount === 12 ? 'completed' : failureCount === 12 ? 'failed' : 'partial';
      const updateData: any = { status: finalStatus };
      
      if (finalStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      await supabase
        .from('calendar_generations')
        .update(updateData)
        .eq('id', generationId);
      
      // Send notification if we have some successes
      if (successCount > 0) {
        try {
          // Get user email for notification
          console.log(`👤 [SEQUENTIAL] Getting user data for ${generationData.user_id}`);
          const { data: userData } = await supabase.auth.admin.getUserById(generationData.user_id);
          
          if (userData?.user?.email) {
            // Send completion notification
            console.log(`📧 [SEQUENTIAL] Sending calendar ${finalStatus} email`);
            const notificationResult = await supabase.functions.invoke('send-calendar-notification', {
              body: {
                generationId,
                userEmail: userData.user.email,
                calendarTitle: `${generationData.artist_style} Dog Calendar`,
                status: finalStatus,
                successCount,
                totalCount: 12
              }
            });
            
            if (notificationResult.error) {
              console.error('❌ Notification failed:', notificationResult.error);
            } else {
              console.log('✅ Notification sent successfully');
            }
          } else {
            console.log('⚠️ No user email found for notification');
          }
        } catch (notificationError) {
          console.error('❌ Error in notification process:', notificationError);
        }
      }
      
      console.log(`🏁 [SEQUENTIAL] Sequential generation process completed for ${generationId}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Calendar generation completed for generation ${generationId}`,
          generationId,
          status: finalStatus,
          results: results,
          successCount,
          failureCount
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
