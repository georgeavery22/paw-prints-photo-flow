
import React from 'react';
import NavBar from '@/components/NavBar';

const Shop = () => {
  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl font-medium mb-6 text-center">Shop Paw Prints</h1>
        <p className="text-center text-pawprints-darktext/70 max-w-2xl mx-auto mb-12">
          Explore our collection of custom dog-themed calendars and more.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center">
            <div className="w-full h-48 bg-pawprints-beige/20 rounded-lg mb-4"></div>
            <h3 className="font-medium text-lg mb-2">Coming Soon</h3>
            <p className="text-center text-sm text-pawprints-darktext/70">
              Our shop is currently under development. Check back soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
