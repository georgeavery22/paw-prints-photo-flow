import React, { useState, useRef } from 'react';
import { Image, Upload, Camera } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Artist style options with iconic examples
const artistStyles = [
  { name: "Impressionist", icon: "🌊" }, // Monet's water lilies
  { name: "Cubist", icon: "📐" }, // Picasso's geometric figures
  { name: "Pop Art", icon: "🎨" }, // Warhol's bright colors
  { name: "Watercolor", icon: "💧" }, // Turner's soft edges
  { name: "Renaissance", icon: "🏛️" }, // Da Vinci's classical style
  { name: "Modern", icon: "🔲" }, // Mondrian's blocks
  { name: "Minimalist", icon: "⬜" }, // Malevich's simplicity
  { name: "Abstract", icon: "🌀" }, // Kandinsky's shapes
  { name: "Surrealist", icon: "🌙" }, // Dali's dreamscapes
  { name: "Cartoon", icon: "🦸" }, // Comic book style
  { name: "Van Gogh", icon: "🌻" }, // Starry Night/Sunflowers
];

const PhotoUpload = () => {
  const [dogCount, setDogCount] = useState<string>("1");
  const [artistStyle, setArtistStyle] = useState<string>("");
  const [uploads, setUploads] = useState<Array<{ file: File | null, preview: string | null }>>([
    { file: null, preview: null }
  ]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Update uploads array when dog count changes
  const handleDogCountChange = (value: string) => {
    setDogCount(value);
    const count = parseInt(value);
    
    // Expand or shrink the uploads array based on the new count
    if (count > uploads.length) {
      // Add new empty upload slots
      setUploads([
        ...uploads,
        ...Array(count - uploads.length).fill({ file: null, preview: null })
      ]);
    } else if (count < uploads.length) {
      // Remove excess upload slots
      setUploads(uploads.slice(0, count));
    }
  };
  
  const handleArtistStyleChange = (value: string) => {
    setArtistStyle(value);
  };
  
  const handleCreateCalendar = async () => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please sign in to create a calendar');
      navigate('/account');
      return;
    }
    
    // Check if all uploads have files
    const allUploaded = uploads.every(upload => upload.file !== null);
    
    if (!allUploaded) {
      toast.error(`Please upload ${dogCount === "1" ? "a photo" : "photos"} of your ${dogCount === "1" ? "dog" : "dogs"}`);
      return;
    }
    
    // If artist style is not selected
    if (!artistStyle) {
      toast.error("Please select an artist style");
      return;
    }
    
    try {
      setSaving(true);
      
      // 1. Create a new calendar generation
      const { data: generationData, error: generationError } = await supabase
        .from('calendar_generations')
        .insert({
          user_id: user.id,
          title: `${artistStyle} Dog Calendar`,
          artist_style: artistStyle,
          status: 'processing'
        })
        .select('id')
        .single();
      
      if (generationError) throw generationError;
      
      const generationId = generationData.id;
      
      // 2. Upload each photo to storage and save to database
      const photoUrls = [];
      
      for (let index = 0; index < uploads.length; index++) {
        const upload = uploads[index];
        if (!upload.file) continue;
        
        // Create a unique file path for the dog photo
        const fileExt = upload.file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('dog_photos')
          .upload(filePath, upload.file);
        
        if (uploadError) throw uploadError;
        
        // Get public URL for the uploaded photo
        const { data: urlData } = supabase.storage
          .from('dog_photos')
          .getPublicUrl(filePath);
        
        photoUrls.push(urlData.publicUrl);
        
        // Save to database
        const { data: photoData, error: photoError } = await supabase
          .from('dog_photos')
          .insert({
            user_id: user.id,
            file_path: filePath
          })
          .select('id')
          .single();
        
        if (photoError) throw photoError;
        
        // Link photo to generation
        const { error: linkError } = await supabase
          .from('generation_photos')
          .insert({
            generation_id: generationId,
            photo_id: photoData.id
          });
        
        if (linkError) throw linkError;
      }
      
      // 3. Call the AI processing edge function
      console.log('Calling AI processing function with:', { generationId, photoUrls, artistStyle });
      
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-calendar', {
          body: {
            generationId,
            photoUrls,
            artistStyle
          }
        });
      
      if (processError) {
        console.error('AI processing error:', processError);
        throw processError;
      }
      
      console.log('AI processing result:', processResult);
      
      toast.success("Your calendar is being created! Check My Generations to see the result.");
      navigate('/my-generations');
      
    } catch (error: any) {
      console.error('Calendar creation error:', error);
      
      // Update generation status to failed if it was created
      if (generationData?.id) {
        await supabase
          .from('calendar_generations')
          .update({
            status: 'failed'
          })
          .eq('id', generationData.id);
      }
      
      toast.error(error.message || 'An error occurred while creating your calendar');
    } finally {
      setSaving(false);
    }
  };
  
  // Render a single upload box
  const renderUploadBox = (index: number) => {
    const { file, preview } = uploads[index];
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const newUploads = [...uploads];
      // We need to keep the file and preview, just update the isDragging state visually
      e.currentTarget.classList.add("border-pawprints-terracotta");
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove("border-pawprints-terracotta");
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove("border-pawprints-terracotta");
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0], index);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0], index);
      }
    };

    const handleFile = (file: File, idx: number) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      const newUploads = [...uploads];
      const reader = new FileReader();
      reader.onload = () => {
        newUploads[idx] = { file, preview: reader.result as string };
        setUploads(newUploads);
        toast.success(`Photo ${idx + 1} uploaded successfully!`);
      };
      reader.readAsDataURL(file);
    };

    const handleClick = () => {
      const fileInput = document.getElementById(`file-input-${index}`) as HTMLInputElement;
      fileInput?.click();
    };

    const handleReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newUploads = [...uploads];
      newUploads[index] = { file: null, preview: null };
      setUploads(newUploads);
      const fileInput = document.getElementById(`file-input-${index}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    };
    
    return (
      <div 
        key={index}
        className={cn(
          "w-full max-w-xl mx-auto upload-zone border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer transition-all hover:border-pawprints-terracotta mt-4",
          preview ? "border-pawprints-blue" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input 
          type="file" 
          className="hidden" 
          id={`file-input-${index}`}
          onChange={handleFileChange}
          accept="image/*"
        />
        
        {preview ? (
          <div className="relative w-full">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-60 object-contain rounded-lg"
            />
            <button 
              onClick={handleReset} 
              className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pawprints-darktext" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-center mt-4 font-medium text-pawprints-blue">Dog photo {index + 1} uploaded</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 mb-4 rounded-full bg-pawprints-beige/30 flex items-center justify-center animate-float mx-auto">
              <Camera size={40} className="text-pawprints-terracotta" />
            </div>
            <h3 className="text-xl font-medium mb-2 text-center">Upload a photo of dog {index + 1}</h3>
            <p className="text-center text-pawprints-darktext/70 mb-4 max-w-md mx-auto">
              Drag and drop your favorite photo here, or click to browse
            </p>
            <div className="flex items-center gap-2 text-sm text-pawprints-darktext/50 justify-center">
              <Upload size={14} />
              <span>JPG, PNG or GIF</span>
            </div>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Stack dropdowns vertically with Number of Dogs on top */}
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Number of Dogs Dropdown */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-pawprints-darktext">Number of Dogs</label>
          <Select value={dogCount} onValueChange={handleDogCountChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select number of dogs" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'Dog' : 'Dogs'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Artist Style Dropdown */}
        <div className="space-y-2 w-full">
          <label className="text-sm font-medium text-pawprints-darktext">Artist Style</label>
          <Select value={artistStyle} onValueChange={handleArtistStyleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an artist style" />
            </SelectTrigger>
            <SelectContent>
              {artistStyles.map((style) => (
                <SelectItem key={style.name} value={style.name}>
                  <div className="flex items-center gap-2">
                    <span>{style.icon}</span>
                    <span>{style.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Render upload boxes based on dog count */}
      <div className="space-y-6">
        {uploads.map((_, index) => renderUploadBox(index))}
      </div>
      
      {/* Sign in prompt if not logged in */}
      {!user && (
        <div className="bg-pawprints-beige/20 p-4 rounded-lg text-center max-w-xl mx-auto">
          <p className="text-pawprints-darktext mb-2">Sign in to save your creations</p>
          <Button 
            variant="outline" 
            className="text-pawprints-terracotta" 
            onClick={() => navigate('/account')}
          >
            Sign In / Sign Up
          </Button>
        </div>
      )}
      
      {/* Create Calendar Button */}
      <div className="flex justify-center mt-8">
        <Button 
          onClick={handleCreateCalendar}
          className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white py-3 px-8 rounded-full text-lg font-medium"
          disabled={saving}
        >
          {saving ? 'Creating AI Calendar...' : 'Create My Calendar'}
        </Button>
      </div>
    </div>
  );
};

export default PhotoUpload;
