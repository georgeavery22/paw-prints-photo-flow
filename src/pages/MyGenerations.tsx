
import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  calendars: Array<{
    id: string;
    image_url: string;
    month: number;
  }>;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
              image_url,
              month
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setGenerations(data || []);
      } catch (error) {
        console.error('Error fetching generations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        fetchGenerations();
        
        // Set up real-time updates
        const channel = supabase
          .channel('my-generations-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'calendars'
            },
            () => {
              fetchGenerations();
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'calendar_generations'
            },
            () => {
              fetchGenerations();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleImageClick = (imageUrl: string, title: string) => {
    setSelectedImage({ url: imageUrl, title });
  };

  const getProgressPercentage = (calendars: Generation['calendars']) => {
    return Math.round((calendars.length / 12) * 100);
  };

  const getStatusDisplay = (generation: Generation) => {
    switch (generation.status) {
      case 'completed':
        return { text: 'Completed', color: 'bg-green-100 text-green-700' };
      case 'processing':
        return { text: `Processing (${generation.calendars.length}/12)`, color: 'bg-yellow-100 text-yellow-700' };
      case 'awaiting_purchase':
        return { text: 'Preview Ready', color: 'bg-blue-100 text-blue-700' };
      default:
        return { text: generation.status, color: 'bg-gray-100 text-gray-700' };
    }
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
            {generations.map((generation) => {
              const statusDisplay = getStatusDisplay(generation);
              const firstCalendar = generation.calendars.find(cal => cal.month === 1);
              
              return (
                <div key={generation.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {firstCalendar ? (
                    <img 
                      src={firstCalendar.image_url} 
                      alt={generation.title} 
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(firstCalendar.image_url, generation.title)}
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
                    
                    {generation.status === 'processing' && (
                      <div className="mb-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{getProgressPercentage(generation.calendars)}%</span>
                        </div>
                        <Progress 
                          value={getProgressPercentage(generation.calendars)} 
                          className="h-2"
                        />
                        <p className="text-xs text-pawprints-darktext/70">
                          {generation.calendars.length} of 12 months completed
                        </p>
                        {generation.calendars.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {generation.calendars
                              .sort((a, b) => a.month - b.month)
                              .map((calendar) => (
                                <span 
                                  key={calendar.month}
                                  className="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded"
                                >
                                  {monthNames[calendar.month - 1].slice(0, 3)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-pawprints-darktext/50">
                        {new Date(generation.created_at).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusDisplay.color}`}>
                        {statusDisplay.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-hidden">
            {selectedImage && (
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title}
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyGenerations;
