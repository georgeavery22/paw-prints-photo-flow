
import React from 'react';
import NavBar from '@/components/NavBar';

const MyGenerations = () => {
  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl font-medium mb-6 text-center">My Generations</h1>
        <p className="text-center text-pawprints-darktext/70 max-w-2xl mx-auto mb-12">
          View and manage your custom dog calendar creations.
        </p>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-pawprints-beige/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pawprints-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="font-medium text-xl mb-2">No generations yet</h3>
            <p className="text-pawprints-darktext/70 mb-4">
              Upload a photo on the home page to create your first custom calendar.
            </p>
            <a href="/" className="text-pawprints-terracotta hover:underline">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyGenerations;
