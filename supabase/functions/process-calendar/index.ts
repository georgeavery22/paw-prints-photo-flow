
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

// Scene descriptions
const getSceneDescription = (artistStyle: string, dogDescriptions: string[], dogCount: number) => {
  const artistDesc = artistDescriptions[artistStyle] || 'artistic style with expressive brushwork and rich colors';
  
  if (dogCount === 1) {
    return `A painting in the style of ${artistStyle}, capturing a vast, sunlit winter forest clearing. Long shadows stretch over frosty grass, and a snowy path leads deep into the distance. At the far end of the path, a small figure of a dog can be seen. ${dogDescriptions[0]}. Though distant, the dog's distinct coloration and silhouette make it visible against the snow. The composition focuses on the expansive winter landscape, painted with ${artistDesc}. The dog is subtly integrated into the scene, casting a small shadow and reflecting the morning light.`;
  } else {
    const dogList = dogDescriptions.join(' and ');
    return `A painting in the style of ${artistStyle}, capturing a vast, sunlit winter forest clearing. Long shadows stretch over frosty grass, and a snowy path leads deep into the distance. At the far end of the path, small figures of dogs can be seen walking together. ${dogList}. Though distant, each dog's distinct coloration and silhouette make them visible against the snow. The composition focuses on the expansive winter landscape, painted with ${artistDesc}. The dogs are subtly integrated into the scene, each casting small shadows and reflecting the morning light as they move through the peaceful winter setting.`;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generationId, photoUrls, artistStyle } = await req.json();
    
    console.log('Processing calendar generation:', generationId);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Analyze each uploaded image with OpenAI Vision using preset prompt
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
                  text: `Here's a photo of my dog. Can you describe the dog in 20-30 words so it could be used as part of an image generation prompt? Focus just on the dog's appearance — like size, fur color, markings, ears, expression, and the breed you think it is (this doesn't have to be pure-bred but can be a mix but if it is a mix mention more than one breed). Ignore the background.`
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
    
    // Step 2: Create scene description using preset template
    const scenePrompt = getSceneDescription(artistStyle, imageDescriptions, photoUrls.length);
    
    console.log('DALL-E prompt:', scenePrompt);
    
    // Step 3: Generate calendar image with DALL-E in landscape format
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
    
    console.log('Generated calendar image:', generatedImageUrl);
    
    // Step 4: Download and store the generated image in Supabase storage
    const imageResponse = await fetch(generatedImageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    const fileName = `calendar_${generationId}.png`;
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
        image_url: storedImageUrl
      });
    
    if (calendarError) {
      console.error('Calendar insert error:', calendarError);
      throw calendarError;
    }
    
    // Step 6: Update generation status to completed
    const { error: updateError } = await supabase
      .from('calendar_generations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', generationId);
    
    if (updateError) {
      console.error('Generation update error:', updateError);
      throw updateError;
    }
    
    console.log('Calendar generation completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        calendarUrl: storedImageUrl,
        generationId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
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
