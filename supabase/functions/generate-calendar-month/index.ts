import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { calendarPrompts } from './calendar-prompts.ts';
import { multiDogCalendarPrompts } from './multi-dog-prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const artistDescriptions = {
  'Impressionist': 'loose, expressive brushstrokes and soft, dappled light filtering through trees, creating a dreamy atmosphere with warm earth tones and cool shadows',
  'Cubist': 'geometric forms and fragmented perspectives, breaking down the landscape into angular planes and bold, contrasting colors',
  'Pop Art': 'vibrant, saturated colors and bold outlines, with high contrast and graphic elements that make the scene pop with energy',
  'Watercolor': 'soft, flowing washes of color that blend seamlessly, with delicate transparency and gentle gradations',
  'Renaissance': 'precise detail and balanced composition, with rich, deep colors and masterful use of light and shadow',
  'Modern': 'clean lines and simplified forms, with a focus on composition and color relationships over fine detail',
  'Minimalist': 'simple, clean composition with essential elements only, using a limited color palette and plenty of negative space',
  'Abstract': 'non-representational forms and bold color combinations, emphasizing emotion and movement over realistic depiction',
  'Surrealist': 'dreamlike quality with unexpected elements and mysterious atmosphere, blending reality with imagination',
  'Cartoon': 'stylized, exaggerated features with bright, cheerful colors and a playful, animated quality',
  'Van Gogh': 'distinctive swirling brushstrokes and vibrant, emotional colors with thick impasto technique and dynamic energy'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, month } = await req.json();
    
    console.log(`🎨 [API CALL] DALL-E Generation - Month ${month} for generation ${generationId} at ${new Date().toISOString()}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get generation data
    console.log(`📊 [API CALL] Supabase Fetch - Generation data for ${generationId}`);
    const { data: generationData, error: fetchError } = await supabase
      .from('calendar_generations')
      .select('dog_descriptions, artist_style, title, user_id')
      .eq('id', generationId)
      .single();
    
    if (fetchError || !generationData) {
      throw new Error('Could not fetch generation data');
    }
    
    const { dog_descriptions, artist_style, title, user_id } = generationData;
    
    // Ensure dog_descriptions is an array
    const dogDescriptionsArray = Array.isArray(dog_descriptions) ? dog_descriptions : [dog_descriptions];
    
    // Determine if multiple dogs and select appropriate prompts
    const isMultipleDogs = dogDescriptionsArray.length > 1;
    const promptsToUse = isMultipleDogs ? multiDogCalendarPrompts : calendarPrompts;
    
    // Get the artist description for consistent style application
    const artistDescription = artistDescriptions[artist_style] || 'artistic style with expressive brushwork and rich colors';
    
    // Create the scene prompt with proper and consistent placeholder replacement
    let scenePrompt = promptsToUse[month - 1];
    
    // Replace all placeholders systematically to ensure consistency
    scenePrompt = scenePrompt
      .replace(/\[Artist\]/g, artist_style)
      .replace(/\[artist style\]/g, artist_style)  
      .replace(/\[Artist style\]/g, artist_style)
      .replace(/\[dog description\]/g, dogDescriptionsArray.join(' and '))
      .replace(/\[Dog description\]/g, dogDescriptionsArray.join(' and '))
      .replace(/\[artist description\]/g, artistDescription);
    
    console.log(`📝 DALL-E prompt for month ${month}:`, scenePrompt);
    
    // Generate image with DALL-E
    console.log(`🤖 [API CALL] DALL-E API - Generating image for month ${month}`);
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: scenePrompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd'
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('❌ DALL-E API error:', errorText);
      throw new Error(`DALL-E API error: ${dalleResponse.status} ${errorText}`);
    }

    const dalleData = await dalleResponse.json();
    console.log(`✅ [API CALL] DALL-E Success - Generated image for month ${month}`);
    
    if (!dalleData.data || !dalleData.data[0] || !dalleData.data[0].url) {
      console.error('Invalid DALL-E response:', dalleData);
      throw new Error('Invalid response from DALL-E API');
    }
    
    const generatedImageUrl = dalleData.data[0].url;
    
    // Download and store the image
    console.log(`💾 [API CALL] Image Download - Fetching generated image`);
    const imageResponse = await fetch(generatedImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const fileName = `calendar_${generationId}_${monthNames[month - 1]}.png`;
    
    console.log(`☁️ [API CALL] Supabase Storage Upload - ${fileName}`);
    const { error: uploadError } = await supabase.storage
      .from('calendars')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }
    
    const { data: urlData } = supabase.storage
      .from('calendars')
      .getPublicUrl(fileName);
    
    // Save to calendars table
    console.log(`📚 [API CALL] Supabase Insert - Calendar record for month ${month}`);
    const { error: calendarError } = await supabase
      .from('calendars')
      .insert({
        generation_id: generationId,
        image_url: urlData.publicUrl,
        month: month
      });
    
    if (calendarError) {
      console.error('Calendar insert error:', calendarError);
      throw calendarError;
    }
    
    console.log(`✅ Completed month ${month} for generation ${generationId}`);
    
    // Check if this was the last month (12)
    if (month === 12) {
      // Update generation status to completed
      console.log(`🏁 [API CALL] Supabase Update - Marking generation as completed`);
      const { error: updateError } = await supabase
        .from('calendar_generations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', generationId);
      
      if (updateError) {
        console.error('Generation update error:', updateError);
      }
      
      // Get user email for notification
      console.log(`👤 [API CALL] Supabase Auth - Getting user data for ${user_id}`);
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      
      if (userData?.user?.email) {
        // Send completion notification
        console.log(`📧 [API CALL] Send Notification - Calendar completion email`);
        await supabase.functions.invoke('send-calendar-notification', {
          body: {
            generationId,
            userEmail: userData.user.email,
            calendarTitle: title
          }
        });
      }
      
      console.log('🎉 Generation completed and notification sent');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        month,
        generationId,
        imageUrl: urlData.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`❌ Error generating calendar month:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate calendar month',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
