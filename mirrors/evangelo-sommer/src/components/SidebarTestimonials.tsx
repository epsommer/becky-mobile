"use client";

import { Star, Send } from 'lucide-react';
import { Client } from '../types/client';

interface SidebarTestimonialsProps {
  client: Client;
  onRequestClick?: () => void;
}

export default function SidebarTestimonials({
  client,
  onRequestClick
}: SidebarTestimonialsProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="neo-card bg-[var(--neomorphic-accent)]/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-[var(--neomorphic-accent)]" />
          <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-[var(--neomorphic-text)]">
            Testimonial Request
          </h3>
        </div>
        <p className="text-xs text-[var(--neomorphic-icon)] font-primary">
          Request a testimonial from {client.name}
        </p>
      </div>

      <div className="space-y-4">
        <div className="neo-card bg-[var(--neomorphic-bg)] p-4 border border-[var(--neomorphic-dark-shadow)]">
          <h4 className="font-primary font-semibold text-sm text-[var(--neomorphic-text)] mb-2">
            Why Request Testimonials?
          </h4>
          <ul className="text-xs text-[var(--neomorphic-icon)] font-primary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[var(--neomorphic-accent)]">•</span>
              <span>Build trust with potential clients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--neomorphic-accent)]">•</span>
              <span>Showcase successful projects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--neomorphic-accent)]">•</span>
              <span>Strengthen your professional reputation</span>
            </li>
          </ul>
        </div>

        {onRequestClick && (
          <button
            className="neo-button-active w-full font-primary uppercase tracking-wide flex items-center justify-center gap-2 py-3"
            onClick={onRequestClick}
          >
            <Send className="w-4 h-4" />
            Request Testimonial
          </button>
        )}

        <div className="neo-card bg-[var(--neomorphic-bg)] p-3 border border-[var(--neomorphic-dark-shadow)]">
          <p className="text-xs text-[var(--neomorphic-icon)] font-primary leading-relaxed">
            A testimonial request will be sent to {client.name} via their preferred contact method.
          </p>
        </div>
      </div>
    </div>
  );
}
