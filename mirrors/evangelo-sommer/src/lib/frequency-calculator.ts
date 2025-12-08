// src/lib/frequency-calculator.ts

import {
  ScheduleRule,
  CalculatedOccurrence,
  FrequencyCalculationOptions,
  FrequencyValidationResult,
  FrequencyOption,
} from "../types/scheduling";

export class FrequencyCalculator {
  /**
   * Calculate next occurrences based on schedule rule
   */
  static calculateNextOccurrences(
    options: FrequencyCalculationOptions,
  ): CalculatedOccurrence[] {
    const { startDate, scheduleRule, occurrenceLimit = 50, endDate } = options;
    const occurrences: CalculatedOccurrence[] = [];

    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxDate = endDate ? new Date(endDate) : null;
    const maxOccurrences =
      scheduleRule.endRule.type === "occurrences"
        ? (scheduleRule.endRule.value as number)
        : occurrenceLimit;

    while (occurrenceCount < maxOccurrences) {
      const nextDate = this.getNextOccurrence(currentDate, scheduleRule);

      if (!nextDate) break;

      // Check end date constraint
      if (maxDate && nextDate > maxDate) break;

      // Check end rule
      if (scheduleRule.endRule.type === "date") {
        const endRuleDate = new Date(scheduleRule.endRule.value as string);
        if (nextDate > endRuleDate) break;
      }

      const isLast =
        occurrenceCount === maxOccurrences - 1 ||
        (maxDate && nextDate.getTime() === maxDate.getTime()) ||
        (scheduleRule.endRule.type === "date" &&
          nextDate.getTime() ===
            new Date(scheduleRule.endRule.value as string).getTime());

      const occurrence: CalculatedOccurrence = {
        date: nextDate.toISOString(),
        isLast,
        occurrenceNumber: occurrenceCount + 1,
        metadata: {
          isWeekend: this.isWeekend(nextDate),
          isHoliday: this.isHoliday(nextDate),
          adjustedFromOriginal: false,
        },
      };

      // Check for weekend/holiday adjustments if needed
      const adjustedOccurrence = this.adjustForBusinessDays(occurrence);
      occurrences.push(adjustedOccurrence);

      currentDate = nextDate;
      occurrenceCount++;
    }

    return occurrences;
  }

  /**
   * Get the next occurrence date based on frequency rules
   */
  private static getNextOccurrence(
    currentDate: Date,
    rule: ScheduleRule,
  ): Date | null {
    const nextDate = new Date(currentDate);

    switch (rule.frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + rule.interval);
        break;

      case "weekly":
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          return this.getNextWeeklyOccurrence(currentDate, rule);
        } else {
          nextDate.setDate(nextDate.getDate() + rule.interval * 7);
        }
        break;

