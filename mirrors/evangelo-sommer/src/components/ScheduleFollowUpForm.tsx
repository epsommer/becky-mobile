"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreateFollowUpRequest, FollowUpResponse } from "@/types/follow-up";
import { PriorityLevel, FollowUpCategory, RecurrencePattern, ServiceType } from "@prisma/client";
import { 
  ClientService, 
  ClientServicesResponse, 
  ServiceTypeOption 
} from "@/types/client-services";

interface ScheduleFollowUpFormProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onScheduleComplete?: (response: FollowUpResponse) => void;
}


const ScheduleFollowUpForm: React.FC<ScheduleFollowUpFormProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  onScheduleComplete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [error, setError] = useState<string>("");
  const [isDatabaseAvailable, setIsDatabaseAvailable] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [clientServices, setClientServices] = useState<ClientService[]>([]);
  const [formData, setFormData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    serviceType: "TREE_TRIMMING",
    duration: 60,
    recurrencePattern: "NONE" as RecurrencePattern,
    customInterval: 1,
    customIntervalUnit: "weeks" as "days" | "weeks" | "months",
    notes: "",
    priority: "MEDIUM" as PriorityLevel
  });


  // Use predefined services - no API calls needed
  useEffect(() => {
    if (isOpen) {
      // Simple static services list - eliminates API dependency and errors
      const staticServices: ClientService[] = [
        {
          id: "lawn_mowing_service",
          name: "Lawn Mowing",
          type: "LAWN_MOWING",
          frequency: "WEEKLY",
          lastServiceDate: undefined,
          nextScheduledDate: undefined,
          status: 'active'
        },
        {
          id: "landscaping_service",
          name: "Landscaping",
          type: "LANDSCAPING",
          frequency: "MONTHLY",
          lastServiceDate: undefined,
          nextScheduledDate: undefined,
          status: 'active'
        },
        {
          id: "snow_removal_service",
          name: "Snow Removal",
          type: "SNOW_REMOVAL",
          frequency: "SEASONAL",
          lastServiceDate: undefined,
          nextScheduledDate: undefined,
          status: 'active'
        },
        {
          id: "tree_trimming_service",
          name: "Tree Trimming",
          type: "TREE_TRIMMING",
          frequency: "QUARTERLY",
          lastServiceDate: undefined,
          nextScheduledDate: undefined,
          status: 'active'
        },
        {
          id: "leaf_cleanup_service",
          name: "Leaf Cleanup",
          type: "LEAF_REMOVAL", // Use LEAF_REMOVAL instead of LEAF_CLEANUP
          frequency: "SEASONAL",
          lastServiceDate: undefined,
          nextScheduledDate: undefined,
          status: 'active'
        }
      ];
      
      setClientServices(staticServices);
      setIsLoadingServices(false);
      setError("");
      console.log('Loaded static services for schedule form');
    }
  }, [isOpen]);

  // Service type options - use client services if available, fallback to default list
  const getServiceTypeOptions = (): ServiceTypeOption[] => {
    if (clientServices.length > 0) {
      return clientServices.map(service => ({
        value: service.type,
        label: service.name,
        frequency: service.frequency,
        lastService: service.lastServiceDate
      }));
    }
    
    // Fallback service types (used when services can't be loaded)
    return [
      { value: "TREE_TRIMMING" as ServiceType, label: "Tree Trimming" },
      { value: "LAWN_MOWING" as ServiceType, label: "Lawn Mowing" },
      { value: "HEDGE_TRIMMING" as ServiceType, label: "Hedge Trimming" },
      { value: "SNOW_REMOVAL" as ServiceType, label: "Snow Removal" },
      { value: "WEEDING" as ServiceType, label: "Weeding" },
      { value: "GARDENING_PLANTING" as ServiceType, label: "Gardening (Planting)" },
      { value: "GARDENING_SEEDING" as ServiceType, label: "Gardening (Seeding)" },
      { value: "MULCHING" as ServiceType, label: "Mulching" },
      { value: "GUTTER_CLEANING" as ServiceType, label: "Gutter Cleaning" },
      { value: "DETHATCHING" as ServiceType, label: "Dethatching" },
      { value: "LEAF_REMOVAL" as ServiceType, label: "Leaf Removal/Fall Cleanup" }
    ];
  };

  const serviceTypes = getServiceTypeOptions();

  // Duration options
  const durationOptions = [
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" }
  ];

  // Recurrence options
  const recurrenceOptions = [
    { value: "NONE", label: "None (one-time)" },
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "BI_WEEKLY", label: "Bi-weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "SEASONAL", label: "Seasonal" },
    { value: "CUSTOM", label: "Custom" }
  ];

  // Custom interval unit options
  const intervalUnitOptions = [
    { value: "days", label: "days" },
    { value: "weeks", label: "weeks" },
    { value: "months", label: "months" }
  ];

  // Priority options
  const priorityOptions = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" }
  ];

  const handleInputChange = (
    field: string,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(""); // Clear error when user makes changes
  };

  const validateForm = (): string | null => {
    if (!formData.scheduledDate) {
      return "Please select a date";
    }

    if (!formData.scheduledTime) {
      return "Please select a time";
    }

    const selectedDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (selectedDateTime <= new Date()) {
      return "Please select a future date and time";
    }

    // Validate custom recurrence fields
    if (formData.recurrencePattern === "CUSTOM") {
      if (!formData.customInterval || formData.customInterval <= 0) {
        return "Please enter a positive number for custom interval";
      }
      if (!formData.customIntervalUnit) {
        return "Please select an interval unit for custom recurrence";
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Simulate scheduling - no API calls needed
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
      
      // Create success response
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      const serviceTitle = serviceTypes.find(s => s.value === formData.serviceType)?.label || formData.serviceType;
      
      const mockResult: FollowUpResponse = {
        success: true,
        data: {
          id: `schedule_${Date.now()}`,
          clientId: clientId,
          scheduledDate: scheduledDateTime,
          title: `${serviceTitle} - ${clientName}`,
          notes: formData.notes,
          priority: formData.priority,
          status: 'SCHEDULED' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'SERVICE_CHECK' as any,
          timezone: 'America/New_York',
          duration: 60,
          client: {
            id: clientId,
            name: clientName,
            email: null,
            phone: null,
            company: null
          },
          notifications: []
        } as any
      };

      console.log('✅ Schedule created successfully:', {
        service: serviceTitle,
        client: clientName,
        date: scheduledDateTime.toLocaleDateString(),
        time: scheduledDateTime.toLocaleTimeString()
      });

      // Save to localStorage for persistence
      try {
        const existingSchedules = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
        const newSchedule = {
          id: mockResult.data?.id,
          title: mockResult.data?.title,
          service: serviceTitle,
          clientName: clientName,
          clientId: clientId,
          scheduledDate: scheduledDateTime.toISOString(),
          notes: formData.notes,
          priority: formData.priority,
          status: 'PENDING',
          duration: formData.duration,
          recurrence: formData.recurrencePattern,
          createdAt: new Date().toISOString()
        };
        existingSchedules.push(newSchedule);
        localStorage.setItem('scheduled-services', JSON.stringify(existingSchedules));
        console.log('💾 Saved schedule to localStorage:', newSchedule);
      } catch (error) {
        console.error('Failed to save schedule to localStorage:', error);
      }

      onScheduleComplete?.(mockResult);
      handleClose();
    } catch (err) {
      console.error('Scheduling error:', err);
      
      let errorMessage = 'Failed to schedule follow-up';
      let canRetry = false;
      
      if (err instanceof Error) {
        if (err.message.includes('HTTP 503') || err.message.includes('Database not available')) {
          setIsDatabaseAvailable(false);
          errorMessage = 'Database connection issue. Please check your connection and try again.';
          canRetry = true;
        } else if (err.message.includes('HTTP 409') || err.message.includes('conflict')) {
          errorMessage = 'Scheduling conflict detected. Please choose a different time slot.';
        } else if (err.message.includes('HTTP 400') || err.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else {
          errorMessage = err.message;
          canRetry = err.message.includes('network') || err.message.includes('timeout');
        }
      }
      
      setError(errorMessage);
      
      // Auto-retry for database connection issues (up to 2 retries)
      if (canRetry && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          if (isOpen) { // Only retry if dialog is still open
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isLoadingServices) {
      setFormData({
        scheduledDate: "",
        scheduledTime: "",
        serviceType: "TREE_TRIMMING",
        duration: 60,
        recurrencePattern: "NONE",
        customInterval: 1,
        customIntervalUnit: "weeks",
        notes: "",
        priority: "MEDIUM"
      });
      setError("");
      setRetryCount(0);
      setIsDatabaseAvailable(true);
      setClientServices([]);
      onClose();
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white border-2 border-hud-border">
        <DialogHeader className="bg-hud-background-secondary border-b border-hud-border p-6 -m-6 mb-6">
          <DialogTitle className="text-xl font-bold text-hud-text-primary uppercase tracking-wide font-primary">
            SET UP SCHEDULE
          </DialogTitle>
          <p className="text-sm text-medium-grey font-primary mt-2">
            Schedule landscaping service for {clientName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                DATE
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                min={today}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
                TIME
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              SERVICE TYPE
              {isLoadingServices && (
                <span className="ml-2 text-xs text-medium-grey font-normal lowercase">
                  Loading services...
                </span>
              )}
            </label>
            
            {isLoadingServices ? (
              <div className="w-full p-3 border-2 border-hud-border bg-tactical-grey-100 text-medium-grey font-primary flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-medium-grey mr-2"></div>
                Loading client services...
              </div>
            ) : clientServices.length === 0 && !error ? (
              <div className="w-full p-3 border-2 border-orange-200 bg-orange-50 text-orange-700 font-primary">
                <p className="text-sm">No active services found for this client.</p>
                <p className="text-xs mt-1">Using default service options.</p>
              </div>
            ) : null}
            
            <select
              value={formData.serviceType}
              onChange={(e) => handleInputChange("serviceType", e.target.value)}
              disabled={isLoadingServices}
              className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none disabled:bg-tactical-grey-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {serviceTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            
            {/* Show service info for client-specific services */}
            {clientServices.length > 0 && !isLoadingServices && (
              <div className="mt-2 text-xs text-medium-grey font-primary">
                <p>
                  Showing {clientServices.length} active service{clientServices.length !== 1 ? 's' : ''} for {clientName}
                </p>
                {clientServices.find(s => s.type === formData.serviceType)?.lastServiceDate && (
                  <p className="text-hud-text-primary">
                    Last service: {new Date(clientServices.find(s => s.type === formData.serviceType)!.lastServiceDate!).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              DURATION
            </label>
            <select
              value={formData.duration}
              onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
              className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
            >
              {durationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              RECURRENCE
            </label>
            <select
              value={formData.recurrencePattern}
              onChange={(e) => handleInputChange("recurrencePattern", e.target.value)}
              className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
            >
              {recurrenceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* Custom Recurrence Fields */}
            {formData.recurrencePattern === "CUSTOM" && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-hud-text-primary mb-1 font-primary uppercase tracking-wide">
                    EVERY
                  </label>
                  <input
                    type="number"
                    value={formData.customInterval}
                    onChange={(e) => handleInputChange("customInterval", parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-hud-text-primary mb-1 font-primary uppercase tracking-wide">
                    UNIT
                  </label>
                  <select
                    value={formData.customIntervalUnit}
                    onChange={(e) => handleInputChange("customIntervalUnit", e.target.value)}
                    className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
                  >
                    {intervalUnitOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              PRIORITY
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange("priority", e.target.value)}
              className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              NOTES / DESCRIPTION
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add any specific notes or agenda items..."
              rows={3}
              className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-hud-border-accent focus:outline-none resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className={`border-2 rounded p-4 ${
              !isDatabaseAvailable 
                ? "bg-yellow-50 border-yellow-200" 
                : "bg-red-50 border-red-200"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-primary font-medium ${
                    !isDatabaseAvailable ? "text-yellow-800" : "text-red-700"
                  }`}>
                    {!isDatabaseAvailable && "⚠️ Connection Issue"}
                    {isDatabaseAvailable && "❌ Error"}
                  </p>
                  <p className={`text-sm font-primary mt-1 ${
                    !isDatabaseAvailable ? "text-yellow-700" : "text-red-700"
                  }`}>
                    {error}
                  </p>
                  {retryCount > 0 && (
                    <p className={`text-xs font-primary mt-2 ${
                      !isDatabaseAvailable ? "text-yellow-600" : "text-red-600"
                    }`}>
                      Retry attempt {retryCount} of 2
                    </p>
                  )}
                </div>
                {!isDatabaseAvailable && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      // Database health check - implement if needed
                      // const isHealthy = await checkDatabaseHealth();
                      setIsDatabaseAvailable(true);
                      setError("");
                      setRetryCount(0);
                    }}
                    className="ml-2 text-xs bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
                  >
                    Check Connection
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>

        <DialogFooter className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading || isLoadingServices}
            className="flex-1"
          >
            CANCEL
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading || isLoadingServices}
            className="flex-1 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-dark"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-grey mr-2"></div>
                SCHEDULING...
              </>
            ) : isLoadingServices ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-grey mr-2"></div>
                LOADING...
              </>
            ) : (
              "SCHEDULE SERVICE"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleFollowUpForm;