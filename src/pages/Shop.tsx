import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [processingGenerations, setProcessingGenerations] = useState<CalendarGeneration[]>([]);
  const [completedGenerations, setCompletedGenerations] = useState<CalendarGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarGeneration | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; month: string } | null>(null);

  const logApiCall = (operation: string, details: any) => {
    console.log(`[API CALL] ${operation}:`, details);
  };

  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) return;
      
      try {
        logApiCall('FETCH_GENERATIONS', { user_id: user.id, timestamp: new Date().toISOString() });
        
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
          .in('status', ['awaiting_purchase', 'processing', 'completed'])
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        logApiCall('FETCH_GENERATIONS_SUCCESS', { count: data?.length || 0 });
        
        const awaiting = data?.filter(gen => gen.status === 'awaiting_purchase') || [];
        const processing = data?.filter(gen => gen.status === 'processing') || [];
        const completed = data?.filter(gen => gen.status === 'completed') || [];
        
        setAwaitingGenerations(awaiting);
        setProcessingGenerations(processing);
        setCompletedGenerations(completed);
      } catch (error) {
        console.error('Error fetching generations:', error);
        logApiCall('FETCH_GENERATIONS_ERROR', error);
        toast.error('Failed to load calendar previews');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchGenerations();
      
      // Set up real-time updates for processing status
      const channel = supabase
        .channel('calendar-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calendars'
          },
          (payload) => {
            logApiCall('REALTIME_CALENDAR_UPDATE', payload);
            fetchGenerations(); // Refresh when calendars are updated
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calendar_generations'
          },
          (payload) => {
            logApiCall('REALTIME_GENERATION_UPDATE', payload);
            fetchGenerations(); // Refresh when generation status changes
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handlePurchaseCalendar = async (generationId: string) => {
    setPurchasing(generationId);
    
    try {
      logApiCall('PURCHASE_CALENDAR', { generationId, timestamp: new Date().toISOString() });
      
      const { data, error } = await supabase.functions
        .invoke('process-calendar', {
          body: {
            generationId,
            generateAll: true
          }
        });
      
      if (error) throw error;
      
      logApiCall('PURCHASE_CALENDAR_SUCCESS', data);
      
      toast.success('Calendar purchase successful! Your full 12-month calendar is being generated. You can track progress below.');
      
      // Move from awaiting to processing
      const generation = awaitingGenerations.find(gen => gen.id === generationId);
      if (generation) {
        setAwaitingGenerations(prev => prev.filter(gen => gen.id !== generationId));
        setProcessingGenerations(prev => [...prev, { ...generation, status: 'processing' }]);
      }
      
    } catch (error) {
      console.error('Purchase error:', error);
      logApiCall('PURCHASE_CALENDAR_ERROR', error);
      toast.error('Failed to purchase calendar. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const getProgressPercentage = (calendars: CalendarGeneration['calendars']) => {
    return Math.round((calendars.length / 12) * 100);
  };

  const handleViewFullCalendar = (generation: CalendarGeneration) => {
    setSelectedCalendar(generation);
  };

  const handleImageClick = (imageUrl: string, month: number) => {
    setExpandedImage({ url: imageUrl, month: monthNames[month - 1] });
  };

  // Add delete function
  const handleDeleteGeneration = async (generationId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_generations')
        .delete()
        .eq('id', generationId);
      
      if (error) throw error;
      
      // Remove from all local state arrays
      setAwaitingGenerations(prev => prev.filter(gen => gen.id !== generationId));
      setProcessingGenerations(prev => prev.filter(gen => gen.id !== generationId));
      setCompletedGenerations(prev => prev.filter(gen => gen.id !== generationId));
      
      toast.success('Calendar generation deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete calendar generation');
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
          Review your calendar previews and purchase the full 12-month calendar. Note: Payment is not actually processed - this is a demo.
        </p>
        
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Completed Calendars Section */}
            {completedGenerations.length > 0 && (
              <div>
                <h2 className="text-2xl font-medium mb-6">Your Completed Calendars</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {completedGenerations.map((generation) => (
                    <Card key={generation.id} className="bg-white border-green-200">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {generation.title}
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Complete
                          </span>
                          <Button
                            onClick={() => handleDeleteGeneration(generation.id)}
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <p className="text-sm text-pawprints-darktext/70">
                          Style: {generation.artist_style} • Completed: {new Date(generation.created_at).toLocaleDateString()}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {generation.calendars.length > 0 && (
                          <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-6">
                              <div className="aspect-[16/9] w-full mb-4 overflow-hidden rounded-lg">
                                <img 
                                  src={generation.calendars.find(cal => cal.month === 1)?.image_url || generation.calendars[0].image_url} 
                                  alt="Calendar Preview" 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              
                              <div className="bg-white rounded-lg p-4">
                                <h3 className="text-center text-xl font-semibold mb-4">January 2025</h3>
                                <div className="grid grid-cols-7 gap-1 text-xs text-center">
                                  <div className="font-semibold py-2 text-gray-600">Sun</div>
                                  <div className="font-semibold py-2 text-gray-600">Mon</div>
                                  <div className="font-semibold py-2 text-gray-600">Tue</div>
                                  <div className="font-semibold py-2 text-gray-600">Wed</div>
                                  <div className="font-semibold py-2 text-gray-600">Thu</div>
                                  <div className="font-semibold py-2 text-gray-600">Fri</div>
                                  <div className="font-semibold py-2 text-gray-600">Sat</div>
                                  
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <div key={i + 1} className="py-2 hover:bg-gray-100 rounded">
                                      {i + 1}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-green-700 mb-2">
                                  🎉 Your calendar is ready!
                                </h3>
                                <p className="text-sm text-pawprints-darktext/70">
                                  All 12 months completed ({generation.calendars.length}/12)
                                </p>
                              </div>
                              <Button 
                                onClick={() => handleViewFullCalendar(generation)}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Full Calendar
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Purchase Section */}
            {awaitingGenerations.length > 0 && (
              <div>
                <h2 className="text-2xl font-medium mb-6">Available for Purchase</h2>
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
                            <div className="bg-gray-50 rounded-lg p-6">
                              <div className="aspect-[16/9] w-full mb-4 overflow-hidden rounded-lg">
                                <img 
                                  src={generation.calendars[0].image_url} 
                                  alt="January Preview" 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              
                              <div className="bg-white rounded-lg p-4">
                                <h3 className="text-center text-xl font-semibold mb-4">January 2025</h3>
                                <div className="grid grid-cols-7 gap-1 text-xs text-center">
                                  <div className="font-semibold py-2 text-gray-600">Sun</div>
                                  <div className="font-semibold py-2 text-gray-600">Mon</div>
                                  <div className="font-semibold py-2 text-gray-600">Tue</div>
                                  <div className="font-semibold py-2 text-gray-600">Wed</div>
                                  <div className="font-semibold py-2 text-gray-600">Thu</div>
                                  <div className="font-semibold py-2 text-gray-600">Fri</div>
                                  <div className="font-semibold py-2 text-gray-600">Sat</div>
                                  
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <div key={i + 1} className="py-2 hover:bg-gray-100 rounded">
                                      {i + 1}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-pawprints-darktext/70 mb-4">
                                This is a preview of your January calendar page. Purchase to get all 12 months generated and delivered via email!
                              </p>
                              <Button 
                                onClick={() => handlePurchaseCalendar(generation.id)}
                                disabled={purchasing === generation.id}
                                className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white px-8 py-3 text-lg"
                              >
                                {purchasing === generation.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Generate Full Calendar (Free Demo)'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Section */}
            {processingGenerations.length > 0 && (
              <div>
                <h2 className="text-2xl font-medium mb-6">Generating Your Calendars</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {processingGenerations.map((generation) => (
                    <Card key={generation.id} className="bg-white">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {generation.title}
                          <Button
                            onClick={() => handleDeleteGeneration(generation.id)}
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                        <p className="text-sm text-pawprints-darktext/70">
                          Style: {generation.artist_style} • Created: {new Date(generation.created_at).toLocaleDateString()}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-lg p-6">
                            <div className="text-center mb-4">
                              <Loader2 className="h-8 w-8 animate-spin text-pawprints-terracotta mx-auto mb-2" />
                              <h3 className="text-lg font-medium">Generating Calendar...</h3>
                              <p className="text-sm text-pawprints-darktext/70">
                                {generation.calendars.length} of 12 months completed
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{getProgressPercentage(generation.calendars)}%</span>
                              </div>
                              <Progress 
                                value={getProgressPercentage(generation.calendars)} 
                                className="h-2"
                              />
                            </div>

                            {generation.calendars.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Completed months:</p>
                                <div className="flex flex-wrap gap-1">
                                  {/* Fix duplicate January issue by using Set to remove duplicates */}
                                  {Array.from(new Set(generation.calendars.map(cal => cal.month)))
                                    .sort((a, b) => a - b)
                                    .map((month) => (
                                      <span 
                                        key={month}
                                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                                      >
                                        {monthNames[month - 1]}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-pawprints-darktext/70">
                              You'll receive an email when your full 12-month calendar is ready for download.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Purchase Section */}
            {awaitingGenerations.length > 0 && (
              <div>
                <h2 className="text-2xl font-medium mb-6">Available for Purchase</h2>
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
                            <div className="bg-gray-50 rounded-lg p-6">
                              <div className="aspect-[16/9] w-full mb-4 overflow-hidden rounded-lg">
                                <img 
                                  src={generation.calendars[0].image_url} 
                                  alt="January Preview" 
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              
                              <div className="bg-white rounded-lg p-4">
                                <h3 className="text-center text-xl font-semibold mb-4">January 2025</h3>
                                <div className="grid grid-cols-7 gap-1 text-xs text-center">
                                  <div className="font-semibold py-2 text-gray-600">Sun</div>
                                  <div className="font-semibold py-2 text-gray-600">Mon</div>
                                  <div className="font-semibold py-2 text-gray-600">Tue</div>
                                  <div className="font-semibold py-2 text-gray-600">Wed</div>
                                  <div className="font-semibold py-2 text-gray-600">Thu</div>
                                  <div className="font-semibold py-2 text-gray-600">Fri</div>
                                  <div className="font-semibold py-2 text-gray-600">Sat</div>
                                  
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  <div className="py-2"></div>
                                  
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <div key={i + 1} className="py-2 hover:bg-gray-100 rounded">
                                      {i + 1}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <p className="text-sm text-pawprints-darktext/70 mb-4">
                                This is a preview of your January calendar page. Purchase to get all 12 months generated and delivered via email!
                              </p>
                              <Button 
                                onClick={() => handlePurchaseCalendar(generation.id)}
                                disabled={purchasing === generation.id}
                                className="bg-pawprints-terracotta hover:bg-pawprints-terracotta/90 text-white px-8 py-3 text-lg"
                              >
                                {purchasing === generation.id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Generate Full Calendar (Free Demo)'
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {awaitingGenerations.length === 0 && processingGenerations.length === 0 && completedGenerations.length === 0 && (
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
            )}
          </div>
        )}
      </div>

      {/* Full Calendar Grid Viewer Dialog */}
      <Dialog open={!!selectedCalendar} onOpenChange={() => setSelectedCalendar(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl">
              {selectedCalendar?.title} - Full Calendar
            </DialogTitle>
            <p className="text-sm text-pawprints-darktext/70">
              Style: {selectedCalendar?.artist_style} • {selectedCalendar?.calendars.length} of 12 months
            </p>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto">
            {selectedCalendar && (
              <div className="grid grid-cols-4 gap-4">
                {selectedCalendar.calendars
                  .sort((a, b) => a.month - b.month)
                  .map((calendar) => (
                    <div key={calendar.month} className="space-y-2">
                      <div 
                        className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => handleImageClick(calendar.image_url, calendar.month)}
                      >
                        <img 
                          src={calendar.image_url} 
                          alt={`${monthNames[calendar.month - 1]} Calendar`}
                          className="w-full h-full object-contain hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="text-center text-sm font-semibold">
                        {monthNames[calendar.month - 1]} 2025
                      </h3>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-xl">
              {expandedImage?.month} 2025
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {expandedImage && (
              <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-100">
                <img 
                  src={expandedImage.url} 
                  alt={`${expandedImage.month} Calendar`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
