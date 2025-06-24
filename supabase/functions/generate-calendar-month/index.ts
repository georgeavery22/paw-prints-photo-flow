
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import prompts from the process-calendar directory
const calendarPrompts = [
  // January
  "A [Artist] style painting depicting [Artist style], capturing a cold, snow filled meadow surrounded by tall trees covered in snow, with side on, distant view of a dog also in [Artist] style. [Dog description] The blue and purple light of late gently illuminate the frosty field. The dog is in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, the dog's distinct posture and coloring make it visible against brisk winter landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a stark, snow-covered landscape with bare, gnarled trees against a swirling, deep twilight sky of icy blues and purples.",
  
  // February
  "A [Artist] style painting, depicting [Artist style], capturing a cool, frosty forest with tall trees, surrounding a pond with a side on, far distant view of a dog also in [Artist] style. [Dog description]  The grey-pink light of dawn casts soft shadows through the forest. The dog is in motion in the far distance, in a clearing at the edge of a pond. Though very far away, the dog's distinct posture and coloring make it visible. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a quiet, frosted forest with leafless branches against a pale, grey-pink dawn sky, hinting at a new day.",
  
  // March
  "A [Artist] style painting depicting [Artist style], capturing a brisk spring morning, in a meadow filled with daffodils and white lambs with side on, distant view of a dog also in [Artist] style. [Dog description] The cool light of midday casts gentle shadows across the meadow. The dog is in motion in the far distance, playfully bounding through the grass. Though very far away, the dog's distinct posture and coloring make it visible against the bursting spring landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting an awakening spring field with emerging green shoots and wind-swept clouds in a dynamic sky.",
  
  // April
  "A [Artist] style painting depicting [Artist style], capturing winding river winding gently with ducks in next to a green meadow full of flowers and a side on, distant view of a dog also in [Artist] style. [Dog description] The hopeful light of early afternoon casts soft glimmers across the river. The dog is in motion in the far distance, at the edge of a path following the river. Though very far away, the dog's distinct posture and coloring make it visible against the spring landscape. The composition emphasizes the natural surroundings, painted [Artist style], depicting a winding river with fresh green trees on the bank under a bright, optimistic blue sky.",
  
  // May
  "A [Artist] style painting depicting [Artist style], capturing a traditional summer fair, in a green field with brightly colored event style tents with a side on, distant view of a dog also in [Artist] style. [Dog description] The warm light of early afternoon casts gentle shadows across fair. The dog is in motion in the far distance, playfully bounding through a busy market. Though very far away, the dog's distinct posture and coloring make it visible against the bustling cheerful fair. The composition emphasizes the surroundings, painted with [Artist style], depicting an awakening spring with green grass and soft, rounded clouds in a dynamic sky.",
  
  // June
  "A [Artist] style painting depicting [Artist style], capturing a warm, grassy meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of a dog also in [Artist] style. [Dog description] The golden light of early afternoon casts soft shadows across the grassy field. The dog is in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, the dog's distinct posture and coloring make it visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a sprawling field, densely packed with wild flowers under an expansive blue summer sky.",
  
  // July
  "A [Artist] style painting depicting [Artist style], capturing a warm, sun-drenched golden sand beach lined by a welcoming blue sea and scattered with colorful sea shells, with a distant view of a dog also in [Artist] style. [Dog description] The golden light of midday casts shadows across the warm beach. The dog is in motion in the far distance, bounding playfully along the shoreline. Though very far away, the dog's distinct posture and coloring make it visible against the vibrant summer beach. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a warm beach, delicately lined by a warm ocean, shimmering under a brilliant, expansive blue summer sky.",
  
  // August
  "A [Artist] style painting depicting [Artist style], capturing a warm, sun-drenched golden field surrounded by green trees swaying in a gentle breeze with side on, distant view of a dog also in [Artist] style. [Dog description] The golden light of mid afternoon casts soft dancing across the golden field. The dog is in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, the dog's distinct posture and coloring make it visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a field, filled with wheat, swaying under a brilliant, blue summer sky.",
  
  // September
  "A [Artist] style painting depicting [Artist style], capturing a warm, sun-drenched farm, full of ripe crops next to a distant red barn, with side on, distant view of a dog also in [Artist] style. [Dog description] The golden light of late afternoon casts soft dancing across the busy yard. The dog is in motion in the far distance, at the edge of a path winding to the farm. Though very far away, the dog's distinct posture and coloring make it visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a busy farm under a blue sky scattered with clouds.",
  
  // October
  "A [Artist] style painting depicting [Artist style], capturing a eiree, wooden porch in front of a traditional farmhouse with a gently glowing jack'o'lantern and a side on, distant view of a dog also in [Artist] style. [Dog description] The flickering candle inside the jack'o'lantern sends dancing shadows across the porch. The dog is stood calmly in front of the brown wooden door. Though very far away, the dog's distinct posture and coloring make it visible in the poorly lit porch. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a Halloween evening in under a dark sky with the jack'o'lantern as the only source of illumination.",
  
  // November
  "A [Artist] style painting depicting [Artist style], capturing a chilly evening, under a sky full of fireworks dancing across a dark sky over vast grassy hills, with a side on, distant view of a dog also in [Artist] style. [Dog description] The colourful light of the fireworks casts brilliant shadows across the field. The dog is attentively watching the night sky. Though very far away, the dog's distinct posture and coloring make it visible against dark landscape. The composition emphasizes the natural surroundings, painted with [Artist style], depicting a quiet field under a sky illuminated by brilliant fireworks.",
  
  // December
  "A [Artist] style painting depicting [Artist style], capturing a friendly Christmas evening by a warm, brick fireplace, under a mantlepiece full of colourful stockings, on a soft and deep red carpet of a family home, with a side on, distant view of a dog also in [Artist] style. [Dog description] The warm flames casts dancing shadows throughout the welcoming room. The dog is attentively watching the fire flicker. Though very far away, the dog's distinct posture and coloring make it visible against the deep brown bricks of the wall. The composition emphasizes the welcoming surroundings, painted with [Artist style], depicting a warm living room, illuminated by a deep orange fire."
];

