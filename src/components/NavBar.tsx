
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, BookOpen, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NavBar = () => {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/7b6c60e8-b78f-4a4b-881b-b5d34b6f7284.png" 
            alt="Paw Prints Logo" 
            className="h-10 w-auto"
          />
          <span className="text-xl font-medium text-pawprints-darktext">Paw Prints</span>
        </Link>
        
        <nav className="flex items-center gap-8">
          <Link to="/shop" className="nav-link flex items-center gap-2">
            <ShoppingBag size={18} />
            <span>Shop</span>
          </Link>
          
          <Link to="/my-generations" className="nav-link flex items-center gap-2">
            <BookOpen size={18} />
            <span>My Generations</span>
          </Link>
          
          <Link to="/account" className="nav-link flex items-center gap-2">
            <User size={18} />
            <span>{user ? 'Account' : 'Sign In'}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
