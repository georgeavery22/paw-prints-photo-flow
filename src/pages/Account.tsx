
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NavBar from '@/components/NavBar';
import Auth from '@/components/Auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Account = () => {
  const { user, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center">Loading account information...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl font-medium mb-6 text-center">My Account</h1>

        {user ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-medium mb-2">Account Details</h2>
              <p className="text-pawprints-darktext/70">
                <strong>Email:</strong> {user.email}
              </p>
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                className="text-pawprints-terracotta hover:text-pawprints-terracotta/80"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <Auth />
        )}
      </div>
    </div>
  );
};

export default Account;
