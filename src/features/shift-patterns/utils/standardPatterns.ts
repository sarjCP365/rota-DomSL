/**
 * CarePoint 365 - Standard Pattern Templates
 * Pre-configured shift patterns commonly used in UK care sector settings
 * 
 * These patterns are marked with cp365_sp_isstandardtemplate = true
 * and can be used as starting points for creating custom patterns.
 */

import type { PatternFormData, PatternDayFormData } from '../types';
import {
  DayOfWeek,
  PatternPublishStatus,
  GenerationWindow,
  PatternStatus,
} from '../types';
import {
  createPatternTemplate,
  bulkCreatePatternDays,
  fetchPatternTemplates,
  updatePatternTemplate,
} from '../api/patternTemplates';

// =============================================================================
// STANDARD PATTERN DEFINITIONS
// =============================================================================

/**
 * Standard Days Pattern (37.5 hours)
 * Monday to Friday, 09:00-17:00 with 30-minute break
 * Typically used for administrative, management, and support roles
 */
const standardDaysPattern: PatternFormData = {
  name: 'Standard Days (Mon-Fri)',
  description: 'Monday to Friday, 09:00-17:00 with 30-minute unpaid break. Typically used for administrative, management, and support roles. 37.5 hours per week.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    // Week 1 - Working days (Mon-Fri)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    // Week 1 - Rest days (Sat-Sun)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * 4-on-4-off Day Shifts Pattern (42 hours average)
 * Four consecutive 12-hour day shifts followed by four days off
 * Popular for care staff providing continuity of care
 */
const fourOnFourOffDaysPattern: PatternFormData = {
  name: '4-on-4-off Day Shifts',
  description: 'Four consecutive 12-hour day shifts (08:00-20:00) followed by four days off. 48 hours in week 1, 36 hours in week 2. Popular for care staff providing continuity of care.',
  rotationCycleWeeks: 2,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    // Week 1 - Working days (Mon-Thu)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    // Week 1 - Rest days (Fri-Sun)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
    // Week 2 - Rest days (Mon-Thu)
    { weekNumber: 2, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    // Week 2 - Working days (Fri-Sun)
    { weekNumber: 2, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Sunday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
  ],
};

/**
 * 4-on-4-off Night Shifts Pattern (42 hours average)
 * Four consecutive 12-hour night shifts followed by four days off
 * Same rotation as day shifts but 20:00-08:00 with overnight flag
 */
const fourOnFourOffNightsPattern: PatternFormData = {
  name: '4-on-4-off Night Shifts',
  description: 'Four consecutive 12-hour night shifts (20:00-08:00) followed by four days off. 48 hours in week 1, 36 hours in week 2. Designed for night staff in 24-hour care settings.',
  rotationCycleWeeks: 2,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    // Week 1 - Working nights (Mon-Thu, starting at night)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    // Week 1 - Rest days (Fri-Sun)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
    // Week 2 - Rest days (Mon-Thu)
    { weekNumber: 2, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    // Week 2 - Working nights (Fri-Sun)
    { weekNumber: 2, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Sunday, isRestDay: false, startTime: '20:00', endTime: '08:00', breakMinutes: 60, isOvernight: true },
  ],
};

/**
 * 3x12 Hour Shifts Pattern (36 hours)
 * Three 12-hour shifts per week on set days
 * Common for staff preferring longer shifts with more days off
 */
const threeByTwelvePattern: PatternFormData = {
  name: '3x12 Hour Shifts',
  description: 'Three 12-hour shifts per week (08:00-20:00) on Monday, Tuesday, and Wednesday. 33 hours working time with breaks. Common for staff preferring longer shifts with more days off.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    // Working days (Mon-Wed)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    // Rest days (Thu-Sun)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * 2-Week Rotating Pattern (37.5 hours average)
 * Week 1: Mon, Tue, Sat, Sun
 * Week 2: Wed, Thu, Fri
 * Provides every-other-weekend off while maintaining coverage
 */
const twoWeekRotatingPattern: PatternFormData = {
  name: '2-Week Rotating',
  description: 'Week 1: Mon, Tue, Sat, Sun working. Week 2: Wed, Thu, Fri working. 8-hour shifts (08:00-16:00) with 30-minute break. Provides every-other-weekend off while maintaining coverage.',
  rotationCycleWeeks: 2,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    // Week 1 - Working days (Mon, Tue, Sat, Sun)
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    // Week 2 - Working days (Wed, Thu, Fri)
    { weekNumber: 2, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '08:00', endTime: '16:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * Continental Shift Pattern (42 hours average)
 * 4-week rotation with combination of day and night shifts
 * 2 days, 2 nights, 4 off pattern for 24/7 coverage
 */
const continentalShiftPattern: PatternFormData = {
  name: 'Continental Rotation',
  description: 'Complex 4-week rotation with 2 day shifts, 2 night shifts, then 4 days off. Day shifts 07:00-19:00, Night shifts 19:00-07:00. Designed for 24/7 coverage with adequate rest periods.',
  rotationCycleWeeks: 4,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.FourWeeks,
  isStandardTemplate: true,
  days: [
    // Week 1 - Days Mon-Tue, Nights Wed-Thu, Rest Fri-Sun
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
    // Week 2 - Rest Mon, Days Tue-Wed, Nights Thu-Fri, Rest Sat-Sun
    { weekNumber: 2, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 2, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
    // Week 3 - Rest Mon-Tue, Days Wed-Thu, Nights Fri-Sat, Rest Sun
    { weekNumber: 3, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 3, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
    // Week 4 - Rest Mon-Wed, Days Thu-Fri, Nights Sat-Sun
    { weekNumber: 4, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '07:00', endTime: '19:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
    { weekNumber: 4, dayOfWeek: DayOfWeek.Sunday, isRestDay: false, startTime: '19:00', endTime: '07:00', breakMinutes: 60, isOvernight: true },
  ],
};

/**
 * Part-Time 16 Hours Pattern
 * 2 x 8-hour shifts per week (Tue, Thu)
 * Common for part-time staff
 */
const partTime16HoursPattern: PatternFormData = {
  name: 'Part-Time 16 Hours',
  description: 'Two 8-hour shifts per week on Tuesday and Thursday (09:00-17:00). 15 hours working time with breaks. Suitable for part-time staff with fixed day availability.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * Part-Time 24 Hours Pattern
 * 3 x 8-hour shifts per week (Mon, Wed, Fri)
 * Common for part-time staff
 */
const partTime24HoursPattern: PatternFormData = {
  name: 'Part-Time 24 Hours',
  description: 'Three 8-hour shifts per week on Monday, Wednesday, and Friday (09:00-17:00). 22.5 hours working time with breaks. Suitable for part-time staff working alternate days.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '09:00', endTime: '17:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * Early Shifts Pattern (37.5 hours)
 * Monday to Friday, 07:00-15:00 with 30-minute break
 * For staff preferring early starts
 */
const earlyShiftsPattern: PatternFormData = {
  name: 'Early Shifts (Mon-Fri)',
  description: 'Monday to Friday, 07:00-15:00 with 30-minute unpaid break. 37.5 hours per week. Designed for staff who prefer early morning starts and early finishes.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '07:00', endTime: '15:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '07:00', endTime: '15:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '07:00', endTime: '15:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '07:00', endTime: '15:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '07:00', endTime: '15:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * Late Shifts Pattern (37.5 hours)
 * Monday to Friday, 14:00-22:00 with 30-minute break
 * For staff preferring later starts
 */
const lateShiftsPattern: PatternFormData = {
  name: 'Late Shifts (Mon-Fri)',
  description: 'Monday to Friday, 14:00-22:00 with 30-minute unpaid break. 37.5 hours per week. Designed for staff who prefer later starts and evening work.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: false, startTime: '14:00', endTime: '22:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: false, startTime: '14:00', endTime: '22:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: false, startTime: '14:00', endTime: '22:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: false, startTime: '14:00', endTime: '22:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: false, startTime: '14:00', endTime: '22:00', breakMinutes: 30, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: true, isOvernight: false },
  ],
};

/**
 * Weekend Worker Pattern (24 hours)
 * Saturday and Sunday 12-hour shifts
 * For staff who only work weekends
 */
const weekendWorkerPattern: PatternFormData = {
  name: 'Weekend Worker',
  description: 'Saturday and Sunday 12-hour shifts (08:00-20:00). 22 hours working time with breaks. Ideal for staff who only work weekends or as supplementary weekend cover.',
  rotationCycleWeeks: 1,
  defaultPublishStatus: PatternPublishStatus.Unpublished,
  generationWindowWeeks: GenerationWindow.TwoWeeks,
  isStandardTemplate: true,
  days: [
    { weekNumber: 1, dayOfWeek: DayOfWeek.Monday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Tuesday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Wednesday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Thursday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Friday, isRestDay: true, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Saturday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
    { weekNumber: 1, dayOfWeek: DayOfWeek.Sunday, isRestDay: false, startTime: '08:00', endTime: '20:00', breakMinutes: 60, isOvernight: false },
  ],
};

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Array of all standard pattern templates
 */
export const standardPatterns: PatternFormData[] = [
  standardDaysPattern,
  fourOnFourOffDaysPattern,
  fourOnFourOffNightsPattern,
  threeByTwelvePattern,
  twoWeekRotatingPattern,
  continentalShiftPattern,
  partTime16HoursPattern,
  partTime24HoursPattern,
  earlyShiftsPattern,
  lateShiftsPattern,
  weekendWorkerPattern,
];

/**
 * Pattern categories for grouping in the UI
 */
export const patternCategories = {
  fullTime: ['Standard Days (Mon-Fri)', 'Early Shifts (Mon-Fri)', 'Late Shifts (Mon-Fri)'],
  rotating: ['4-on-4-off Day Shifts', '4-on-4-off Night Shifts', '2-Week Rotating', 'Continental Rotation'],
  compressed: ['3x12 Hour Shifts'],
  partTime: ['Part-Time 16 Hours', 'Part-Time 24 Hours', 'Weekend Worker'],
};

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

/**
 * Check if standard patterns have already been seeded for a specific location
 * Returns the list of existing standard pattern names for that location
 * 
 * @param locationId - If provided, only checks for patterns at this location
 */
export async function checkStandardPatternsExist(locationId?: string): Promise<string[]> {
  try {
    console.log('[StandardPatterns] Checking for existing standard patterns for location:', locationId || 'all');
    
    const templates = await fetchPatternTemplates({
      type: 'standard',
      status: 'all', // Include inactive/archived
      locationId, // Filter by location if provided
    });

    const existingNames = templates.map((t) => t.cp365_name);
    console.log('[StandardPatterns] Found', existingNames.length, 'existing standard patterns for location:', locationId || 'all');
    
    return existingNames;
  } catch (error) {
    console.error('[StandardPatterns] Error checking existing patterns:', error);
    return [];
  }
}

/**
 * Seed standard patterns into Dataverse
 * Only creates patterns that don't already exist
 * 
 * @param options.skipExisting - If true, skip patterns that already exist (default: true)
 * @param options.updateExisting - If true, update existing patterns with new definitions (default: false)
 * @returns Summary of seeding operation
 */
export async function seedStandardPatterns(options?: {
  skipExisting?: boolean;
  updateExisting?: boolean;
  /** Location ID to assign to the created patterns */
  locationId?: string;
}): Promise<{
  created: string[];
  skipped: string[];
  updated: string[];
  errors: string[];
}> {
  const { skipExisting = true, updateExisting = false, locationId } = options || {};
  
  const result = {
    created: [] as string[],
    skipped: [] as string[],
    updated: [] as string[],
    errors: [] as string[],
  };

  console.log('[StandardPatterns] Starting seed operation for location:', locationId || 'unassigned');

  try {
    // Get existing standard patterns FOR THIS SPECIFIC LOCATION
    // This ensures patterns can be created per-location
    const existingNames = await checkStandardPatternsExist(locationId);
    const existingTemplates = await fetchPatternTemplates({ type: 'standard', locationId });
    const existingMap = new Map(existingTemplates.map((t) => [t.cp365_name, t]));

    for (const pattern of standardPatterns) {
      try {
        const exists = existingNames.includes(pattern.name);

        if (exists) {
          if (updateExisting) {
            // Update existing pattern
            const existingTemplate = existingMap.get(pattern.name);
            if (existingTemplate) {
              console.log(`[StandardPatterns] Updating "${pattern.name}"...`);
              await updatePatternTemplate(existingTemplate.cp365_shiftpatterntemplatenewid, {
                description: pattern.description,
                rotationCycleWeeks: pattern.rotationCycleWeeks,
                defaultPublishStatus: pattern.defaultPublishStatus,
                generationWindowWeeks: pattern.generationWindowWeeks,
              });
              
              // Also replace pattern days for existing patterns
              if (pattern.days.length > 0) {
                console.log(`[StandardPatterns] Replacing pattern days for "${pattern.name}"...`);
                try {
                  // Import replacePatternDays dynamically to avoid circular deps
                  const { replacePatternDays } = await import('../api/patternDays');
                  await replacePatternDays(
                    existingTemplate.cp365_shiftpatterntemplatenewid,
                    pattern.days
                  );
                  console.log(`[StandardPatterns] Replaced ${pattern.days.length} days for "${pattern.name}"`);
                } catch (dayError) {
                  console.error(`[StandardPatterns] Error replacing days for "${pattern.name}":`, dayError);
                  result.errors.push(`${pattern.name} days: ${dayError instanceof Error ? dayError.message : 'Unknown error'}`);
                }
              }
              
              result.updated.push(pattern.name);
            }
          } else if (skipExisting) {
            console.log(`[StandardPatterns] Skipping "${pattern.name}" (already exists)`);
            result.skipped.push(pattern.name);
          }
          continue;
        }

        // Create new pattern
        console.log(`[StandardPatterns] Creating "${pattern.name}" for location ${locationId || 'unassigned'}...`);
        
        const template = await createPatternTemplate({
          name: pattern.name,
          description: pattern.description,
          rotationCycleWeeks: pattern.rotationCycleWeeks,
          defaultPublishStatus: pattern.defaultPublishStatus,
          generationWindowWeeks: pattern.generationWindowWeeks,
          isStandardTemplate: true,
          locationId: locationId, // Assign to specific location if provided
          days: [], // Days created separately
        });

        // Create pattern days
        if (pattern.days.length > 0) {
          await bulkCreatePatternDays(
            template.cp365_shiftpatterntemplatenewid,
            pattern.days
          );
        }

        result.created.push(pattern.name);
        console.log(`[StandardPatterns] Created "${pattern.name}" with ${pattern.days.length} days`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[StandardPatterns] Error with "${pattern.name}":`, errorMessage);
        result.errors.push(`${pattern.name}: ${errorMessage}`);
      }
    }

    console.log('[StandardPatterns] Seed operation complete:', {
      created: result.created.length,
      skipped: result.skipped.length,
      updated: result.updated.length,
      errors: result.errors.length,
    });

    return result;
  } catch (error) {
    console.error('[StandardPatterns] Seed operation failed:', error);
    throw error;
  }
}

/**
 * Get a specific standard pattern by name
 */
export function getStandardPatternByName(name: string): PatternFormData | undefined {
  return standardPatterns.find((p) => p.name === name);
}

/**
 * Get standard patterns by category
 */
export function getStandardPatternsByCategory(category: keyof typeof patternCategories): PatternFormData[] {
  const names = patternCategories[category];
  return standardPatterns.filter((p) => names.includes(p.name));
}

/**
 * Calculate hours information for a pattern
 */
export function calculatePatternInfo(pattern: PatternFormData): {
  totalRotationHours: number;
  averageWeeklyHours: number;
  workingDays: number;
  restDays: number;
  dayShifts: number;
  nightShifts: number;
} {
  let totalMinutes = 0;
  let workingDays = 0;
  let restDays = 0;
  let dayShifts = 0;
  let nightShifts = 0;

  for (const day of pattern.days) {
    if (day.isRestDay) {
      restDays++;
      continue;
    }

    workingDays++;

    if (!day.startTime || !day.endTime) {
      continue;
    }

    // Categorise shift type
    const startHour = parseInt(day.startTime.split(':')[0], 10);
    if (startHour >= 18 || startHour < 6 || day.isOvernight) {
      nightShifts++;
    } else {
      dayShifts++;
    }

    // Calculate duration
    const startMinutes = parseTimeToMinutes(day.startTime);
    let endMinutes = parseTimeToMinutes(day.endTime);

    if (day.isOvernight || endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    let shiftMinutes = endMinutes - startMinutes;
    if (day.breakMinutes) {
      shiftMinutes -= day.breakMinutes;
    }

    totalMinutes += Math.max(0, shiftMinutes);
  }

  const totalRotationHours = Math.round((totalMinutes / 60) * 100) / 100;
  const averageWeeklyHours = pattern.rotationCycleWeeks > 0
    ? Math.round((totalRotationHours / pattern.rotationCycleWeeks) * 100) / 100
    : 0;

  return {
    totalRotationHours,
    averageWeeklyHours,
    workingDays,
    restDays,
    dayShifts,
    nightShifts,
  };
}

/**
 * Helper: Parse time string to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

