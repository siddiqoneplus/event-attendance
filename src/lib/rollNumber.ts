/**
 * Roll Number Utility — Single source of truth for admission-year extraction
 * and student year calculation.
 *
 * Formula: studentYear = currentAcademicYear - admissionYear + 1
 *
 * Examples (currentAcademicYear = 2026):
 *   23A81A0501 → admissionYear 2023 → 4th Year
 *   24A81A4401 → admissionYear 2024 → 3rd Year
 *   25A81A4401 → admissionYear 2025 → 2nd Year
 *   26A81A4401 → admissionYear 2026 → 1st Year
 */

export interface RollNumberConfig {
  pattern: string;         // Regex to validate roll numbers
  yearIndexStart: number;  // slice start (inclusive)
  yearIndexEnd: number;    // slice end   (exclusive)
  currentAcademicYear: number;
  maxYears: number;        // e.g. 4 for B.Tech
}

/** Default config — matches what is stored in MongoDB (rollNumberConfig) */
export const DEFAULT_CONFIG: RollNumberConfig = {
  pattern: '^\\d{2}[A-Z0-9]+$',
  yearIndexStart: 0,
  yearIndexEnd: 2,
  currentAcademicYear: new Date().getFullYear(),
  maxYears: 4,
};

/**
 * Validates a roll number against the configured regex.
 * Returns true if valid.
 */
export function isValidRollNumber(rollNumber: string, config: RollNumberConfig): boolean {
  try {
    return new RegExp(config.pattern).test(rollNumber.trim());
  } catch {
    return false;
  }
}

/**
 * Extracts the 2-digit year suffix from a roll number and converts it to
 * a full 4-digit admission year.
 *
 * e.g. "23A81A0501", start=0, end=2  →  "23"  →  2023
 * e.g. "24A81A4401", start=0, end=2  →  "24"  →  2024
 *
 * Returns null if the roll number is invalid or the extracted part is not numeric.
 */
export function extractAdmissionYear(
  rollNumber: string,
  config: RollNumberConfig
): number | null {
  if (!isValidRollNumber(rollNumber, config)) return null;

  const raw = rollNumber.trim().slice(config.yearIndexStart, config.yearIndexEnd);
  const twoDigit = parseInt(raw, 10);
  if (isNaN(twoDigit)) return null;

  // Convert 2-digit year to 4-digit: 23 → 2023, 99 → 1999, 00 → 2000
  return twoDigit <= 99 ? 2000 + twoDigit : twoDigit;
}

/**
 * Returns a proper ordinal string for a year number.
 * 1 → "1st Year", 2 → "2nd Year", 3 → "3rd Year", 4 → "4th Year"
 */
export function ordinalYear(year: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = year % 100;
  const ord = suffix[(v - 20) % 10] || suffix[v] || suffix[0];
  return `${year}${ord} Year`;
}

export interface StudentYearResult {
  valid: boolean;
  admissionYear: number | null;
  studentYear: number | null;
  label: string;   // human-readable result
  error?: string;
}

/**
 * Full pipeline: validate roll number → extract admission year →
 * calculate student year → apply max duration cap → return label.
 */
export function calculateStudentYear(
  rollNumber: string,
  config: RollNumberConfig
): StudentYearResult {
  if (!rollNumber || !rollNumber.trim()) {
    return { valid: false, admissionYear: null, studentYear: null, label: '-', error: 'Roll number is empty.' };
  }

  if (!isValidRollNumber(rollNumber, config)) {
    return { valid: false, admissionYear: null, studentYear: null, label: 'Invalid Roll Number', error: `Roll number does not match pattern: ${config.pattern}` };
  }

  const admissionYear = extractAdmissionYear(rollNumber, config);
  if (admissionYear === null) {
    return { valid: false, admissionYear: null, studentYear: null, label: 'Invalid Roll Number', error: 'Could not extract a numeric year from roll number.' };
  }

  // studentYear = currentAcademicYear - admissionYear + 1
  const studentYear = config.currentAcademicYear - admissionYear + 1;

  if (studentYear < 1) {
    return { valid: false, admissionYear, studentYear, label: 'Future / Invalid Admission Year', error: `Admission year ${admissionYear} is after the current academic year ${config.currentAcademicYear}.` };
  }

  if (studentYear > config.maxYears) {
    return { valid: true, admissionYear, studentYear, label: 'Graduated / Completed' };
  }

  return {
    valid: true,
    admissionYear,
    studentYear,
    label: ordinalYear(studentYear),
  };
}
