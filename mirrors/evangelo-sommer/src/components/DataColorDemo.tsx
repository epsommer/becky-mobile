"use client"

import React from 'react';
import { getDataColor, getGrowthColor, getCompletionColor } from '@/lib/data-colors';

/**
 * Demo component to showcase the data-driven color system
 * This component can be used for testing and development
 */
export function DataColorDemo() {
  const testData = [
    { label: "Severe Decrease (-25%)", value: 1000, comparison: 1333, expectedColor: "severe-decrease" },
    { label: "Major Decrease (-15%)", value: 1000, comparison: 1176, expectedColor: "major-decrease" },
    { label: "Average Decrease (-8%)", value: 1000, comparison: 1087, expectedColor: "average-decrease" },
    { label: "Mild Decrease (-3%)", value: 1000, comparison: 1031, expectedColor: "mild-decrease" },
    { label: "Mild Increase (+5%)", value: 1050, comparison: 1000, expectedColor: "mild-increase" },
    { label: "Good Increase (+15%)", value: 1150, comparison: 1000, expectedColor: "good-increase" },
    { label: "Solid Increase (+25%)", value: 1250, comparison: 1000, expectedColor: "solid-increase" },
    { label: "Strong Increase (+40%)", value: 1400, comparison: 1000, expectedColor: "strong-increase" },
    { label: "Excellent Increase (+60%)", value: 1600, comparison: 1000, expectedColor: "excellent-increase" },
    { label: "Outstanding Increase (+85%)", value: 1850, comparison: 1000, expectedColor: "outstanding-increase" },
    { label: "Exceptional Increase (+120%)", value: 2200, comparison: 1000, expectedColor: "exceptional-increase" }
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
        Data Color System Demo
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {testData.map((test, index) => {
          const colorInfo = getDataColor(test.value, test.comparison);
          return (
            <div key={index} className="bg-hud-background-primary border-2 border-hud-border p-4">
              <h3 className="text-sm font-bold text-hud-text-secondary font-primary mb-2 uppercase tracking-wide">
                {test.label}
              </h3>
              <div className={`text-2xl font-bold ${colorInfo.class} font-primary mb-2`} title={colorInfo.description}>
                ${test.value.toLocaleString()}
              </div>
              <div className="text-xs text-hud-text-secondary font-primary">
                vs ${test.comparison.toLocaleString()}
              </div>
              <div className="text-xs text-hud-text-secondary font-primary mt-1">
                Color: {colorInfo.class}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-4">
          Completion Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { completed: 0, total: 10, label: "0% Complete" },
            { completed: 3, total: 10, label: "30% Complete" },
            { completed: 7, total: 10, label: "70% Complete" },
            { completed: 9, total: 10, label: "90% Complete" }
          ].map((test, index) => {
            const colorInfo = getCompletionColor(test.completed, test.total);
            return (
              <div key={index} className="bg-hud-background-primary border-2 border-hud-border p-4 text-center">
                <div className="text-sm font-bold text-hud-text-secondary font-primary mb-2 uppercase tracking-wide">
                  {test.label}
                </div>
                <div className={`text-xl font-bold ${colorInfo.class} font-primary`} title={colorInfo.description}>
                  {test.completed}/{test.total}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}