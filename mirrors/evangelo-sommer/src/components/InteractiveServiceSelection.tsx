"use client";

import { useState } from "react";
import { getAllServices, type Service } from "../lib/service-config";

export type ProjectStatus =
  | "active"
  | "prospect"
  | "completed"
  | "repeat"
  | "bi-weekly"
  | "terminated"
  | "seasonal-repeat";

export interface ServiceProject {
  serviceId: string;
  serviceName: string;
  serviceTypes: string[];
  projectName: string;
  status: ProjectStatus;
}

interface InteractiveServiceSelectionProps {
  onServicesChange: (projects: ServiceProject[]) => void;
  initialProjects?: ServiceProject[];
}

export default function InteractiveServiceSelection({
  onServicesChange,
  initialProjects = [],
}: InteractiveServiceSelectionProps) {
  const services = getAllServices();
  const [selectedServiceLine, setSelectedServiceLine] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<ServiceProject[]>(initialProjects);

  const handleServiceLineSelect = (serviceId: string) => {
    setSelectedServiceLine(serviceId);
  };

  const handleAddProject = (service: Service) => {
    const newProject: ServiceProject = {
      serviceId: service.id,
      serviceName: service.name,
      serviceTypes: [],
      projectName: "",
      status: "prospect",
    };

    const updatedProjects = [...selectedProjects, newProject];
    setSelectedProjects(updatedProjects);
    onServicesChange(updatedProjects);
  };

  const handleRemoveProject = (index: number) => {
    const updatedProjects = selectedProjects.filter((_, i) => i !== index);
    setSelectedProjects(updatedProjects);
    onServicesChange(updatedProjects);
  };

  const handleProjectUpdate = (
    index: number,
    field: keyof ServiceProject,
    value: any
  ) => {
    const updatedProjects = [...selectedProjects];
    updatedProjects[index] = {
      ...updatedProjects[index],
      [field]: value,
    };
    setSelectedProjects(updatedProjects);
    onServicesChange(updatedProjects);
  };

  const handleServiceTypeToggle = (projectIndex: number, serviceType: string) => {
    const project = selectedProjects[projectIndex];
    const updatedServiceTypes = project.serviceTypes.includes(serviceType)
      ? project.serviceTypes.filter((type) => type !== serviceType)
      : [...project.serviceTypes, serviceType];

    handleProjectUpdate(projectIndex, "serviceTypes", updatedServiceTypes);
  };

  const selectedService = services.find((s) => s.id === selectedServiceLine);

  const statusOptions: { value: ProjectStatus; label: string }[] = [
    { value: "prospect", label: "Prospect" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "repeat", label: "Repeat" },
    { value: "bi-weekly", label: "Bi-Weekly" },
    { value: "terminated", label: "Terminated" },
    { value: "seasonal-repeat", label: "Seasonal Repeat" },
  ];

  return (
    <div className="space-y-6">
      {/* Step 1: Select Service Line */}
      <div className="neo-card p-6">
        <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide mb-4">
          Step 1: Select Service Line
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleServiceLineSelect(service.id)}
              className={`neo-button p-4 text-left transition-all hover:scale-[1.02] ${
                selectedServiceLine === service.id
                  ? "neo-button-active"
                  : ""
              }`}
            >
              <div className="font-bold text-foreground font-primary uppercase tracking-wide">
                {service.name}
              </div>
              <div className="text-sm text-muted-foreground font-primary mt-1">
                {service.businessType}
              </div>
              <div className="text-xs text-muted-foreground font-primary mt-2">
                {service.serviceTypes.length} services available
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Add Service from Selected Line */}
      {selectedServiceLine && selectedService && (
        <div className="neo-card p-6">
          <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide mb-4">
            Step 2: Add Project for {selectedService.name}
          </h3>
          <button
            type="button"
            onClick={() => handleAddProject(selectedService)}
            className="neo-button-active px-6 py-3 font-primary uppercase tracking-wide text-sm"
          >
            + Add {selectedService.name} Project
          </button>
        </div>
      )}

      {/* Step 3: Configure Each Project */}
      {selectedProjects.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
            Step 3: Configure Projects
          </h3>
          {selectedProjects.map((project, projectIndex) => {
            const service = services.find((s) => s.id === project.serviceId);
            if (!service) return null;

            return (
              <div
                key={projectIndex}
                className="neo-card p-6 border-l-4 border-l-accent"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-md font-bold text-foreground font-primary uppercase tracking-wide">
                      {service.name} Project {projectIndex + 1}
                    </h4>
                    <p className="text-xs text-muted-foreground font-primary mt-1">
                      {service.businessType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(projectIndex)}
                    className="neo-button-circle w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Remove project"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={project.projectName}
                      onChange={(e) =>
                        handleProjectUpdate(projectIndex, "projectName", e.target.value)
                      }
                      className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                      placeholder="e.g., Summer Lawn Maintenance"
                    />
                  </div>

                  {/* Project Status */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                      Project Status
                    </label>
                    <select
                      value={project.status}
                      onChange={(e) =>
                        handleProjectUpdate(
                          projectIndex,
                          "status",
                          e.target.value as ProjectStatus
                        )
                      }
                      className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Types for this Project */}
                  {service.serviceTypes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                        Services Included
                      </label>
                      <div className="neo-container p-4 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {service.serviceTypes.map((serviceType) => (
                            <div
                              key={serviceType.name}
                              className="flex items-center space-x-3 cursor-pointer group"
                            >
                              <input
                                type="checkbox"
                                id={`project-${projectIndex}-service-${serviceType.name}`}
                                checked={project.serviceTypes.includes(serviceType.name)}
                                onChange={() =>
                                  handleServiceTypeToggle(projectIndex, serviceType.name)
                                }
                                className="neo-checkbox neo-checkbox-sm"
                              />
                              <label
                                htmlFor={`project-${projectIndex}-service-${serviceType.name}`}
                              ></label>
                              <span
                                className="text-sm text-foreground group-hover:text-accent transition-colors cursor-pointer font-primary"
                                onClick={() =>
                                  handleServiceTypeToggle(projectIndex, serviceType.name)
                                }
                              >
                                {serviceType.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {selectedProjects.length > 0 && (
        <div className="neo-card bg-accent/10 border-accent rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-foreground font-primary">
              <strong>{selectedProjects.length}</strong> project
              {selectedProjects.length !== 1 ? "s" : ""} configured. You can add more
              projects from different service lines by selecting another service line
              above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
