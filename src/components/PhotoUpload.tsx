
import React, { useState, useRef } from 'react';
import { Image, Upload, Camera } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

const PhotoUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    setFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      toast.success('Photo uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div 
      className={cn(
        "w-full max-w-xl mx-auto upload-zone flex flex-col items-center justify-center cursor-pointer",
        isDragging ? "border-pawprints-terracotta bg-white" : "",
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
        ref={fileInputRef}
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
          <p className="text-center mt-4 font-medium text-pawprints-blue">Great! Now let's create your calendar</p>
        </div>
      ) : (
        <>
          <div className="w-20 h-20 mb-4 rounded-full bg-pawprints-beige/30 flex items-center justify-center animate-float">
            <Camera size={40} className="text-pawprints-terracotta" />
          </div>
          <h3 className="text-xl font-medium mb-2">Upload a photo of your dog</h3>
          <p className="text-center text-pawprints-darktext/70 mb-4 max-w-md">
            Drag and drop your favorite photo here, or click to browse
          </p>
          <div className="flex items-center gap-2 text-sm text-pawprints-darktext/50">
            <Upload size={14} />
            <span>JPG, PNG or GIF</span>
          </div>
        </>
      )}
    </div>
  );
};

export default PhotoUpload;
