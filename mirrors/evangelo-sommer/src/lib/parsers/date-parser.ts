// src/lib/parsers/date-parser.ts

import { parse, isValid, format } from "date-fns";

export class DateParser {
  static parseExcelDate(dateValue: unknown): string | null {
    console.log("🕒 Parsing date value:", {
      value: dateValue,
      type: typeof dateValue,
      raw: JSON.stringify(dateValue),
    });

    if (!dateValue) {
      console.log("❌ Date value is null/undefined");
      return null;
    }

    // Handle Excel serial dates (numbers)
    if (typeof dateValue === "number") {
      console.log("📊 Processing Excel serial date:", dateValue);
      try {
        // Excel serial date conversion (Excel epoch starts at 1900-01-01)
        const excelEpoch = new Date(1900, 0, 1); // Excel epoch
        const days = dateValue - 2; // Excel has a leap year bug (1900 was not a leap year)
        const jsDate = new Date(
          excelEpoch.getTime() + days * 24 * 60 * 60 * 1000,
        );

        if (
          isValid(jsDate) &&
          jsDate.getFullYear() > 1900 &&
          jsDate.getFullYear() < 2100
        ) {
          const isoString = jsDate.toISOString();
          console.log("✅ Excel serial date converted:", isoString);
          return isoString;
        }
      } catch (error) {
        console.log("❌ Excel serial date conversion failed:", error);
      }
    }

    // Handle string dates
    if (typeof dateValue === "string") {
      console.log("📝 Processing string date:", dateValue);

      // Clean up the string first
      let cleanDate = dateValue.trim();

      // Remove timezone abbreviations that cause parsing issues
      cleanDate = cleanDate
        .replace(/\s+(Eastern Daylight Saving Time|EDT)\s*$/gi, "")
        .replace(/\s+(Eastern Standard Time|EST)\s*$/gi, "")
        .replace(/\s+(Pacific Daylight Time|PDT)\s*$/gi, "")
        .replace(/\s+(Pacific Standard Time|PST)\s*$/gi, "")
        .replace(/\s+(Central Daylight Time|CDT)\s*$/gi, "")
        .replace(/\s+(Central Standard Time|CST)\s*$/gi, "")
        .replace(/\s+(Mountain Daylight Time|MDT)\s*$/gi, "")
        .replace(/\s+(Mountain Standard Time|MST)\s*$/gi, "")
        .trim();

      console.log("🧹 Cleaned date string:", cleanDate);

      // Common SMS export date patterns
      const datePatterns = [
        // Full format: "Saturday, August 16, 2025 4:44:26 p.m."
        "EEEE, MMMM d, yyyy h:mm:ss a",
        "EEEE, MMMM d, yyyy h:mm:ss a.",
        "MMMM d, yyyy h:mm:ss a",
        "MMMM d, yyyy h:mm:ss a.",

        // Common variations
        "EEE, MMM d, yyyy h:mm:ss a",
        "MMM d, yyyy h:mm:ss a",
        "MM/dd/yyyy h:mm:ss a",
        "M/d/yyyy h:mm:ss a",

        // ISO and standard formats
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd h:mm:ss a",

        // Short formats
        "MMM d, yyyy h:mm a",
        "MMM d, yyyy HH:mm",
        "d MMM yyyy h:mm a",
        "M/d/yyyy h:mm a",
        "M/d/yyyy H:mm",

        // Additional SMS formats
        "EEE MMM d yyyy HH:mm:ss",
        "dd/MM/yyyy HH:mm:ss",
        "dd-MM-yyyy HH:mm:ss",
        "yyyy/MM/dd HH:mm:ss",
      ];

      // Try each pattern
      for (const pattern of datePatterns) {
        try {
          const parsed = parse(cleanDate, pattern, new Date());
          if (
            isValid(parsed) &&
            parsed.getFullYear() > 1970 &&
            parsed.getFullYear() < 2100
          ) {
            const isoString = parsed.toISOString();
            console.log(
              `✅ String date parsed with pattern "${pattern}":`,
              isoString,
            );
            return isoString;
          }
        } catch {
          // Continue to next pattern
          continue;
        }
      }

      // Try native Date parsing as fallback
      try {
        const nativeDate = new Date(cleanDate);
        if (
          isValid(nativeDate) &&
          nativeDate.getFullYear() > 1970 &&
          nativeDate.getFullYear() < 2100
        ) {
          const isoString = nativeDate.toISOString();
          console.log("✅ Native date parsing succeeded:", isoString);
          return isoString;
        }
      } catch (error) {
        console.log("❌ Native date parsing failed:", error);
      }

      console.log("❌ All string date parsing attempts failed for:", cleanDate);
    }

    // Handle Date objects
    if (dateValue instanceof Date) {
      console.log("📅 Processing Date object:", dateValue);
      if (
        isValid(dateValue) &&
        dateValue.getFullYear() > 1970 &&
        dateValue.getFullYear() < 2100
      ) {
        const isoString = dateValue.toISOString();
        console.log("✅ Date object converted:", isoString);
        return isoString;
      }
    }

    console.log("❌ Could not parse date, returning null");
    return null;
  }

