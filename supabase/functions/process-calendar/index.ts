
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
