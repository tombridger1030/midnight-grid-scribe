import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadMetrics, saveMetrics, TrackerData } from '@/lib/storage';

const TRACKER_QUERY_KEY = ['tracker-data'];

// Custom hook for centralized tracker data management
export const useTracker = () => {
  const queryClient = useQueryClient();

  // Query for loading tracker data
  const trackerQuery = useQuery({
    queryKey: TRACKER_QUERY_KEY,
    queryFn: loadMetrics,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times, but not for authentication errors
      return failureCount < 3;
    }
  });

  // Mutation for saving tracker data
  const saveTrackerMutation = useMutation({
    mutationFn: saveMetrics,
    onSuccess: (_, variables) => {
      // Update the cache with the new data
      queryClient.setQueryData(TRACKER_QUERY_KEY, variables);
    },
    onError: (error) => {
      console.error('Failed to save tracker data:', error);
    }
  });

  // Optimistic update function
  const updateTrackerData = (updater: (data: TrackerData) => TrackerData) => {
    const currentData = queryClient.getQueryData<TrackerData>(TRACKER_QUERY_KEY);
    if (currentData) {
      const newData = updater(currentData);
      queryClient.setQueryData(TRACKER_QUERY_KEY, newData);
      saveTrackerMutation.mutate(newData);
    }
  };

  // Force refresh function
  const refreshTracker = () => {
    return queryClient.refetchQueries({ queryKey: TRACKER_QUERY_KEY });
  };

  // Invalidate and refresh
  const invalidateTracker = () => {
    queryClient.invalidateQueries({ queryKey: TRACKER_QUERY_KEY });
  };

  return {
    // Data and loading states
    data: trackerQuery.data,
    isLoading: trackerQuery.isLoading,
    isError: trackerQuery.isError,
    error: trackerQuery.error,
    
    // Save operations
    saveData: updateTrackerData,
    isSaving: saveTrackerMutation.isPending,
    saveError: saveTrackerMutation.error,
    
    // Utility functions
    refreshData: refreshTracker,
    invalidateData: invalidateTracker,
    
    // Direct access to query and mutation for advanced use cases
    query: trackerQuery,
    saveMutation: saveTrackerMutation
  };
};

// Hook specifically for metrics data
export const useMetrics = () => {
  const { data, isLoading, isError, saveData } = useTracker();
  
  return {
    metrics: data?.metrics || [],
    dates: data?.dates || [],
    isLoading,
    isError,
    updateMetric: (metricId: string, date: string, value: string | number | boolean) => {
      saveData((prevData) => ({
        ...prevData,
        metrics: prevData.metrics.map(metric =>
          metric.id === metricId
            ? {
                ...metric,
                values: {
                  ...metric.values,
                  [date]: value
                }
              }
            : metric
        )
      }));
    },
    addDate: (date: string) => {
      saveData((prevData) => ({
        ...prevData,
        dates: prevData.dates.includes(date) 
          ? prevData.dates 
          : [...prevData.dates, date].sort()
      }));
    }
  };
};

// Hook for loading state across the app
export const useTrackerLoading = () => {
  const { isLoading, isSaving } = useTracker();
  return isLoading || isSaving;
}; 