  // Enhanced parser for conversation Excel exports with corrected multi-line format handling
  static parseConversationExportDate(dateValue: unknown): string | null {
    console.log('🗨️ Conversation Export date parsing:');
    console.log('  Raw input:', JSON.stringify(dateValue));
    console.log('  Input type:', typeof dateValue);
    console.log('  Input value:', dateValue);
    
    if (!dateValue) {
      console.log('❌ No date value provided');
      return null;
    }
    
    try {
      // Clean the input
      const cleanDate = String(dateValue).replace(/^"|"$/g, '').trim();
      const lines = cleanDate.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      
      if (lines.length === 0) {
        console.log('❌ No valid lines found');
        return null;
      }
      
      console.log('📋 Date lines found:', lines);
      
      let datePart: string | undefined;
      let timePart: string | undefined;
      let timezonePart: string | undefined;
      
      // Parse based on line structure
      if (lines.length >= 2) {
        if (lines.length >= 3) {
          if (lines[0].endsWith(',') && lines[1].match(/^\d{4}$/)) {
            // Split year format: "Friday, August 15," + "2025" + "10:08:02 a.m."
            datePart = lines[0].slice(0, -1) + ', ' + lines[1]; // Remove trailing comma, add year
            timePart = lines[2];
            timezonePart = lines[3] || 'Eastern Daylight Saving Time';
          } else if (lines[1].match(/^\d{4}\s+\d{1,2}:\d{2}:\d{2}/)) {
            // Year + time format: "Friday, August 15," + "2025 6:01:08 p.m."
            datePart = lines[0].slice(0, -1) + ', ' + lines[1].split(' ')[0]; // Get year part
            timePart = lines[1].substring(lines[1].indexOf(' ') + 1); // Get time part
            timezonePart = lines[2];
          } else {
            // Standard 3-line format
            datePart = lines[0];
            timePart = lines[1];
            timezonePart = lines[2];
          }
        } else if (lines.length === 2) {
          if (lines[1].match(/^\d{4}\s+\d{1,2}:\d{2}:\d{2}/)) {
            // 2-line year + time format: "Friday, August 15," + "2025 6:01:08 p.m."
            datePart = lines[0].slice(0, -1) + ', ' + lines[1].split(' ')[0]; // Get year part
            timePart = lines[1].substring(lines[1].indexOf(' ') + 1); // Get time part
            timezonePart = 'Eastern Daylight Saving Time'; // Default
          } else {
            // Standard 2-line format
            datePart = lines[0];
            timePart = lines[1];
            timezonePart = 'Eastern Daylight Saving Time'; // Default
          }
        }
      } else {
        console.log('❌ Insufficient data - need at least 2 lines');
        return null; // Insufficient data
      }
      
      if (!datePart || !timePart) {
        console.log('❌ Missing date or time components');
        return null;
      }
      
      // Remove day name from date (everything before first comma)
      const dateWithoutDay = datePart.includes(',') ? 
        datePart.substring(datePart.indexOf(',') + 1).trim() : 
        datePart;
      
      // Clean time format
      const cleanTime = timePart.replace(/\./g, '');
      
      // Parse timezone
      const isEST = timezonePart && timezonePart.includes('Standard');
      const tzOffset = isEST ? '-05:00' : '-04:00'; // EST or EDT
      
      // Create ISO date string manually for better control
      const monthMap: Record<string, string> = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      
      // More flexible regex patterns to handle various formats
      const datePatterns = [
        /(\w+)\s+(\d{1,2}),\s+(\d{4})/, // Standard: "August 15, 2025"
        /(\w+)\s+(\d{1,2}),(\d{4})/, // Missing space: "August 15,2025"
        /(\w+)\s+(\d{1,2})\s+(\d{4})/, // No comma: "August 15 2025"
        /(\w+)\s+(\d{1,2}),?\s*(\d{4})/ // Optional comma with optional space
      ];
      
      const timePatterns = [
        /(\d{1,2}):(\d{2}):(\d{2})\s*([ap])\.?m\.?/i, // With optional periods: "10:08:02 a.m."
        /(\d{1,2}):(\d{2}):(\d{2})\s*([ap])m/i, // Standard: "10:08:02 am"
        /(\d{1,2}):(\d{2}):(\d{2})\s+([ap])\.?m\.?/i, // Extra space
        /(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i // Just a or p
      ];
      
      let dateMatch = null;
      let timeMatch = null;
      
      // Try each date pattern
      for (const pattern of datePatterns) {
        dateMatch = dateWithoutDay.match(pattern);
        if (dateMatch) {
          console.log(`✅ Date matched with pattern: ${pattern}`);
          break;
        }
      }
      
      // Try each time pattern
      for (const pattern of timePatterns) {
        timeMatch = cleanTime.match(pattern);
        if (timeMatch) {
          console.log(`✅ Time matched with pattern: ${pattern}`);
          break;
        }
      }
      
      if (!dateMatch || !timeMatch) {
        console.error('❌ Failed to match date or time pattern');
        console.log('Date string:', JSON.stringify(dateWithoutDay));
        console.log('Time string:', JSON.stringify(cleanTime));
        console.log('Date string length:', dateWithoutDay.length);
        console.log('Time string length:', cleanTime.length);
        console.log('Date string charCodes:', Array.from(dateWithoutDay).map(c => c.charCodeAt(0)));
        console.log('Time string charCodes:', Array.from(cleanTime).map(c => c.charCodeAt(0)));
        
        // Try to extract any numbers that look like dates as last resort
        const yearMatch = dateWithoutDay.match(/(\d{4})/);
        const monthMatch = dateWithoutDay.match(/(January|February|March|April|May|June|July|August|September|October|November|December)/i);
        const dayMatch = dateWithoutDay.match(/(\d{1,2})/);
        const hourMatch = cleanTime.match(/(\d{1,2})/);
        const minuteMatch = cleanTime.match(/:(\d{2})/);
        const secondMatch = cleanTime.match(/:(\d{2}):(\d{2})/);
        const ampmMatch = cleanTime.match(/([ap])/i);
        
        console.log('Fallback extraction attempts:', {
          year: yearMatch?.[1],
          month: monthMatch?.[1],
          day: dayMatch?.[1],
          hour: hourMatch?.[1],
          minute: minuteMatch?.[1],
          second: secondMatch?.[2],
          ampm: ampmMatch?.[1]
        });
        
        return null;
      }
      
      const month = monthMap[dateMatch[1]];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2];
      const second = timeMatch[3];
      const ampm = timeMatch[4].toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === 'p' && hour !== 12) hour += 12;
      if (ampm === 'a' && hour === 12) hour = 0;
      
      const isoString = `${year}-${month}-${day}T${hour.toString().padStart(2, '0')}:${minute}:${second}${tzOffset}`;
      
      console.log('🔧 Manual ISO construction:', {
        original: dateValue,
        dateWithoutDay,
        cleanTime,
        dateMatch,
        timeMatch,
        isoString
      });
      
      const parsedDate = new Date(isoString);
      const result = isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
      
      if (result) {
        console.log('✅ Successfully parsed conversation date:', result);
      } else {
        console.error('❌ Failed to create valid date from:', isoString);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Conversation date parsing error:', error, 'Input:', dateValue);
      return null;
    }
  }

