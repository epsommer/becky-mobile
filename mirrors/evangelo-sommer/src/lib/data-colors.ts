/**
 * Data-driven color system for dashboard metrics and data visualization
 */

export interface DataColorSpec {
  class: string;
  cssVariable: string;
  description: string;
}

export const DATA_COLORS: Record<string, DataColorSpec> = {
  'severe-decrease': {
    class: 'text-data-red-severe',
    cssVariable: 'var(--data-red-severe)',
    description: 'Severe decrease (>-20%)'
  },
  'major-decrease': {
    class: 'text-data-red-major',
    cssVariable: 'var(--data-red-major)',
    description: 'Major decrease (-10% to -20%)'
  },
  'average-decrease': {
    class: 'text-data-orange',
    cssVariable: 'var(--data-orange)',
    description: 'Average decrease (-5% to -10%)'
  },
  'mild-decrease': {
    class: 'text-data-yellow',
    cssVariable: 'var(--data-yellow)',
    description: 'Mild decrease (0% to -5%)'
  },
  'mild-increase': {
    class: 'text-data-green-mild',
    cssVariable: 'var(--data-green-mild)',
    description: 'Mild increase (0% to +10%)'
  },
  'good-increase': {
    class: 'text-data-green-good',
    cssVariable: 'var(--data-green-good)',
    description: 'Good increase (+10% to +20%)'
  },
  'solid-increase': {
    class: 'text-data-teal',
    cssVariable: 'var(--data-teal)',
    description: 'Solid increase (+20% to +30%)'
  },
  'strong-increase': {
    class: 'text-data-cyan',
    cssVariable: 'var(--data-cyan)',
    description: 'Strong increase (+30% to +50%)'
  },
  'excellent-increase': {
    class: 'text-data-blue',
    cssVariable: 'var(--data-blue)',
    description: 'Excellent increase (+50% to +75%)'
  },
  'outstanding-increase': {
    class: 'text-data-violet',
    cssVariable: 'var(--data-violet)',
    description: 'Outstanding increase (+75% to +100%)'
  },
  'exceptional-increase': {
    class: 'text-data-pink',
    cssVariable: 'var(--data-pink)',
    description: 'Exceptional increase (+100%+)'
  }
};

/**
 * Get data-driven color based on performance value and comparison
 * @param value The current value
 * @param comparison The comparison value (previous period, target, etc.)
 * @param type Type of coloring - 'text', 'background', or 'border'
 * @returns Object with color class and CSS variable
 */
export function getDataColor(
  value: number, 
  comparison: number, 
  type: 'text' | 'background' | 'border' = 'text'
): { class: string; cssVariable: string; description: string } {
  const percentChange = comparison === 0 
    ? (value > 0 ? 100 : 0) 
    : ((value - comparison) / Math.abs(comparison)) * 100;

  let colorKey: string;

  if (percentChange <= -20) {
    colorKey = 'severe-decrease';
  } else if (percentChange <= -10) {
    colorKey = 'major-decrease';
  } else if (percentChange <= -5) {
    colorKey = 'average-decrease';
  } else if (percentChange < 0) {
    colorKey = 'mild-decrease';
  } else if (percentChange <= 10) {
    colorKey = 'mild-increase';
  } else if (percentChange <= 20) {
    colorKey = 'good-increase';
  } else if (percentChange <= 30) {
    colorKey = 'solid-increase';
  } else if (percentChange <= 50) {
    colorKey = 'strong-increase';
  } else if (percentChange <= 75) {
    colorKey = 'excellent-increase';
  } else if (percentChange <= 100) {
    colorKey = 'outstanding-increase';
  } else {
    colorKey = 'exceptional-increase';
  }

  const colorSpec = DATA_COLORS[colorKey];
  
  // Convert text class to background or border class based on type
  let adjustedClass = colorSpec.class;
  if (type === 'background') {
    adjustedClass = colorSpec.class.replace('text-', 'bg-');
  } else if (type === 'border') {
    adjustedClass = colorSpec.class.replace('text-', 'border-');
  }

  return {
    class: adjustedClass,
    cssVariable: colorSpec.cssVariable,
    description: colorSpec.description
  };
}

/**
 * Get color for growth rate or trend indicators
 * @param growthRate The growth rate as a percentage
 * @param type Type of coloring - 'text', 'background', or 'border'
 * @returns Object with color information
 */
export function getGrowthColor(
  growthRate: number, 
  type: 'text' | 'background' | 'border' = 'text'
): { class: string; cssVariable: string; description: string } {
  return getDataColor(growthRate, 0, type);
}

/**
 * Get color based on goal completion percentage
 * @param completed Number of completed items
 * @param total Total number of items
 * @param type Type of coloring
 * @returns Object with color information
 */
export function getCompletionColor(
  completed: number, 
  total: number, 
  type: 'text' | 'background' | 'border' = 'text'
): { class: string; cssVariable: string; description: string } {
  if (total === 0) {
    return getDataColor(0, 1, type); // Show as decrease if no goals
  }
  
  const completionRate = (completed / total) * 100;
  
  // Treat completion rate as a positive metric
  if (completionRate >= 90) {
    return DATA_COLORS['exceptional-increase'];
  } else if (completionRate >= 75) {
    return DATA_COLORS['outstanding-increase'];
  } else if (completionRate >= 60) {
    return DATA_COLORS['excellent-increase'];
  } else if (completionRate >= 40) {
    return DATA_COLORS['solid-increase'];
  } else if (completionRate >= 25) {
    return DATA_COLORS['good-increase'];
  } else if (completionRate > 0) {
    return DATA_COLORS['mild-increase'];
  } else {
    return DATA_COLORS['severe-decrease'];
  }
}

/**
 * Simulate historical data for demonstration purposes
 * In a real application, this would come from your database
 */
export function getSimulatedHistoricalData() {
  return {
    previousMonthRevenue: 8500,
    previousMonthClients: 12,
    previousMonthProspects: 8,
    previousMonthActiveGoals: 15,
    lastYearRevenue: 95000,
    sixMonthsAgoRevenue: 7200
  };
}