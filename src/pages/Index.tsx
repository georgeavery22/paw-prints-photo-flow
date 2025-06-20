
import React from 'react';
import NavBar from '@/components/NavBar';
import PhotoUpload from '@/components/PhotoUpload';
import { Calendar, Heart, PawPrint } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <NavBar />
      
      {/* Decorative paw prints background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Top right paw prints */}
        <div className="absolute top-24 right-10 transform rotate-12">
          <PawPrint size={38} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-40 right-32 transform rotate-15">
          <PawPrint size={28} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-60 right-24 transform -rotate-12">
          <PawPrint size={32} className="text-pawprints-darktext/15" />
        </div>
        
        {/* Top left paw prints */}
        <div className="absolute top-36 left-12 transform rotate-45">
          <PawPrint size={42} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-24 left-40 transform rotate-15">
          <PawPrint size={24} className="text-pawprints-darktext/15" />
        </div>
        
        {/* Bottom paw prints */}
        <div className="absolute bottom-40 left-1/4 transform -rotate-12">
          <PawPrint size={32} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute bottom-60 right-1/3 transform rotate-45">
          <PawPrint size={36} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute bottom-32 right-12 transform -rotate-20">
          <PawPrint size={30} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute bottom-24 left-20 transform rotate-30">
          <PawPrint size={34} className="text-pawprints-darktext/15" />
        </div>
        
        {/* Additional paw prints across the page */}
        <div className="absolute top-1/2 left-1/5 transform rotate-25">
          <PawPrint size={36} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-1/3 right-1/4 transform -rotate-15">
          <PawPrint size={30} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute bottom-1/2 right-1/5 transform rotate-40">
          <PawPrint size={34} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-3/4 left-1/3 transform -rotate-10">
          <PawPrint size={28} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute top-2/3 right-1/2 transform rotate-20">
          <PawPrint size={32} className="text-pawprints-darktext/15" />
        </div>
        <div className="absolute bottom-2/3 left-1/2 transform -rotate-25">
          <PawPrint size={38} className="text-pawprints-darktext/15" />
        </div>
      </div>
      
      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4 relative z-10">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-medium mb-6 text-pawprints-darktext leading-tight">
              Create beautiful calendars featuring your furry friend
            </h1>
            <p className="text-lg text-pawprints-darktext/70 mb-8 max-w-2xl mx-auto">
              Upload a photo of your dog, and we'll transform it into a personalized calendar 
              you'll cherish all year round.
            </p>
          </div>
          
          <PhotoUpload />
          
          <div className="mt-6 text-center text-pawprints-darktext/60 text-sm">
            By uploading, you agree to our <a href="#" className="underline hover:text-pawprints-terracotta">terms of service</a>
          </div>
        </div>
      </main>
      
      {/* Features */}
      <section className="py-16 bg-white relative z-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-medium text-center mb-12">Why choose Paw Prints?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-pawprints-beige/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={24} className="text-pawprints-terracotta" />
              </div>
              <h3 className="font-medium text-lg mb-2">High Quality Prints</h3>
              <p className="text-pawprints-darktext/70">
                Premium materials that showcase your dog beautifully
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 bg-pawprints-blue/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart size={24} className="text-pawprints-blue" />
              </div>
              <h3 className="font-medium text-lg mb-2">Personalized Touch</h3>
              <p className="text-pawprints-darktext/70">
                Custom layouts and designs tailored to your pet
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 bg-pawprints-terracotta/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pawprints-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-lg mb-2">Affordable Pricing</h3>
              <p className="text-pawprints-darktext/70">
                Beautiful memories without breaking the bank
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 bg-pawprints-beige/20 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <img 
              src="/lovable-uploads/7b6c60e8-b78f-4a4b-881b-b5d34b6f7284.png" 
              alt="Paw Prints Logo" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-medium text-pawprints-darktext">Paw Prints</span>
          </div>
          <p className="text-sm text-pawprints-darktext/60">
            © {new Date().getFullYear()} Paw Prints. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