  // Specific parser for SMS Backup & Restore exports
  static parseSMSExportDate(dateValue: unknown): string | null {
    console.log("📱 SMS Export date parsing:", dateValue);

    if (typeof dateValue === "string") {
      // Clean up common SMS export date formats
      const cleanDate = dateValue
        .replace(/Eastern Daylight Saving Time|EDT/gi, "")
        .replace(/Eastern Standard Time|EST/gi, "")
        .replace(/Pacific Daylight Time|PDT/gi, "")
        .replace(/Pacific Standard Time|PST/gi, "")
        .replace(/Central Daylight Time|CDT/gi, "")
        .replace(/Central Standard Time|CST/gi, "")
        .replace(/Mountain Daylight Time|MDT/gi, "")
        .replace(/Mountain Standard Time|MST/gi, "")
        .trim();

      console.log("🧹 Cleaned SMS date string:", cleanDate);

      // Try SMS-specific patterns first
      const smsPatterns = [
        "EEEE, MMMM d, yyyy h:mm:ss a", // "Saturday, August 16, 2025 4:44:26 p.m."
        "EEEE, MMMM d, yyyy h:mm:ss a.", // With period after a.m./p.m.
        "MMMM d, yyyy h:mm:ss a", // "August 16, 2025 4:44:26 p.m."
        "MMMM d, yyyy h:mm:ss a.", // With period
        "MM/dd/yyyy h:mm:ss a", // "08/16/2025 4:44:26 p.m."
        "M/d/yyyy h:mm:ss a", // "8/16/2025 4:44:26 p.m."
        "yyyy-MM-dd HH:mm:ss", // "2025-08-16 16:44:26"
        "EEE MMM d HH:mm:ss yyyy", // "Sat Aug 16 16:44:26 2025"
      ];

      for (const pattern of smsPatterns) {
        try {
          const parsed = parse(cleanDate, pattern, new Date());
          if (
            isValid(parsed) &&
            parsed.getFullYear() > 1970 &&
            parsed.getFullYear() < 2100
          ) {
            console.log(`✅ SMS date parsed with pattern "${pattern}"`);
            return parsed.toISOString();
          }
        } catch {
          continue;
        }
      }
    }

    // Fallback to general parsing
    return this.parseExcelDate(dateValue);
  }

