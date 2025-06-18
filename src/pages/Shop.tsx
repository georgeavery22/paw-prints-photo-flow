
import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type CalendarGeneration = {
  id: string;
  title: string;
  artist_style: string;
  status: string;
  created_at: string;
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

const Shop = () => {
  const { user, loading: authLoading } = useAuth();
  const [awaitingGenerations, setAwaitingGenerations] = useState<CalendarGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const fetchAwaitingGenerations = async () => {
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
            calendars (
              id,
              image_url,
              month
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'awaiting_purchase')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setAwaitingGenerations(data || []);
      } catch (error) {
        console.error('Error fetching awaiting generations:', error);
        toast.error('Failed to load calendar previews');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchAwaitingGenerations();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handlePurchaseCalendar = async (generationId: string) => {
    setPurchasing(generationId);
    
    try {
      const { data, error } = await supabase.functions
        .invoke('process-calendar', {
          body: {
            generationId,
            generateAll: true
          }
        });
      
      if (error) throw error;
      
      toast.success('Calendar purchase successful! Your full 12-month calendar is being generated.');
      
      // Remove this generation from the awaiting list
      setAwaitingGenerations(prev => prev.filter(gen => gen.id !== generationId));
      
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase calendar. Please try again.');
    } finally {
      setPurchasing(null);
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
          <h1 className="text-3xl font-medium mb-6 text-center">Shop Paw Prints</h1>
          
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pawprints-beige/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pawprints-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-medium text-xl mb-2">Please sign in</h3>
              <p className="text-pawprints-darktext/70 mb-4">
                Sign in to view and purchase your calendar previews
              </p>
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
        <h1 className="text-3xl font-medium mb-6 text-center">Shop Paw Prints</h1>
        <p className="text-center text-pawprints-darktext/70 max-w-2xl mx-auto mb-12">
          Review your calendar previews and purchase the full 12-month calendar.
        </p>
        
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta" />
          </div>
        ) : awaitingGenerations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl mx-auto">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pawprints-beige/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-pawprints-beige" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-medium text-xl mb-2">No calendar previews available</h3>
              <p className="text-pawprints-darktext/70 mb-4">
                Create a calendar on the home page to see previews here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {awaitingGenerations.map((generation) => (
              <Card key={generation.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="text-xl">{generation.title}</CardTitle>
                  <p className="text-sm text-pawprints-darktext/70">
                    Style: {generation.artist_style} • Created: {new Date(generation.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {generation.calendars.length > 0 && (
                    <div className="space-y-4">
                      {/* Calendar Preview */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <img 
                          src={generation.calendars[0].image_url} 
                          alt="January Preview" 
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <div className="grid grid-cols-7 gap-1 text-xs text-center">
                          <div className="font-semibold py-1">Sun</div>
                          <div className="font-semibold py-1">Mon</div>
                          <div className="font-semibold py-1">Tue</div>
                          <div className="font-semibold py-1">Wed</div>
                          <div className="font-semibold py-1">Thu</div>
                          <div className="font-semibold py-1">Fri</div>
                          <div className="font-semibold py-1">Sat</div>
                          {/* Sample January 2024 calendar grid */}
                          <div className="py-1"></div>
                          <div className="py-1 bg-white rounded">1</div>
                          <div className="py-1 bg-white rounded">2</div>
                          <div className="py-1 bg-white rounded">3</div>
                          <div className="py-1 bg-white rounded">4</div>
                          <div className="py-1 bg-white rounded">5</div>
                          <div className="py-1 bg-white rounded">6</div>
                          <div className="py-1 bg-white rounded">7</div>
                          <div className="py-1 bg-white rounded">8</div>
                          <div className="py-1 bg-white rounded">9</div>
                          <div className="py-1 bg-white rounded">10</div>
                          <div className="py-1 bg-white rounded">11</div>
                          <div className="py-1 bg-white rounded">12</div>
                          <div className="py-1 bg-white rounded">13</div>
                          <div className="py-1 bg-white rounded">14</div>
                          <div className="py-1 bg-white rounded">15</div>
                          <div className="py-1 bg-white rounded">16</div>
                          <div className="py-1 bg-white rounded">17</div>
                          <div className="py-1 bg-white rounded">18</div>
                          <div className="py-1 bg-white rounded">19</div>
                          <div className="py-1 bg-white rounded">20</div>
                          <div className="py-1 bg-white rounded">21</div>
                          <div className="py-1 bg-white rounded">22</div>
                          <div className="py-1 bg-white rounded">23</div>
                          <div className="py-1 bg-white rounded">24</div>
                          <div className="py-1 bg-white rounded">25</div>
                          <div className="py-1 bg-white rounded">26</div>
                          <div className="py-1 bg-white rounded">27</div>
                          <div className="py-1 bg-white rounded">28</div>
                          <div className="py-1 bg-white rounded">29</div>
                          <div className="py-1 bg-white rounded">30</div>
                          <div className="py-1 bg-white rounded">31</div>
                        </div>
                        <p className="text-center text-lg font-medium mt-2">January Preview</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-pawprints-darktext/70 mb-4">
                          This is a preview of your January calendar page. Purchase to get all 12 months!
                        </p>
                        <Button 
                          onClick={() => handlePurchaseCalendar(generation.id)}
                          disabled={purchasing === generation.id}
                          className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white px-8 py-3 text-lg"
                        >
                          {purchasing === generation.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Purchasing...
                            </>
                          ) : (
                            'Purchase Full Calendar - $29.99'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
