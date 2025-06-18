
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { calendarPrompts } from './calendar-prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Artist style descriptions
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
    const { generationId, photoUrls, artistStyle, generateAll = false } = await req.json();
    
    console.log('Processing calendar generation:', generationId, 'generateAll:', generateAll);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (!generateAll) {
      // Step 1: Analyze each uploaded image with OpenAI Vision using new prompt
      const imageDescriptions = [];
      
      for (const photoUrl of photoUrls) {
        console.log('Analyzing image:', photoUrl);
        
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
                    text: `Here's a photo of my dog. Describe the dog so it could be used as part of an image generation prompt. You must use 22-27 words. Focus on the dog's appearance, you must include size, build (show bias towards athletic descriptions), fur color (avoid using the word black unless absolutely necessary), distinctive markings, ears, demenor, and you may include the breed you think it is (this doesn't have to be pure-bred but can be a mix but if it is a mix you must mention more than one breed). Be very specific about physical attributes and prioritize unique features. Mention breed first. Ignore the background.`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: photoUrl }
                  }
                ]
              }
            ],
            max_tokens: 100
          }),
        });

        const visionData = await visionResponse.json();
        const description = visionData.choices[0].message.content;
        imageDescriptions.push(description);
        console.log('Generated description:', description);
      }
      
      // Save dog descriptions for later use
      const { error: updateError } = await supabase
        .from('calendar_generations')
        .update({
          dog_descriptions: imageDescriptions
        })
        .eq('id', generationId);
      
      if (updateError) {
        console.error('Error saving dog descriptions:', updateError);
      }
      
      // Step 2: Generate only the first image (January) using the first prompt
      const scenePrompt = calendarPrompts[0]
        .replace('[Artist]', artistStyle)
        .replace('[dog description]', imageDescriptions.join(' and '))
        .replace('[artist description]', artistDescriptions[artistStyle] || 'artistic style with expressive brushwork and rich colors');
      
      console.log('DALL-E prompt for January:', scenePrompt);
      
      // Step 3: Generate first calendar image with DALL-E in landscape format
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

      const dalleData = await dalleResponse.json();
      const generatedImageUrl = dalleData.data[0].url;
      
      console.log('Generated first calendar image:', generatedImageUrl);
      
      // Step 4: Download and store the generated image in Supabase storage
      const imageResponse = await fetch(generatedImageUrl);
      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      
      const fileName = `calendar_${generationId}_january.png`;
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
      
      // Get the public URL for the stored image
      const { data: urlData } = supabase.storage
        .from('calendars')
        .getPublicUrl(fileName);
      
      const storedImageUrl = urlData.publicUrl;
      
      // Step 5: Save calendar result to database
      const { error: calendarError } = await supabase
        .from('calendars')
        .insert({
          generation_id: generationId,
          image_url: storedImageUrl,
          month: 1
        });
      
      if (calendarError) {
        console.error('Calendar insert error:', calendarError);
        throw calendarError;
      }
      
      // Step 6: Update generation status to awaiting_purchase
      const { error: updateGenError } = await supabase
        .from('calendar_generations')
        .update({
          status: 'awaiting_purchase'
        })
        .eq('id', generationId);
      
      if (updateGenError) {
        console.error('Generation update error:', updateGenError);
        throw updateGenError;
      }
      
      console.log('First calendar image completed successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          calendarUrl: storedImageUrl,
          generationId,
          status: 'awaiting_purchase'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Generate all 12 images
      console.log('Generating all 12 calendar images for generation:', generationId);
      
      // Get the saved dog descriptions
      const { data: generationData, error: fetchError } = await supabase
        .from('calendar_generations')
        .select('dog_descriptions, artist_style')
        .eq('id', generationId)
        .single();
      
      if (fetchError || !generationData) {
        throw new Error('Could not fetch generation data');
      }
      
      const dogDescriptions = generationData.dog_descriptions;
      const style = generationData.artist_style;
      
      // Generate remaining 11 images (February through December)
      for (let month = 2; month <= 12; month++) {
        const scenePrompt = calendarPrompts[month - 1]
          .replace('[Artist]', style)
          .replace('[dog description]', dogDescriptions.join(' and '))
          .replace('[artist description]', artistDescriptions[style] || 'artistic style with expressive brushwork and rich colors');
        
        console.log(`DALL-E prompt for month ${month}:`, scenePrompt);
        
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

        const dalleData = await dalleResponse.json();
        const generatedImageUrl = dalleData.data[0].url;
        
        // Download and store the image
        const imageResponse = await fetch(generatedImageUrl);
        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                           'july', 'august', 'september', 'october', 'november', 'december'];
        const fileName = `calendar_${generationId}_${monthNames[month - 1]}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('calendars')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Storage upload error for month', month, ':', uploadError);
          continue; // Continue with other months even if one fails
        }
        
        const { data: urlData } = supabase.storage
          .from('calendars')
          .getPublicUrl(fileName);
        
        // Save to calendars table
        const { error: calendarError } = await supabase
          .from('calendars')
          .insert({
            generation_id: generationId,
            image_url: urlData.publicUrl,
            month: month
          });
        
        if (calendarError) {
          console.error('Calendar insert error for month', month, ':', calendarError);
        }
        
        console.log(`Completed month ${month}`);
      }
      
      // Update generation status to completed
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
      
      console.log('All 12 calendar images completed successfully');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          generationId,
          status: 'completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error('Error in process-calendar function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process calendar generation',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