  // Generate sequential fallback dates for failed parsing
  static generateSequentialDate(
    baseDate: Date,
    index: number,
    intervalMinutes: number = 1,
  ): string {
    const sequentialDate = new Date(
      baseDate.getTime() + index * intervalMinutes * 60 * 1000,
    );
    return sequentialDate.toISOString();
  }

  // Validate and sanitize a date string
  static validateDate(dateString: string): {
    isValid: boolean;
    date?: Date;
    error?: string;
  } {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return { isValid: false, error: "Invalid date format" };
      }

      const year = date.getFullYear();
      if (year < 1970 || year > 2100) {
        return {
          isValid: false,
          error: "Date outside valid range (1970-2100)",
        };
      }

      return { isValid: true, date };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Format date for display
  static formatForDisplay(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isValid(date)) {
        return format(date, "MMM d, yyyy h:mm a");
      }
    } catch (error) {
      console.error("Date formatting error:", error);
    }
    return "Invalid Date";
  }

  // Check if dates need validation (many failed parses or duplicates)
  static analyzeDateParsingResults(
    messages: Array<{
      timestamp: string;
      metadata?: { parseSuccess?: boolean };
    }>,
  ): {
    needsValidation: boolean;
    failedParses: number;
    duplicates: number;
    currentDateIssues: number;
  } {
    const failedParses = messages.filter(
      (msg) => !msg.metadata?.parseSuccess,
    ).length;

    const timestamps = messages.map((m) => m.timestamp);
    const uniqueTimestamps = new Set(timestamps);
    const duplicates = timestamps.length - uniqueTimestamps.size;

    const currentYear = new Date().getFullYear();
    const currentDateIssues = messages.filter((msg) => {
      const msgYear = new Date(msg.timestamp).getFullYear();
      return msgYear === currentYear;
    }).length;

    const needsValidation =
      failedParses > 0 ||
      duplicates > messages.length * 0.1 ||
      currentDateIssues > messages.length * 0.5;

    return {
      needsValidation,
      failedParses,
      duplicates,
      currentDateIssues,
    };
  }
}
