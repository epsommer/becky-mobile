// src/components/FrequencyScheduler.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ScheduleRule,
  FrequencyType,
  EndRuleType,
  FrequencyValidationResult,
  CalculatedOccurrence,
} from "../types/scheduling";
import FrequencyCalculator from "../lib/frequency-calculator";

interface FrequencySchedulerProps {
  initialRule?: Partial<ScheduleRule>;
  onRuleChange: (rule: ScheduleRule) => void;
  onValidationChange?: (validation: FrequencyValidationResult) => void;
  disabled?: boolean;
  showPreview?: boolean;
  maxPreviewOccurrences?: number;
}

export default function FrequencyScheduler({
  initialRule,
  onRuleChange,
  onValidationChange,
  disabled = false,
  showPreview = true,
  maxPreviewOccurrences = 10,
}: FrequencySchedulerProps) {
  const [rule, setRule] = useState<Partial<ScheduleRule>>({
    frequency: "weekly",
    interval: 1,
    daysOfWeek: [new Date().getDay()],
    endRule: { type: "never" },
    ...initialRule,
  });

  const [validation, setValidation] = useState<FrequencyValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
  });

  const [preview, setPreview] = useState<CalculatedOccurrence[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get frequency options
  const frequencyOptions = FrequencyCalculator.getFrequencyOptions();

  // Update rule and validate
  useEffect(() => {
    const validationResult = FrequencyCalculator.validateScheduleRule(rule);
    setValidation(validationResult);
    onValidationChange?.(validationResult);

    if (validationResult.isValid && rule.frequency && rule.interval) {
      const completeRule: ScheduleRule = {
        id: initialRule?.id || `rule_${Date.now()}`,
        frequency: rule.frequency,
        interval: rule.interval,
        daysOfWeek: rule.daysOfWeek,
        dayOfMonth: rule.dayOfMonth,
        endRule: rule.endRule || { type: "never" },
        timezone:
          rule.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: initialRule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onRuleChange(completeRule);

      // Generate preview
      if (showPreview) {
        try {
          const occurrences = FrequencyCalculator.calculateNextOccurrences({
            startDate: new Date().toISOString(),
            scheduleRule: completeRule,
            occurrenceLimit: maxPreviewOccurrences,
          });
          setPreview(occurrences);
        } catch {
          setPreview([]);
        }
      }
    }
  }, [
    rule,
    onRuleChange,
    onValidationChange,
    showPreview,
    maxPreviewOccurrences,
    initialRule?.id,
    initialRule?.createdAt,
  ]);

  const handleFrequencyChange = (frequency: FrequencyType) => {
    const option = frequencyOptions.find((opt) => opt.value === frequency);
    const newRule = {
      ...rule,
      frequency,
      interval: option?.defaultInterval || 1,
    };

    // Reset frequency-specific fields
    if (frequency !== "weekly" && frequency !== "bi-weekly") {
      delete newRule.daysOfWeek;
    }
    if (frequency !== "monthly") {
      delete newRule.dayOfMonth;
    }

    // Set defaults for new frequency
    if ((frequency === "weekly" || frequency === "bi-weekly") && !newRule.daysOfWeek) {
      newRule.daysOfWeek = [new Date().getDay()];
    }

    setRule(newRule);
  };

  const handleIntervalChange = (interval: number) => {
    setRule({ ...rule, interval });
  };

  const handleDaysOfWeekChange = (day: number, checked: boolean) => {
    const currentDays = rule.daysOfWeek || [];
    const newDays = checked
      ? [...currentDays, day].sort((a, b) => a - b)
      : currentDays.filter((d) => d !== day);

    setRule({ ...rule, daysOfWeek: newDays });
  };

  const handleDayOfMonthChange = (dayOfMonth: number) => {
    setRule({ ...rule, dayOfMonth });
  };

  const handleEndRuleChange = (endRule: {
    type: EndRuleType;
    value?: number | string;
  }) => {
    setRule({ ...rule, endRule });
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Main Frequency Selection */}
      <div>
        <label className="block text-sm font-medium text-tactical-grey-600 mb-3">
          Frequency
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {frequencyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => handleFrequencyChange(option.value)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                rule.frequency === option.value
                  ? "border-tactical-gold-500 bg-tactical-gold-muted text-tactical-brown-dark"
                  : "border-tactical-grey-300 hover:border-tactical-grey-400 text-tactical-grey-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-xs text-tactical-grey-500 mt-1">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Interval Configuration */}
      {rule.frequency && (
        <div>
          <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
            Repeat every
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max={
                frequencyOptions.find((opt) => opt.value === rule.frequency)
                  ?.intervalRange.max || 100
              }
              value={rule.interval || 1}
              disabled={disabled}
              onChange={(e) =>
                handleIntervalChange(parseInt(e.target.value) || 1)
              }
              className="w-20 px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white disabled:opacity-50"
            />
            <span className="text-sm text-tactical-grey-600">
              {rule.frequency === "daily"
                ? rule.interval === 1
                  ? "day"
                  : "days"
                : rule.frequency === "weekly"
                  ? rule.interval === 1
                    ? "week"
                    : "weeks"
                  : rule.frequency === "bi-weekly"
                    ? rule.interval === 1
                      ? "bi-week (every 2 weeks)"
                      : `bi-weeks (every ${(rule.interval || 1) * 2} weeks)`
                    : rule.frequency === "monthly"
                      ? rule.interval === 1
                        ? "month"
                        : "months"
                      : rule.interval === 1
                        ? "day"
                        : "days"}
            </span>
          </div>
        </div>
      )}

      {/* Weekly and Bi-weekly Configuration */}
      {(rule.frequency === "weekly" || rule.frequency === "bi-weekly") && (
        <div>
          <label className="block text-sm font-medium text-tactical-grey-600 mb-3">
            Repeat on
          </label>
          <div className="flex flex-wrap gap-2">
            {dayNames.map((day, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={rule.daysOfWeek?.includes(index) || false}
                  onChange={(e) =>
                    handleDaysOfWeekChange(index, e.target.checked)
                  }
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ${
                    rule.daysOfWeek?.includes(index)
                      ? "bg-tactical-gold-muted0 text-white"
                      : "bg-tactical-grey-200 text-tactical-grey-600 hover:bg-tactical-grey-300"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {day}
                </div>
              </label>
            ))}
          </div>
          {rule.daysOfWeek?.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              Select at least one day of the week
            </p>
          )}
        </div>
      )}

      {/* Monthly Configuration */}
      {rule.frequency === "monthly" && (
        <div>
          <label className="block text-sm font-medium text-tactical-grey-600 mb-3">
            Repeat on
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="monthlyType"
                disabled={disabled}
                checked={!rule.dayOfMonth || rule.dayOfMonth > 0}
                onChange={() => handleDayOfMonthChange(new Date().getDate())}
                className="mr-3"
              />
              <span className="text-sm text-tactical-grey-600">
                Day {new Date().getDate()} of the month
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="monthlyType"
                disabled={disabled}
                checked={rule.dayOfMonth === -1}
                onChange={() => handleDayOfMonthChange(-1)}
                className="mr-3"
              />
              <span className="text-sm text-tactical-grey-600">
                Last day of the month
              </span>
            </label>
            <div className="flex items-center">
              <input
                type="radio"
                name="monthlyType"
                disabled={disabled}
                checked={
                  !!(
                    rule.dayOfMonth &&
                    rule.dayOfMonth > 0 &&
                    rule.dayOfMonth !== new Date().getDate()
                  )
                }
                onChange={() => {}}
                className="mr-3"
              />
              <span className="text-sm text-tactical-grey-600 mr-2">Day</span>
              <input
                type="number"
                min="1"
                max="31"
                disabled={disabled}
                value={
                  rule.dayOfMonth && rule.dayOfMonth > 0
                    ? rule.dayOfMonth
                    : new Date().getDate()
                }
                onChange={(e) =>
                  handleDayOfMonthChange(parseInt(e.target.value) || 1)
                }
                onClick={(e) =>
                  handleDayOfMonthChange(
                    parseInt((e.target as HTMLInputElement).value) || 1,
                  )
                }
                className="w-16 px-2 py-1 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white disabled:opacity-50"
              />
              <span className="text-sm text-tactical-grey-600 ml-2">of the month</span>
            </div>
          </div>
        </div>
      )}

      {/* End Rule Configuration */}
      <div>
        <label className="block text-sm font-medium text-tactical-grey-600 mb-3">
          End repeat
        </label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="radio"
              name="endRule"
              disabled={disabled}
              checked={rule.endRule?.type === "never"}
              onChange={() => handleEndRuleChange({ type: "never" })}
              className="mr-3"
            />
            <span className="text-sm text-tactical-grey-600">Never</span>
          </label>

          <div className="flex items-center">
            <input
              type="radio"
              name="endRule"
              disabled={disabled}
              checked={rule.endRule?.type === "occurrences"}
              onChange={() =>
                handleEndRuleChange({ type: "occurrences", value: 10 })
              }
              className="mr-3"
            />
            <span className="text-sm text-tactical-grey-600 mr-2">After</span>
            <input
              type="number"
              min="1"
              max="1000"
              disabled={disabled}
              value={
                rule.endRule?.type === "occurrences"
                  ? (rule.endRule.value as number) || 10
                  : 10
              }
              onChange={(e) =>
                handleEndRuleChange({
                  type: "occurrences",
                  value: parseInt(e.target.value) || 1,
                })
              }
              onClick={() =>
                handleEndRuleChange({ type: "occurrences", value: 10 })
              }
              className="w-20 px-2 py-1 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white disabled:opacity-50"
            />
            <span className="text-sm text-tactical-grey-600 ml-2">occurrences</span>
          </div>

          <div className="flex items-center">
            <input
              type="radio"
              name="endRule"
              disabled={disabled}
              checked={rule.endRule?.type === "date"}
              onChange={() => {
                const futureDate = new Date();
                futureDate.setMonth(futureDate.getMonth() + 6);
                handleEndRuleChange({
                  type: "date",
                  value: futureDate.toISOString().split("T")[0],
                });
              }}
              className="mr-3"
            />
            <span className="text-sm text-tactical-grey-600 mr-2">On</span>
            <input
              type="date"
              disabled={disabled}
              value={
                rule.endRule?.type === "date"
                  ? (rule.endRule.value as string)?.split("T")[0] ||
                    new Date().toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) =>
                handleEndRuleChange({ type: "date", value: e.target.value })
              }
              onClick={() => {
                if (rule.endRule?.type !== "date") {
                  const futureDate = new Date();
                  futureDate.setMonth(futureDate.getMonth() + 6);
                  handleEndRuleChange({
                    type: "date",
                    value: futureDate.toISOString().split("T")[0],
                  });
                }
              }}
              className="px-3 py-1 border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-tactical-gold hover:text-tactical-brown-dark font-medium disabled:opacity-50"
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-tactical-grey-100 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
              Timezone
            </label>
            <select
              disabled={disabled}
              value={
                rule.timezone ||
                Intl.DateTimeFormat().resolvedOptions().timeZone
              }
              onChange={(e) => setRule({ ...rule, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white disabled:opacity-50"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}

          {validation.warnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <svg
                className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-amber-700">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {showPreview && validation.isValid && preview.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-tactical-grey-600 mb-3">
            Next {maxPreviewOccurrences} occurrences
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {preview.map((occurrence, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-tactical-grey-100 rounded text-sm"
              >
                <span className="text-tactical-grey-600">
                  {new Date(occurrence.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <div className="flex items-center space-x-2">
                  {occurrence.metadata?.isWeekend && (
                    <span className="px-2 py-1 bg-tactical-gold-muted text-tactical-brown-dark text-xs rounded">
                      Weekend
                    </span>
                  )}
                  {occurrence.metadata?.isHoliday && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      Holiday
                    </span>
                  )}
                  {occurrence.metadata?.adjustedFromOriginal && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                      Adjusted
                    </span>
                  )}
                  {occurrence.isLast && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Last
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {validation.isValid && rule.frequency && rule.interval && (
        <div className="p-4 bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-tactical-grey-2000 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-tactical-brown-dark mb-1">
                Schedule Summary
              </h4>
              <p className="text-sm text-tactical-brown-dark">
                {FrequencyCalculator.describeScheduleRule(rule as ScheduleRule)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
