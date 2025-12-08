// Daily Planner Types - Sharp Modern ServicePro CRM

import { ServiceType } from '@/lib/service-constants';

export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  clientId?: string;
  serviceType?: ServiceType;
  location?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyPlan {
  date: Date;
  tasks: DailyTask[];
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number;
}

export interface TaskFormData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority: DailyTask['priority'];
  clientId?: string;
  serviceType?: DailyTask['serviceType'];
  location?: string;
  estimatedDuration: number;
  notes?: string;
}

export interface PlannerStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number;
  averageTaskDuration: number;
}

export interface TimeSlot {
  hour: number;
  displayTime: string;
  period: 'AM' | 'PM';
  tasks: DailyTask[];
}

export interface ServiceTypeConfig {
  id: DailyTask['serviceType'];
  name: string;
  color: string;
  icon: string;
}

export const SERVICE_TYPE_CONFIGS: ServiceTypeConfig[] = [
  {
    id: 'woodgreen',
    name: 'Woodgreen Landscaping',
    color: 'service-landscaping',
    icon: 'Leaf'
  },
  {
    id: 'whiteknight',
    name: 'White Knight Snow Removal',
    color: 'service-snow-removal',
    icon: 'Snowflake'
  },
  {
    id: 'pupawalk',
    name: 'Pup-a-Walk Pet Services',
    color: 'service-pet-services',
    icon: 'Heart'
  },
  {
    id: 'creative',
    name: 'Creative Development',
    color: 'service-creative-development',
    icon: 'Palette'
  }
];

export const PRIORITY_CONFIGS = {
  low: {
    label: 'LOW',
    className: 'priority-low',
    color: '#E8E8E8'
  },
  medium: {
    label: 'MEDIUM',
    className: 'priority-medium',
    color: '#D4AF37'
  },
  high: {
    label: 'HIGH',
    className: 'priority-high',
    color: '#2C2C2C'
  },
  urgent: {
    label: 'URGENT',
    className: 'priority-urgent',
    color: '#DC2626'
  }
};

export const STATUS_CONFIGS = {
  pending: {
    label: 'PENDING',
    className: 'status-pending',
    color: '#E8E8E8'
  },
  in_progress: {
    label: 'IN PROGRESS',
    className: 'status-in-progress',
    color: '#D4AF37'
  },
  completed: {
    label: 'COMPLETED',
    className: 'status-completed',
    color: '#16A34A'
  },
  cancelled: {
    label: 'CANCELLED',
    className: 'status-cancelled',
    color: '#DC2626'
  }
};
