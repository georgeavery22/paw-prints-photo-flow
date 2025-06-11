import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Generation = {
  id: string;
  title: string;
  artist_style: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  calendar?: {
    id: string;
    image_url: string;
  } | null;
};

const MyGenerations = () => {
  const { user, loading: authLoading } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('calendar_generations')
          .select(`
            id, 
            title, 
            artist_style, 
            status, 
            created_at, 
            completed_at,
            calendars (
              id,
              image_url
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Process data to match our expected type
        const processedData = data.map((gen: any) => ({
          ...gen,
          calendar: gen.calendars && gen.calendars.length > 0 ? gen.calendars[0] : null
        }));
        
        setGenerations(processedData);
      } catch (error) {
        console.error('Error fetching generations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        fetchGenerations();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleImageClick = (imageUrl: string, title: string) => {
    setSelectedImage({ url: imageUrl, title });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto px-4 pt-32 pb-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <h1 className="text-3xl font-medium mb-6 text-center">My Generations</h1>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pawprints-beige/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pawprints-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-medium text-xl mb-2">Please sign in</h3>
              <p className="text-pawprints-darktext/70 mb-4">
                Sign in to view your calendar generations
              </p>
              <Button 
                onClick={() => navigate('/account')} 
                className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl font-medium mb-6 text-center">My Generations</h1>
        <p className="text-center text-pawprints-darktext/70 max-w-2xl mx-auto mb-12">
          View and manage your custom dog calendar creations.
        </p>
        
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta" />
          </div>
        ) : generations.length === 0 ? (
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
              <Button 
                onClick={() => navigate('/')} 
                className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white"
              >
                Create Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generations.map((generation) => (
              <div key={generation.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {generation.calendar ? (
                  <img 
                    src={generation.calendar.image_url} 
                    alt={generation.title} 
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(generation.calendar!.image_url, generation.title)}
                  />
                ) : (
                  <div className="w-full h-48 bg-pawprints-beige/20 flex items-center justify-center">
                    {generation.status === 'processing' ? (
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta mx-auto mb-2" />
                        <p className="text-pawprints-darktext/70">Processing...</p>
                      </div>
                    ) : (
                      <p className="text-pawprints-darktext/70">Preview not available</p>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-medium text-lg mb-1">{generation.title}</h3>
                  <p className="text-sm text-pawprints-darktext/70 mb-2">
                    Style: {generation.artist_style}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-pawprints-darktext/50">
                      {new Date(generation.created_at).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      generation.status === 'completed' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {generation.status === 'completed' ? 'Completed' : 'Processing'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedImage && (
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title}
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyGenerations;
