
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
    const { generationId, photoUrls, artistStyle } = await req.json();
    
    console.log('Processing calendar generation:', generationId);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Step 1: Analyze each uploaded image with OpenAI Vision
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
                  text: 'Describe this dog in detail. Focus on breed, color, size, distinctive features, pose, and setting. Be specific and descriptive for art generation purposes.'
                },
                {
                  type: 'image_url',
                  image_url: { url: photoUrl }
                }
              ]
            }
          ],
          max_tokens: 300
        }),
      });

      const visionData = await visionResponse.json();
      const description = visionData.choices[0].message.content;
      imageDescriptions.push(description);
      console.log('Generated description:', description);
    }
    
    // Step 2: Create template prompt for calendar generation
    const dogDescriptions = imageDescriptions.join('. ');
    const templatePrompt = `Create a beautiful ${artistStyle.toLowerCase()} style calendar artwork featuring: ${dogDescriptions}. The image should be suitable for a calendar cover with elegant composition, professional quality, and artistic flair in the ${artistStyle} artistic movement style. High resolution, detailed, masterpiece quality.`;
    
    console.log('DALL-E prompt:', templatePrompt);
    
    // Step 3: Generate calendar image with DALL-E
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: templatePrompt,
        n: 1,
        size: '1024x1024',
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