      case "bi-weekly":
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          const biWeeklyRule = { ...rule, interval: rule.interval * 2 };
          return this.getNextWeeklyOccurrence(currentDate, biWeeklyRule);
        } else {
          nextDate.setDate(nextDate.getDate() + rule.interval * 14);
        }
        break;

      case "monthly":
        if (rule.dayOfMonth) {
          return this.getNextMonthlyOccurrence(currentDate, rule);
        } else {
          nextDate.setMonth(nextDate.getMonth() + rule.interval);
        }
        break;

      case "custom":
        // Custom frequency logic based on interval
        nextDate.setDate(nextDate.getDate() + rule.interval);
        break;

      default:
        return null;
    }

    return nextDate;
  }

  /**
   * Calculate next weekly occurrence with specific days of week
   */
  private static getNextWeeklyOccurrence(
    currentDate: Date,
    rule: ScheduleRule,
  ): Date {
    const nextDate = new Date(currentDate);
    const currentDay = currentDate.getDay();
    const daysOfWeek = rule.daysOfWeek!.sort((a, b) => a - b);

    // Find next day in the current week
    const nextDayInWeek = daysOfWeek.find((day) => day > currentDay);

    if (nextDayInWeek !== undefined) {
      // Next occurrence is later this week
      const daysToAdd = nextDayInWeek - currentDay;
      nextDate.setDate(nextDate.getDate() + daysToAdd);
    } else {
      // Next occurrence is in a future week
      const daysUntilNextWeek = 7 - currentDay + daysOfWeek[0];
      const weeksToAdd = (rule.interval - 1) * 7;
      nextDate.setDate(nextDate.getDate() + daysUntilNextWeek + weeksToAdd);
    }

    return nextDate;
  }

  /**
   * Calculate next monthly occurrence with specific day of month
   */
  private static getNextMonthlyOccurrence(
    currentDate: Date,
    rule: ScheduleRule,
  ): Date {
    const nextDate = new Date(currentDate);
    const targetDay = rule.dayOfMonth!;

    // Move to next month first
    nextDate.setMonth(nextDate.getMonth() + rule.interval);

    if (targetDay === -1) {
      // Last day of month
      nextDate.setMonth(nextDate.getMonth() + 1, 0); // Sets to last day of current month
    } else {
      // Specific day of month
      const daysInMonth = new Date(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        0,
      ).getDate();
      const actualDay = Math.min(targetDay, daysInMonth);
      nextDate.setDate(actualDay);
    }

    return nextDate;
  }

  /**
   * Adjust occurrence for business days if needed
   */
  private static adjustForBusinessDays(
    occurrence: CalculatedOccurrence,
  ): CalculatedOccurrence {
    const date = new Date(occurrence.date);

    // If it's a weekend, move to next Monday
    if (this.isWeekend(date)) {
      const daysToAdd = date.getDay() === 0 ? 1 : 8 - date.getDay(); // Sunday: +1, Saturday: +2
      date.setDate(date.getDate() + daysToAdd);

      return {
        ...occurrence,
        date: date.toISOString(),
        metadata: {
          ...occurrence.metadata,
          adjustedFromOriginal: true,
          originalDate: occurrence.date,
        },
      };
    }

    return occurrence;
  }

  /**
   * Validate schedule rule configuration
   */
  static validateScheduleRule(
    rule: Partial<ScheduleRule>,
  ): FrequencyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestedFixes: Partial<ScheduleRule>[] = [];

    // Validate frequency
    if (!rule.frequency) {
      errors.push("Frequency is required");
    }

    // Validate interval
    if (!rule.interval || rule.interval < 1) {
      errors.push("Interval must be a positive number");
      suggestedFixes.push({ interval: 1 });
    }

    // Validate frequency-specific rules
    if (rule.frequency === "weekly" && rule.daysOfWeek) {
      if (rule.daysOfWeek.length === 0) {
        warnings.push(
          "Weekly frequency with no specified days will default to current day",
        );
      }

      const invalidDays = rule.daysOfWeek.filter((day) => day < 0 || day > 6);
      if (invalidDays.length > 0) {
        errors.push("Days of week must be between 0 (Sunday) and 6 (Saturday)");
        suggestedFixes.push({
          daysOfWeek: rule.daysOfWeek.filter((day) => day >= 0 && day <= 6),
        });
      }
    }

    if (rule.frequency === "monthly" && rule.dayOfMonth) {
      if (rule.dayOfMonth < -1 || rule.dayOfMonth > 31) {
        errors.push("Day of month must be between 1-31 or -1 for last day");
        suggestedFixes.push({ dayOfMonth: 1 });
      }
    }

    // Validate end rule
    if (rule.endRule) {
      if (rule.endRule.type === "occurrences") {
        const occurrences = rule.endRule.value as number;
        if (!occurrences || occurrences < 1) {
          errors.push("Occurrence count must be a positive number");
          suggestedFixes.push({
            endRule: { ...rule.endRule, value: 10 },
          });
        } else if (occurrences > 1000) {
          warnings.push("Large number of occurrences may impact performance");
        }
      } else if (rule.endRule.type === "date") {
        const endDate = new Date(rule.endRule.value as string);
        const now = new Date();
        if (endDate < now) {
          warnings.push("End date is in the past");
        }
      }
    }

    // Validate interval ranges based on frequency
    if (rule.frequency && rule.interval) {
      const limits = this.getIntervalLimits(rule.frequency);
      if (rule.interval > limits.max) {
        warnings.push(
          `Interval of ${rule.interval} ${rule.frequency} is unusually large`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedFixes: suggestedFixes.length > 0 ? suggestedFixes : undefined,
    };
  }

  /**
   * Get predefined frequency options
   */
  static getFrequencyOptions(): FrequencyOption[] {
    return [
      {
        label: "Daily",
        value: "daily",
        description: "Repeat every day",
        intervalRange: { min: 1, max: 365 },
        defaultInterval: 1,
      },
      {
        label: "Weekly",
        value: "weekly",
        description: "Repeat every week",
        intervalRange: { min: 1, max: 52 },
        defaultInterval: 1,
      },
      {
        label: "Bi-weekly",
        value: "bi-weekly",
        description: "Repeat every other week",
        intervalRange: { min: 1, max: 26 },
        defaultInterval: 1,
      },
      {
        label: "Monthly",
        value: "monthly",
        description: "Repeat every month",
        intervalRange: { min: 1, max: 12 },
        defaultInterval: 1,
      },
      {
        label: "Custom",
        value: "custom",
        description: "Custom interval in days",
        intervalRange: { min: 1, max: 365 },
        defaultInterval: 7,
      },
    ];
  }

  /**
   * Get next occurrence date for a given schedule rule
   */
  static getNextOccurrenceDate(
    lastOccurrence: string,
    rule: ScheduleRule,
  ): string | null {
    const lastDate = new Date(lastOccurrence);
    const nextDate = this.getNextOccurrence(lastDate, rule);
    return nextDate ? nextDate.toISOString() : null;
  }

  /**
   * Check if two schedule rules would create conflicts
   */
  static detectScheduleConflicts(
    rule1: ScheduleRule,
    rule2: ScheduleRule,
    startDate: string,
    days: number = 30,
  ): { hasConflict: boolean; conflictDates: string[] } {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const occurrences1 = this.calculateNextOccurrences({
      startDate,
      scheduleRule: rule1,
      occurrenceLimit: 100,
      endDate: endDate.toISOString(),
    });

    const occurrences2 = this.calculateNextOccurrences({
      startDate,
      scheduleRule: rule2,
      occurrenceLimit: 100,
      endDate: endDate.toISOString(),
    });

    const dates1 = new Set(occurrences1.map((o) => o.date.split("T")[0]));
    const dates2 = new Set(occurrences2.map((o) => o.date.split("T")[0]));

    const conflictDates: string[] = [];
    dates1.forEach((date) => {
      if (dates2.has(date)) {
        conflictDates.push(date);
      }
    });

    return {
      hasConflict: conflictDates.length > 0,
      conflictDates,
    };
  }

  /**
   * Generate human-readable description of schedule rule
   */
  static describeScheduleRule(rule: ScheduleRule): string {
    const { frequency, interval, daysOfWeek, dayOfMonth, endRule } = rule;

    let description = "";

    // Base frequency description
    switch (frequency) {
      case "daily":
        description = interval === 1 ? "Every day" : `Every ${interval} days`;
        break;
      case "weekly":
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = daysOfWeek
            .map((day) => this.getDayName(day))
            .join(", ");
          description =
            interval === 1
              ? `Every ${dayNames}`
              : `Every ${interval} weeks on ${dayNames}`;
        } else {
          description =
            interval === 1 ? "Every week" : `Every ${interval} weeks`;
        }
        break;
      case "bi-weekly":
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = daysOfWeek
            .map((day) => this.getDayName(day))
            .join(", ");
          description =
            interval === 1
              ? `Every other week on ${dayNames}`
              : `Every ${interval * 2} weeks on ${dayNames}`;
        } else {
          description =
            interval === 1 ? "Every other week" : `Every ${interval * 2} weeks`;
        }
        break;
      case "monthly":
        if (dayOfMonth === -1) {
          description =
            interval === 1
              ? "Last day of every month"
              : `Last day of every ${interval} months`;
        } else if (dayOfMonth) {
          const ordinal = this.getOrdinal(dayOfMonth);
          description =
            interval === 1
              ? `${ordinal} of every month`
              : `${ordinal} of every ${interval} months`;
        } else {
          description =
            interval === 1 ? "Every month" : `Every ${interval} months`;
        }
        break;
      case "custom":
        description = `Every ${interval} days`;
        break;
    }

    // End rule description
    if (endRule.type === "occurrences") {
      description += `, ${endRule.value} times`;
    } else if (endRule.type === "date") {
      const endDate = new Date(endRule.value as string);
      description += `, until ${endDate.toLocaleDateString()}`;
    }

    return description;
  }

  /**
   * Utility methods
   */
  private static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private static isHoliday(date: Date): boolean {
    // Simplified holiday detection - in production, you'd use a proper holiday library
    const month = date.getMonth();
    const day = date.getDate();

    // Common US holidays (simplified)
    const holidays = [
      [0, 1], // New Year's Day
      [6, 4], // Independence Day
      [11, 25], // Christmas
    ];

    return holidays.some(
      ([holidayMonth, holidayDay]) =>
        month === holidayMonth && day === holidayDay,
    );
  }

  private static getDayName(dayNumber: number): string {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayNumber];
  }

  private static getOrdinal(num: number): string {
    const ordinals = [
      "",
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th",
      "6th",
      "7th",
      "8th",
      "9th",
      "10th",
      "11th",
      "12th",
      "13th",
      "14th",
      "15th",
      "16th",
      "17th",
      "18th",
      "19th",
      "20th",
      "21st",
      "22nd",
      "23rd",
      "24th",
      "25th",
      "26th",
      "27th",
      "28th",
      "29th",
      "30th",
      "31st",
    ];
    return ordinals[num] || `${num}th`;
  }

  private static getIntervalLimits(frequency: string): {
    min: number;
    max: number;
  } {
    switch (frequency) {
      case "daily":
        return { min: 1, max: 365 };
      case "weekly":
        return { min: 1, max: 52 };
      case "bi-weekly":
        return { min: 1, max: 26 };
      case "monthly":
        return { min: 1, max: 12 };
      case "custom":
        return { min: 1, max: 365 };
      default:
        return { min: 1, max: 100 };
    }
  }

  /**
   * Calculate time until next occurrence
   */
  static getTimeUntilNext(
    scheduleRule: ScheduleRule,
    lastOccurrence?: string,
  ): {
    milliseconds: number;
    humanReadable: string;
  } {
    const startDate = lastOccurrence || new Date().toISOString();
    const nextOccurrence = this.getNextOccurrenceDate(startDate, scheduleRule);

    if (!nextOccurrence) {
      return { milliseconds: 0, humanReadable: "No next occurrence" };
    }

    const now = new Date().getTime();
    const next = new Date(nextOccurrence).getTime();
    const diff = next - now;

    if (diff <= 0) {
      return { milliseconds: 0, humanReadable: "Overdue" };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let humanReadable = "";
    if (days > 0) {
      humanReadable += `${days} day${days > 1 ? "s" : ""}`;
      if (hours > 0) humanReadable += `, ${hours} hour${hours > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      humanReadable += `${hours} hour${hours > 1 ? "s" : ""}`;
      if (minutes > 0)
        humanReadable += `, ${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else {
      humanReadable += `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }

    return { milliseconds: diff, humanReadable };
  }
}

export default FrequencyCalculator;
