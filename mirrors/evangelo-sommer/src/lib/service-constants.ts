export const SERVICE_TYPES = {
  WOODGREEN: 'woodgreen',
  WHITEKNIGHT: 'whiteknight', 
  PUPAWALK: 'pupawalk',
  CREATIVE: 'creative'
} as const;

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];

export const SERVICE_BUSINESSES = {
  [SERVICE_TYPES.WOODGREEN]: {
    name: 'WOODGREEN LANDSCAPING',
    shortName: 'Landscaping',
    color: 'green-600',
    bgColor: 'bg-green-600',
    textColor: 'text-green-600',
    borderColor: 'border-green-600',
    description: 'Professional landscaping and garden maintenance services',
    services: [
      'Lawn Care & Maintenance',
      'Garden Design & Installation', 
      'Tree & Shrub Care',
      'Seasonal Cleanup',
      'Irrigation Systems'
    ]
  },
  [SERVICE_TYPES.WHITEKNIGHT]: {
    name: 'White Knight Snow Removal',
    shortName: 'Snow Removal',
    color: 'tactical-gold-600',
    bgColor: 'bg-tactical-gold', 
    textColor: 'text-tactical-gold',
    borderColor: 'border-tactical-gold-600',
    description: 'Reliable snow removal and winter maintenance services',
    services: [
      'Residential Snow Removal',
      'Commercial Snow Clearing',
      'Ice Management',
      'Seasonal Contracts',
      'Emergency Services'
    ]
  },
  [SERVICE_TYPES.PUPAWALK]: {
    name: 'PUPAWALK PET SERVICES',
    shortName: 'Pet Services', 
    color: 'purple-600',
    bgColor: 'bg-purple-600',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-600',
    description: 'Professional pet care and walking services',
    services: [
      'Dog Walking',
      'Pet Sitting',
      'Pet Transportation',
      'Basic Pet Care',
      'Emergency Pet Services'
    ]
  },
  [SERVICE_TYPES.CREATIVE]: {
    name: 'Creative Development',
    shortName: 'Creative',
    color: 'gold',
    bgColor: 'bg-tactical-gold',
    textColor: 'text-gold', 
    borderColor: 'border-hud-border-accent',
    description: 'Creative design and development services',
    services: [
      'Web Development',
      'Graphic Design',
      'Brand Development',
      'Digital Marketing',
      'Creative Consulting'
    ]
  }
} as const;

export const SERVICE_COLORS = {
  [SERVICE_TYPES.WOODGREEN]: 'green-600',
  [SERVICE_TYPES.WHITEKNIGHT]: 'tactical-gold-600',
  [SERVICE_TYPES.PUPAWALK]: 'purple-600', 
  [SERVICE_TYPES.CREATIVE]: 'gold'
} as const;

export const getServiceInfo = (serviceType: ServiceType) => {
  return SERVICE_BUSINESSES[serviceType];
};

export const getAllServices = () => {
  return Object.values(SERVICE_BUSINESSES);
};

export const getServiceColor = (serviceType: ServiceType) => {
  return SERVICE_COLORS[serviceType];
};
