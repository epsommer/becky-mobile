import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '../lib/api/endpoints/billing';
import { getServiceTypesBySlug } from '../config/service-config';

export interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  defaultPrice?: number;
  defaultBillingMode?: 'quantity' | 'hours';
}

export interface ServiceLine {
  id: string;
  category: string;
  icon?: string;
  items: ServiceItem[];
}

export interface UseServiceLinesResult {
  serviceLines: ServiceLine[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useServiceLines(): UseServiceLinesResult {
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceLines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingApi.getServiceLines();
      if (response.success && response.data) {
        console.log('[useServiceLines] Raw service lines data:', JSON.stringify(response.data, null, 2));

        // Transform API response to match expected format
        const transformedData = response.data.map((line: any) => {
          // Try to get serviceTypes from API response first, then fall back to local config
          let serviceTypes = line.serviceTypes || line.items || [];

          // If no serviceTypes from API, use local config based on slug
          if (serviceTypes.length === 0 && line.slug) {
            serviceTypes = getServiceTypesBySlug(line.slug);
          }

          const items = serviceTypes.map((serviceType: any, index: number) => ({
            id: `${line.id || line.slug}_${index}`,
            title: serviceType.name || serviceType.title,
            description: serviceType.descriptionTemplate || serviceType.description,
            defaultPrice: serviceType.defaultPrice || 0,
            defaultBillingMode: serviceType.defaultBillingMode || 'quantity',
          }));

          return {
            id: line.id || line.slug,
            category: line.name || line.category,
            icon: line.icon,
            items: items,
          };
        });

        console.log('[useServiceLines] Transformed service lines:', JSON.stringify(transformedData, null, 2));
        setServiceLines(transformedData);
      } else {
        console.error('[useServiceLines] Failed to load service lines:', response);
        setServiceLines([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service lines');
      console.error('[useServiceLines] Error fetching service lines:', err);
      setServiceLines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceLines();
  }, [fetchServiceLines]);

  return {
    serviceLines,
    loading,
    error,
    refetch: fetchServiceLines,
  };
}
