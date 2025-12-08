"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Capability {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  details: {
    description: string;
    highlights: string[];
    impact?: string;
  };
}

const capabilities: Capability[] = [
  {
    id: "ai-integration",
    title: "AI Integration Expertise",
    tagline: "Intelligent systems that work smarter, not harder",
    icon: "🤖",
    details: {
      description: "Beyond basic automation - I architect intelligent systems that extract meaningful insights from unstructured data.",
      highlights: [
        "Claude AI conversation analysis with sentiment tracking",
        "Auto-draft billing from conversations (80% less manual entry)",
        "Intelligent service detection from unstructured text",
        "Confidence-based recommendations and scoring"
      ],
      impact: "Reduced manual data entry by 80% and eliminated lost revenue from overlooked opportunities"
    }
  },
  {
    id: "complex-solving",
    title: "Complex Problem Solving",
    tagline: "Solving problems others don't see coming",
    icon: "🧩",
    details: {
      description: "I identify and solve complex business problems with innovative technical solutions.",
      highlights: [
        "Multi-service client intelligence - clients appear on all relevant service pages automatically",
        "Conversation data recovery - clean and restore corrupted message imports",
        "Scheduling conflict detection with smart alternative suggestions",
        "Speaker identification and timestamp reconstruction"
      ],
      impact: "Prevented double-bookings and ensured no client gets lost between service lines"
    }
  },
  {
    id: "fullstack",
    title: "Full-Stack Development",
    tagline: "Modern tech stack from database to UI",
    icon: "⚡",
    details: {
      description: "Production-ready applications with Next.js, TypeScript, and modern best practices.",
      highlights: [
        "Next.js 15 with TypeScript for type-safe development",
        "40+ RESTful API endpoints with Prisma ORM",
        "React Three Fiber for 3D tactical HUD interfaces",
        "Framer Motion animations and mobile-first design"
      ],
      impact: "Built complete CRM from scratch with 100+ components and 20+ database models"
    }
  },
  {
    id: "ux-innovation",
    title: "UX Innovation",
    tagline: "Interfaces that feel natural and intuitive",
    icon: "✨",
    details: {
      description: "Creative, user-centered design that makes complex workflows simple.",
      highlights: [
        "Drag-and-drop scheduling with touch optimization",
        "Tactical HUD design with real-time visual feedback",
        "Contextual sidebar architecture with smart panels",
        "WCAG-compliant accessibility features"
      ],
      impact: "Field workers can update schedules on mobile with intuitive touch gestures"
    }
  },
  {
    id: "automation",
    title: "Business Process Automation",
    tagline: "Automate the tedious, focus on what matters",
    icon: "🔄",
    details: {
      description: "End-to-end workflow automation that respects business rules and human oversight.",
      highlights: [
        "AI-powered billing detection and auto-generation",
        "Intelligent follow-up system with flexible recurrence",
        "Conflict detection with business hours validation",
        "Multi-calendar sync (Google, Notion, Outlook, Apple)"
      ],
      impact: "Automated follow-ups ensure no customer falls through the cracks"
    }
  },
  {
    id: "integrations",
    title: "Integration Capabilities",
    tagline: "Connect everything seamlessly",
    icon: "🔌",
    details: {
      description: "Robust integrations with external services and APIs for unified workflows.",
      highlights: [
        "Google Calendar, Notion, Outlook, Apple Calendar sync",
        "Gmail API and SMTP for multi-channel communication",
        "Voice booking integration (Retell AI, Synthflow)",
        "OAuth 2.0 authentication with token refresh"
      ],
      impact: "Unified calendar view across all platforms with automatic syncing"
    }
  }
];

export default function CapabilitiesShowcase() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-tactical-grey-800 mb-4">
          What Sets Me Apart
        </h1>
        <p className="text-lg text-tactical-grey-600 max-w-3xl mx-auto">
          Creative prompt engineering meets full-stack development. I build intelligent,
          AI-integrated systems that solve real business problems.
        </p>
      </div>

      {/* Capability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {capabilities.map((capability) => {
          const isExpanded = expandedCard === capability.id;

          return (
            <div
              key={capability.id}
              className={`border-2 rounded-lg transition-all duration-300 cursor-pointer ${
                isExpanded
                  ? "border-tactical-gold shadow-lg bg-tactical-gold-muted"
                  : "border-tactical-grey-300 hover:border-tactical-grey-400 bg-white"
              }`}
              onClick={() => toggleCard(capability.id)}
            >
              {/* Card Header - Always Visible */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl">{capability.icon}</div>
                  <button
                    className={`text-tactical-grey-500 hover:text-tactical-grey-700 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <ChevronDown size={24} />
                  </button>
                </div>

                <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                  {capability.title}
                </h3>
                <p className="text-sm text-tactical-grey-600">
                  {capability.tagline}
                </p>
              </div>

              {/* Expandable Details */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-6 border-t border-tactical-grey-200 pt-4">
                  {/* Description */}
                  <p className="text-sm text-tactical-grey-700 mb-4">
                    {capability.details.description}
                  </p>

                  {/* Highlights */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-tactical-grey-600 uppercase mb-2">
                      Key Features
                    </h4>
                    <ul className="space-y-2">
                      {capability.details.highlights.map((highlight, index) => (
                        <li
                          key={index}
                          className="text-sm text-tactical-grey-700 flex items-start"
                        >
                          <span className="text-tactical-gold mr-2 flex-shrink-0">
                            •
                          </span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Impact */}
                  {capability.details.impact && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <h4 className="text-xs font-semibold text-green-800 uppercase mb-1">
                        Real Impact
                      </h4>
                      <p className="text-sm text-green-700">
                        {capability.details.impact}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="text-center mt-16 p-8 bg-tactical-grey-100 rounded-lg">
        <h2 className="text-2xl font-bold text-tactical-grey-800 mb-3">
          Ready to Build Something Intelligent?
        </h2>
        <p className="text-tactical-grey-600 mb-6 max-w-2xl mx-auto">
          I don't just write code - I architect intelligent systems that solve real
          business problems with creative AI integration and thoughtful UX design.
        </p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-tactical-grey-700 font-medium">
            Evangelo Sommer
          </span>
          <span className="text-tactical-grey-400">•</span>
          <span className="text-tactical-grey-600">
            Creative Prompt System Administrator
          </span>
        </div>
      </div>
    </div>
  );
}