const multiDogCalendarPrompts = [
  // January
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a stark, snow-covered landscape with bare, gnarled trees against a swirling, deep twilight sky of icy blues and purples.",
  
  // February
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a quiet, frosted field with leafless branches against a pale, grey-pink dawn sky, hinting at a new day.",
  
  // March
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a muddy, awakening spring field with emerging green shoots and wind-swept clouds in a dynamic sky.",
  
  // April
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a vibrant orchard in full bloom with cherry and apple blossoms under a bright, optimistic blue sky.",
  
  // May
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a lush, verdant meadow bursting with early wildflowers, bathed in a soft, warm light.",
  
  // June
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a sprawling field of tall, golden wheat swaying under a brilliant, expansive blue summer sky.",
  
  // July
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a sun-drenched, vibrant sunflower field with towering sunflowers turning their heads towards an intense sky.",
  
  // August
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a golden-hued field nearing harvest, with heat-hazed hills under a vast, pale blue sky.",
  
  // September
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a vibrant vineyard in early autumn, with grapevines displaying turning leaves under a crisp, clear blue sky.",
  
  // October
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a forest floor carpeted in fallen leaves, with trees reaching into a cool, slightly overcast sky.",
  
  // November
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a stark, tree-lined avenue with a heavy, grey sky, hinting at the approaching cold.",
  
  // December
  "A [Artist] style painting, capturing a warm, sun-drenched meadow surrounded by tall trees and wildflowers swaying in a gentle breeze with side on, distant view of multiple dogs. [dog description]. The golden light of mid afternoon casts soft shadows across the grassy field. The dogs are in motion in the far distance, at the edge of a path winding through the clearing. Though very far away, each dog's distinct posture and coloring make them visible against the vibrant summer landscape. The composition emphasizes the natural surroundings, painted with [artist description], depicting a snow-covered, tranquil village at night under a vast, star-filled sky."
];

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
  'Van Gogh': 'Van Gogh\'s vivid colors, defined and expressive brushstrokes, and swirling textures'
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
