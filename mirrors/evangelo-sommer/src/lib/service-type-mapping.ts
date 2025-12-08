// Service type mapping between Prisma ServiceType enums and business service IDs
import { ServiceType } from '@prisma/client';

/**
 * Maps Prisma ServiceType enums to business service line IDs
 */
export const SERVICE_TYPE_TO_BUSINESS_ID: Record<ServiceType, string> = {
  // Woodgreen Landscaping Services
  LAWN_CARE: 'woodgreen',
  LAWN_MOWING: 'woodgreen', 
  LANDSCAPING: 'woodgreen',
  TREE_TRIMMING: 'woodgreen',
  HEDGE_TRIMMING: 'woodgreen',
  WEEDING: 'woodgreen',
  GARDENING_PLANTING: 'woodgreen',
  GARDENING_SEEDING: 'woodgreen', 
  MULCHING: 'woodgreen',
  LEAF_REMOVAL: 'woodgreen',        // ← LEAF removal goes to woodgreen
  DETHATCHING: 'woodgreen',
  GUTTER_CLEANING: 'woodgreen',
  MAINTENANCE: 'woodgreen',
  DESIGN: 'woodgreen',
  INSTALLATION: 'woodgreen',
  
  // White Knight Snow Removal Services
  SNOW_REMOVAL: 'whiteknight',      // ← SNOW removal goes to whiteknight
  PREMIUM_SALTING: 'whiteknight',
  CALCIUM_MAGNESIUM_MIX: 'whiteknight',
  SNOW_PLOWING: 'whiteknight',
  ICE_MANAGEMENT: 'whiteknight',
  WINTER_MAINTENANCE: 'whiteknight',

  // Generic services (could apply to multiple businesses)
  EMERGENCY: 'woodgreen', // Default to woodgreen but could be context-dependent
  CONSULTATION: 'woodgreen' // Default to woodgreen but could be context-dependent
};

/**
 * Maps business service IDs to their associated ServiceType enums
 */
export const BUSINESS_ID_TO_SERVICE_TYPES: Record<string, ServiceType[]> = {
  woodgreen: [
    'LAWN_CARE',
    'LAWN_MOWING', 
    'LANDSCAPING',
    'TREE_TRIMMING',
    'HEDGE_TRIMMING',
    'WEEDING',
    'GARDENING_PLANTING',
    'GARDENING_SEEDING',
    'MULCHING',
    'LEAF_REMOVAL',
    'DETHATCHING', 
    'GUTTER_CLEANING',
    'MAINTENANCE',
    'DESIGN',
    'INSTALLATION',
    'EMERGENCY',
    'CONSULTATION'
  ] as ServiceType[],
  
  whiteknight: [
    'SNOW_REMOVAL'
  ] as ServiceType[],
  
  // Placeholder for future services
  pupawalk: [] as ServiceType[],
  creative: [] as ServiceType[]
};

/**
 * Enhanced service mapping that handles conversation analysis results
 */
export class ServiceMapper {
  
  /**
   * Convert detected ServiceType enums to business service IDs
   */
  static mapServiceTypesToBusinessIds(serviceTypes: ServiceType[]): string[] {
    const businessIds = new Set<string>();
    
    serviceTypes.forEach(serviceType => {
      const businessId = SERVICE_TYPE_TO_BUSINESS_ID[serviceType];
      if (businessId) {
        businessIds.add(businessId);
      }
    });
    
    return Array.from(businessIds);
  }

  /**
   * Get business service ID for a specific service type
   */
  static getBusinessIdForServiceType(serviceType: ServiceType): string | null {
    return SERVICE_TYPE_TO_BUSINESS_ID[serviceType] || null;
  }

  /**
   * Get all service types for a business service ID
   */
  static getServiceTypesForBusinessId(businessId: string): ServiceType[] {
    return BUSINESS_ID_TO_SERVICE_TYPES[businessId] || [];
  }

  /**
   * Check if a service type belongs to a specific business
   */
  static serviceTypeBelongsToBusiness(serviceType: ServiceType, businessId: string): boolean {
    const businessServiceTypes = BUSINESS_ID_TO_SERVICE_TYPES[businessId] || [];
    return businessServiceTypes.includes(serviceType);
  }

  /**
   * Get user-friendly explanation of service assignments
   */
  static explainServiceAssignments(serviceTypes: ServiceType[]): string {
    const businessMapping = new Map<string, ServiceType[]>();
    
    serviceTypes.forEach(serviceType => {
      const businessId = SERVICE_TYPE_TO_BUSINESS_ID[serviceType];
      if (businessId) {
        if (!businessMapping.has(businessId)) {
          businessMapping.set(businessId, []);
        }
        businessMapping.get(businessId)!.push(serviceType);
      }
    });

    const explanations: string[] = [];
    businessMapping.forEach((types, businessId) => {
      const businessName = this.getBusinessName(businessId);
      const serviceNames = types.map(t => this.getServiceDisplayName(t));
      explanations.push(`${businessName}: ${serviceNames.join(', ')}`);
    });

    return explanations.join(' | ');
  }

  static getBusinessName(businessId: string): string {
    const names = {
      'woodgreen': 'Woodgreen Landscaping',
      'whiteknight': 'White Knight Snow',
      'pupawalk': 'Pupawalk Pet Services',
      'creative': 'Creative Development'
    };
    return names[businessId as keyof typeof names] || businessId;
  }

  static getServiceDisplayName(serviceType: ServiceType): string {
    return serviceType.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Service detection context enhancer for better accuracy
 */
export const ServiceDetectionEnhancer = {
  
  /**
   * Enhance service detection patterns with context-aware business assignment
   */
  enhanceDetectionWithBusinessContext: (detectedServices: any[], conversationContext: any) => {
    return detectedServices.map(service => {
      const businessId = ServiceMapper.getBusinessIdForServiceType(service.serviceType);
      return {
        ...service,
        businessId,
        businessName: ServiceMapper.getBusinessName(businessId || 'unknown')
      };
    });
  },

  /**
   * Filter services by business relevance
   */
  filterServicesByBusiness: (detectedServices: any[], targetBusinessId: string) => {
    return detectedServices.filter(service => 
      ServiceMapper.serviceTypeBelongsToBusiness(service.serviceType, targetBusinessId)
    );
  }
};