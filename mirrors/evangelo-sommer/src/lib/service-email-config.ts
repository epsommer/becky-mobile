// Service-specific email configuration for testimonial requests
// Each service line has its own feedback email and branding

export interface ServiceEmailConfig {
  id: string
  name: string
  domain: string
  feedbackEmail: string
  primaryColor: string
  secondaryColor: string
  description: string
  websiteUrl: string
  logoPath?: string
  logoInversePath?: string // For use on dark backgrounds (like email headers)
}

export const serviceEmailConfigs: Record<string, ServiceEmailConfig> = {
  woodgreen: {
    id: 'woodgreen',
    name: 'WOODGREEN LANDSCAPING',
    domain: 'woodgreenlandscaping.com',
    feedbackEmail: 'feedback@woodgreenlandscaping.com',
    primaryColor: '#059669', // Emerald Green
    secondaryColor: '#6b7280', // Gray
    description: 'Professional landscaping and lawn care services',
    websiteUrl: 'https://woodgreenlandscaping.com',
    logoPath: '/woodgreen-landscaping-logo-palmette.svg',
    logoInversePath: '/woodgreen-landscaping-palmette-inverse.png'
  },
  whiteknight: {
    id: 'whiteknight',
    name: 'White Knight Snow Service',
    domain: 'whiteknightsnowservice.com',
    feedbackEmail: 'feedback@whiteknightsnowservice.com',
    primaryColor: '#6B7280', // Tactical Grey (per design system)
    secondaryColor: '#9ca3af', // Light Gray
    description: 'Reliable snow removal and ice management',
    websiteUrl: 'https://whiteknightsnowservice.com',
    logoPath: undefined // No logo yet
  },
  pupawalk: {
    id: 'pupawalk',
    name: 'PUPAWALK PET SERVICES',
    domain: 'pupawalk.com',
    feedbackEmail: 'feedback@pupawalk.com',
    primaryColor: '#dc2626', // Red
    secondaryColor: '#9ca3af', // Gray
    description: 'Professional pet care and walking services',
    websiteUrl: 'https://pupawalk.com',
    logoPath: undefined // No logo yet
  },
  creative: {
    id: 'creative',
    name: 'Evangelo Sommer Creative Development',
    domain: 'evangelosommer.com',
    feedbackEmail: 'feedback@evangelosommer.com',
    primaryColor: '#D4AF37', // Tactical Gold
    secondaryColor: '#64748b', // Slate Gray
    description: 'Design and creative development services',
    websiteUrl: 'https://evangelosommer.com',
    logoPath: '/EvangeloSommer-ES-Monogram.svg'
  }
}

// Get service email configuration by service ID
export function getServiceEmailConfig(serviceId?: string): ServiceEmailConfig {
  if (!serviceId) {
    // Default fallback to main Evangelo Sommer branding
    return {
      id: 'default',
      name: 'Evangelo Sommer',
      domain: 'evangelosommer.com',
      feedbackEmail: 'feedback@evangelosommer.com',
      primaryColor: '#D4AF37', // Tactical Gold
      secondaryColor: '#64748b',
      description: 'Professional services',
      websiteUrl: 'https://evangelosommer.com',
      logoPath: '/EvangeloSommer-ES-Monogram.svg'
    }
  }

  return serviceEmailConfigs[serviceId] || serviceEmailConfigs.creative
}

// Get feedback email by service ID
export function getServiceFeedbackEmail(serviceId?: string): string {
  const config = getServiceEmailConfig(serviceId)
  return config.feedbackEmail
}

// Check if a service ID is valid
export function isValidServiceId(serviceId?: string): boolean {
  if (!serviceId) return false
  return serviceId in serviceEmailConfigs
}

// Get all available service IDs
export function getAllServiceIds(): string[] {
  return Object.keys(serviceEmailConfigs)
}

// Map service types to their parent service lines
const serviceTypeToServiceLine: Record<string, string> = {
  // Woodgreen Landscaping services
  'lawn_care': 'woodgreen',
  'landscaping': 'woodgreen',
  'maintenance': 'woodgreen',
  'tree_trimming': 'woodgreen',
  'lawn_mowing': 'woodgreen',
  'hedge_trimming': 'woodgreen',
  'weeding': 'woodgreen',
  'gardening': 'woodgreen',
  'mulching': 'woodgreen',
  'gutter_cleaning': 'woodgreen',
  'leaf_removal': 'woodgreen',
  'dethatching': 'woodgreen',

  // White Knight Snow Service services
  'snow_removal': 'whiteknight',
  'snow_plowing': 'whiteknight',
  'salting': 'whiteknight',
  'ice_management': 'whiteknight',
  'premium_salting': 'whiteknight',
  'calcium_magnesium_mix': 'whiteknight',
  'winter_maintenance': 'whiteknight',
}

// Resolve service type to service line ID
export function resolveServiceLineId(serviceId?: string): string | undefined {
  if (!serviceId) return undefined

  // If it's already a service line ID, return it
  if (serviceId in serviceEmailConfigs) {
    return serviceId
  }

  // Otherwise, map service type to service line
  return serviceTypeToServiceLine[serviceId]
}
