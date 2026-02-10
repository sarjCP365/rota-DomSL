/**
 * CarePoint 365 - Comprehensive Dummy Data Generator
 *
 * Generates realistic UK-based test data for domiciliary care and supported living.
 * Uses deterministic seeding for reproducible data during development.
 */

import { addDays, addWeeks, format, startOfWeek, subDays } from 'date-fns';
import type { StaffMember } from '@/api/dataverse/types';
import {
  ActivityCategory,
  AvailabilityType,
  CarePackageType,
  FundingType,
  GenderPreference,
  RelationshipStatus,
  VisitStatus,
  VisitType,
  type DomiciliaryServiceUser,
  type GeographicArea,
  type Round,
  type ServiceUserStaffRelationship,
  type StaffAvailability,
  type Visit,
  type VisitActivity,
} from '@/types/domiciliary';

// =============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================================================

/**
 * Creates a seeded random number generator for deterministic output
 */
function createSeededRandom(seed: number): () => number {
  let currentSeed = seed;
  return function () {
    currentSeed = (currentSeed * 16807) % 2147483647;
    return (currentSeed - 1) / 2147483646;
  };
}

// Global seeded random for consistency
const random = createSeededRandom(42);

/**
 * Pick a random item from an array
 */
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Pick N random items from an array
 */
function pickRandomN<T>(array: T[], n: number): T[] {
  const shuffled = [...array].sort(() => random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Generate a random number in range
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

// =============================================================================
// UK ADDRESS DATA
// =============================================================================

const UK_STREETS = [
  'Oak Lane',
  'High Street',
  'Church Road',
  'Mill Lane',
  'Station Road',
  'Park Avenue',
  'Victoria Road',
  'Manor Way',
  'Green Lane',
  'Elm Grove',
  'Riverside Drive',
  'The Crescent',
  'Maple Close',
  'Willow Court',
  'Cedar Drive',
  'Ash Road',
  'Birch Avenue',
  'Holly Lane',
  'Beech Walk',
  'Orchard Close',
];

const UK_TOWNS = [
  { name: 'Westminster', postcode: 'SW1A', lat: 51.4994, lng: -0.1276 },
  { name: 'Camden', postcode: 'NW1', lat: 51.5391, lng: -0.1426 },
  { name: 'Islington', postcode: 'N1', lat: 51.5362, lng: -0.1027 },
  { name: 'Hackney', postcode: 'E8', lat: 51.5454, lng: -0.0554 },
  { name: 'Southwark', postcode: 'SE1', lat: 51.5035, lng: -0.0876 },
  { name: 'Lambeth', postcode: 'SW9', lat: 51.4571, lng: -0.1230 },
  { name: 'Wandsworth', postcode: 'SW18', lat: 51.4571, lng: -0.1919 },
  { name: 'Hammersmith', postcode: 'W6', lat: 51.4927, lng: -0.2248 },
];

const UK_FIRST_NAMES_MALE = [
  'James',
  'John',
  'Robert',
  'Michael',
  'William',
  'David',
  'Richard',
  'Thomas',
  'George',
  'Edward',
  'Albert',
  'Harold',
  'Arthur',
  'Frederick',
  'Herbert',
];

const UK_FIRST_NAMES_FEMALE = [
  'Mary',
  'Elizabeth',
  'Dorothy',
  'Margaret',
  'Patricia',
  'Joan',
  'Barbara',
  'Joyce',
  'Doris',
  'Edith',
  'Florence',
  'Gladys',
  'Irene',
  'Jean',
  'Kathleen',
];

const UK_SURNAMES = [
  'Smith',
  'Jones',
  'Williams',
  'Brown',
  'Taylor',
  'Davies',
  'Wilson',
  'Evans',
  'Thomas',
  'Johnson',
  'Roberts',
  'Walker',
  'Wright',
  'Robinson',
  'Thompson',
  'White',
  'Hughes',
  'Edwards',
  'Green',
  'Hall',
];

const STAFF_FIRST_NAMES = [
  'Sarah',
  'Emma',
  'Lucy',
  'Hannah',
  'Sophie',
  'Charlotte',
  'Amy',
  'Lauren',
  'Jessica',
  'Olivia',
  'Michael',
  'Daniel',
  'James',
  'David',
  'Mark',
];

const JOB_TITLES = [
  'Senior Carer',
  'Care Assistant',
  'Support Worker',
  'Team Leader',
  'Care Coordinator',
];

const _CAPABILITIES = [
  'medication',
  'dementia',
  'moving_handling',
  'peg_feeding',
  'catheter_care',
  'stoma_care',
  'first_aid',
  'driving',
  'mental_health',
  'learning_disabilities',
];

// =============================================================================
// VISIT TIME SLOTS
// =============================================================================

const VISIT_TYPE_TIMES: Record<VisitType, { start: string; end: string; duration: number }[]> = {
  [VisitType.Morning]: [
    { start: '07:00', end: '07:45', duration: 45 },
    { start: '07:30', end: '08:15', duration: 45 },
    { start: '08:00', end: '08:45', duration: 45 },
    { start: '08:30', end: '09:15', duration: 45 },
    { start: '09:00', end: '10:00', duration: 60 },
  ],
  [VisitType.Lunch]: [
    { start: '12:00', end: '12:30', duration: 30 },
    { start: '12:00', end: '12:45', duration: 45 },
    { start: '12:30', end: '13:15', duration: 45 },
  ],
  [VisitType.Afternoon]: [
    { start: '14:00', end: '14:45', duration: 45 },
    { start: '15:00', end: '15:30', duration: 30 },
    { start: '15:30', end: '16:15', duration: 45 },
  ],
  [VisitType.Tea]: [
    { start: '16:00', end: '16:30', duration: 30 },
    { start: '16:30', end: '17:15', duration: 45 },
    { start: '17:00', end: '17:30', duration: 30 },
  ],
  [VisitType.Evening]: [
    { start: '18:00', end: '18:45', duration: 45 },
    { start: '18:30', end: '19:15', duration: 45 },
    { start: '19:00', end: '19:45', duration: 45 },
  ],
  [VisitType.Bedtime]: [
    { start: '20:00', end: '20:45', duration: 45 },
    { start: '21:00', end: '21:45', duration: 45 },
    { start: '21:30', end: '22:15', duration: 45 },
  ],
  [VisitType.Night]: [
    { start: '22:00', end: '06:00', duration: 480 },
    { start: '23:00', end: '07:00', duration: 480 },
  ],
  [VisitType.WakingNight]: [{ start: '22:00', end: '06:00', duration: 480 }],
  [VisitType.SleepIn]: [{ start: '21:00', end: '07:00', duration: 600 }],
  [VisitType.Emergency]: [
    { start: '10:00', end: '11:00', duration: 60 },
    { start: '14:00', end: '15:00', duration: 60 },
  ],
  [VisitType.Assessment]: [
    { start: '10:00', end: '11:30', duration: 90 },
    { start: '14:00', end: '15:30', duration: 90 },
  ],
  [VisitType.Review]: [
    { start: '10:00', end: '10:45', duration: 45 },
    { start: '14:00', end: '14:45', duration: 45 },
  ],
};

// Activity templates by visit type
const ACTIVITY_TEMPLATES: Record<VisitType, { name: string; category: ActivityCategory; required: boolean }[]> = {
  [VisitType.Morning]: [
    { name: 'Personal care - washing & dressing', category: ActivityCategory.PersonalCare, required: true },
    { name: 'Medication - morning tablets', category: ActivityCategory.Medication, required: true },
    { name: 'Breakfast - prepare and serve', category: ActivityCategory.MealPreparation, required: false },
    { name: 'Mobility check', category: ActivityCategory.Mobility, required: false },
  ],
  [VisitType.Lunch]: [
    { name: 'Lunch preparation', category: ActivityCategory.MealPreparation, required: true },
    { name: 'Medication - lunchtime', category: ActivityCategory.Medication, required: false },
    { name: 'Welfare check', category: ActivityCategory.HealthMonitoring, required: false },
  ],
  [VisitType.Afternoon]: [
    { name: 'Companionship visit', category: ActivityCategory.Companionship, required: true },
    { name: 'Light domestic tasks', category: ActivityCategory.Domestic, required: false },
    { name: 'Medication check', category: ActivityCategory.Medication, required: false },
  ],
  [VisitType.Tea]: [
    { name: 'Tea/snack preparation', category: ActivityCategory.MealPreparation, required: true },
    { name: 'Personal care assistance', category: ActivityCategory.PersonalCare, required: false },
    { name: 'Medication - teatime', category: ActivityCategory.Medication, required: false },
  ],
  [VisitType.Evening]: [
    { name: 'Evening meal preparation', category: ActivityCategory.MealPreparation, required: true },
    { name: 'Medication - evening', category: ActivityCategory.Medication, required: true },
    { name: 'Personal care', category: ActivityCategory.PersonalCare, required: false },
  ],
  [VisitType.Bedtime]: [
    { name: 'Personal care - prepare for bed', category: ActivityCategory.PersonalCare, required: true },
    { name: 'Medication - bedtime', category: ActivityCategory.Medication, required: true },
    { name: 'Supper/drink preparation', category: ActivityCategory.MealPreparation, required: false },
    { name: 'Safety check - doors/windows', category: ActivityCategory.HealthMonitoring, required: true },
  ],
  [VisitType.Night]: [
    { name: 'Night care support', category: ActivityCategory.PersonalCare, required: true },
    { name: 'Regular welfare checks', category: ActivityCategory.NightCheck, required: true },
  ],
  [VisitType.WakingNight]: [
    { name: 'Waking night support', category: ActivityCategory.PersonalCare, required: true },
    { name: 'Welfare checks', category: ActivityCategory.NightCheck, required: true },
    { name: 'Personal care as required', category: ActivityCategory.PersonalCare, required: false },
  ],
  [VisitType.SleepIn]: [
    { name: 'Sleep-in care support', category: ActivityCategory.PersonalCare, required: true },
    { name: 'Emergency response available', category: ActivityCategory.Other, required: true },
  ],
  [VisitType.Emergency]: [
    { name: 'Emergency welfare check', category: ActivityCategory.HealthMonitoring, required: true },
    { name: 'Personal care assistance', category: ActivityCategory.PersonalCare, required: false },
  ],
  [VisitType.Assessment]: [
    { name: 'Initial assessment', category: ActivityCategory.HealthMonitoring, required: true },
    { name: 'Care plan review', category: ActivityCategory.Other, required: true },
  ],
  [VisitType.Review]: [
    { name: 'Care review meeting', category: ActivityCategory.Other, required: true },
    { name: 'Documentation update', category: ActivityCategory.Other, required: false },
  ],
};

// =============================================================================
// DATA GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate a UUID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a UK address with coordinates
 */
function generateAddress(): {
  address: string;
  postcode: string;
  lat: number;
  lng: number;
  town: string;
} {
  const houseNumber = randomInRange(1, 150);
  const street = pickRandom(UK_STREETS);
  const town = pickRandom(UK_TOWNS);

  // Add some variance to coordinates (roughly within 1km)
  const latVariance = (random() - 0.5) * 0.02;
  const lngVariance = (random() - 0.5) * 0.02;

  return {
    address: `${houseNumber} ${street}`,
    postcode: `${town.postcode} ${randomInRange(1, 9)}${pickRandom(['AA', 'AB', 'BA', 'BB', 'CA', 'CB'])}`,
    lat: town.lat + latVariance,
    lng: town.lng + lngVariance,
    town: town.name,
  };
}

/**
 * Generate dummy service users
 */
function generateServiceUsers(count: number): DomiciliaryServiceUser[] {
  const serviceUsers: DomiciliaryServiceUser[] = [];

  for (let i = 0; i < count; i++) {
    const isFemale = random() > 0.45; // Slight bias towards female (common in care)
    const firstName = isFemale
      ? pickRandom(UK_FIRST_NAMES_FEMALE)
      : pickRandom(UK_FIRST_NAMES_MALE);
    const surname = pickRandom(UK_SURNAMES);
    const address = generateAddress();

    // Generate DOB for elderly person (65-95 years old)
    const age = randomInRange(65, 95);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(randomInRange(0, 11));
    dob.setDate(randomInRange(1, 28));

    serviceUsers.push({
      cp365_serviceuserid: generateId(),
      cp365_fullname: `${firstName} ${surname}`,
      cp365_preferredname: random() > 0.7 ? firstName.substring(0, 3) : undefined,
      cp365_dateofbirth: format(dob, 'yyyy-MM-dd'),
      cp365_currentaddress: `${address.address}, ${address.town}`,
      cp365_postcode: address.postcode,
      cp365_latitude: address.lat,
      cp365_longitude: address.lng,
      cp365_fundingtype: pickRandom([
        FundingType.LocalAuthority,
        FundingType.LocalAuthority,
        FundingType.NhsChc,
        FundingType.Private,
        FundingType.Mixed,
      ]),
      cp365_weeklyfundedhours: pickRandom([7, 10.5, 14, 17.5, 21, 28, 35]),
      cp365_careplannotes: `Care plan for ${firstName}. ${random() > 0.5 ? 'Requires assistance with mobility.' : ''} ${random() > 0.6 ? 'Has hearing impairment.' : ''} ${random() > 0.7 ? 'Diabetic - monitor blood sugar.' : ''}`.trim(),
      cp365_carepackagetype: pickRandom([
        CarePackageType.Domiciliary,
        CarePackageType.Domiciliary,
        CarePackageType.SupportedLiving,
      ]),
      cp365_preferredgender: pickRandom([
        GenderPreference.NoPreference,
        GenderPreference.NoPreference,
        GenderPreference.Female,
        GenderPreference.Male,
      ]),
      cp365_keysafelocation:
        random() > 0.4 ? `Key safe by ${pickRandom(['front door', 'back door', 'side gate'])}. Code: ${randomInRange(1000, 9999)}` : undefined,
      cp365_accessnotes:
        random() > 0.5 ? pickRandom(['Ring bell twice', 'Use side entrance', 'Knock loudly - hard of hearing', 'Wait for response - slow mobility']) : undefined,
      cp365_phonenumber: `07${randomInRange(100, 999)} ${randomInRange(100, 999)} ${randomInRange(100, 999)}`,
      cp365_emergencycontactname: `${pickRandom([...UK_FIRST_NAMES_MALE, ...UK_FIRST_NAMES_FEMALE])} ${surname}`,
      cp365_emergencycontactphone: `07${randomInRange(100, 999)} ${randomInRange(100, 999)} ${randomInRange(100, 999)}`,
      statecode: 0,
      cp365_admissiondate: format(subDays(new Date(), randomInRange(30, 365)), 'yyyy-MM-dd'),
    });
  }

  return serviceUsers;
}

/**
 * Generate dummy staff members
 */
function generateStaffMembers(count: number): StaffMember[] {
  const staffMembers: StaffMember[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = pickRandom(STAFF_FIRST_NAMES);
    const surname = pickRandom(UK_SURNAMES);
    const jobTitle = pickRandom(JOB_TITLES);

    staffMembers.push({
      cp365_staffmemberid: generateId(),
      cp365_staffmembername: `${firstName} ${surname}`,
      cp365_forename: firstName,
      cp365_surname: surname,
      cp365_staffnumber: `ST${String(i + 1).padStart(4, '0')}`,
      cp365_workemail: `${firstName.toLowerCase()}.${surname.toLowerCase()}@carepoint365.co.uk`,
      cp365_personalemail: null,
      cp365_personalmobile: `07${randomInRange(100, 999)} ${randomInRange(100, 999)} ${randomInRange(100, 999)}`,
      cp365_workmobile: null,
      cp365_dateofbirth: null,
      cp365_staffstatus: 1, // Active
      cp365_agencyworker: 0, // Not agency
      cp365_jobtitle: jobTitle,
      cp365_contractedhours: pickRandom([16, 24, 32, 37.5, 40]),
      _cp365_defaultlocation_value: null,
      _cp365_linemanager_value: null,
      _cp365_useraccount_value: null,
      _cp365_gender_value: null,
      _cp365_title_value: null,
    });
  }

  return staffMembers;
}

/**
 * Generate staff availability patterns
 */
function generateStaffAvailability(staffMembers: StaffMember[]): StaffAvailability[] {
  const availability: StaffAvailability[] = [];

  for (const staff of staffMembers) {
    // Each staff has different availability patterns
    const worksDays = randomInRange(4, 6);
    const availableDays = pickRandomN([1, 2, 3, 4, 5, 6, 7], worksDays);

    for (const dayOfWeek of availableDays) {
      // Generate 1-2 availability slots per day
      const isFullDay = random() > 0.3;

      if (isFullDay) {
        // Full day availability
        const startHour = pickRandom([6, 7, 8]);
        const endHour = pickRandom([18, 19, 20, 21]);

        availability.push({
          cp365_staffavailabilityid: generateId(),
          cp365_staffmemberid: staff.cp365_staffmemberid,
          cp365_dayofweek: dayOfWeek,
          cp365_availablefrom: `${String(startHour).padStart(2, '0')}:00`,
          cp365_availableto: `${String(endHour).padStart(2, '0')}:00`,
          cp365_availabilitytype: random() > 0.7 ? AvailabilityType.Preferred : AvailabilityType.Available,
          cp365_ispreferredtime: random() > 0.7,
          cp365_isrecurring: true,
          cp365_effectivefrom: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          statecode: 0,
        });
      } else {
        // Split shift - morning and evening
        availability.push({
          cp365_staffavailabilityid: generateId(),
          cp365_staffmemberid: staff.cp365_staffmemberid,
          cp365_dayofweek: dayOfWeek,
          cp365_availablefrom: '07:00',
          cp365_availableto: '14:00',
          cp365_availabilitytype: AvailabilityType.Available,
          cp365_ispreferredtime: false,
          cp365_isrecurring: true,
          cp365_effectivefrom: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          statecode: 0,
        });

        availability.push({
          cp365_staffavailabilityid: generateId(),
          cp365_staffmemberid: staff.cp365_staffmemberid,
          cp365_dayofweek: dayOfWeek,
          cp365_availablefrom: '17:00',
          cp365_availableto: '22:00',
          cp365_availabilitytype: AvailabilityType.Available,
          cp365_ispreferredtime: false,
          cp365_isrecurring: true,
          cp365_effectivefrom: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
          statecode: 0,
        });
      }
    }
  }

  return availability;
}

/**
 * Generate visits for service users
 */
function generateVisits(
  serviceUsers: DomiciliaryServiceUser[],
  staffMembers: StaffMember[],
  weeksAhead: number = 2,
  weeksBehind: number = 2
): { visits: Visit[]; activities: VisitActivity[] } {
  const visits: Visit[] = [];
  const activities: VisitActivity[] = [];

  const today = new Date();
  const startDate = startOfWeek(subDays(today, weeksBehind * 7), { weekStartsOn: 1 });
  const endDate = addWeeks(startDate, weeksAhead + weeksBehind);
  
  console.log('📅 Visit generation date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
  console.log('📅 Today is:', format(today, 'yyyy-MM-dd'));

  // Determine visit patterns for each service user
  for (const serviceUser of serviceUsers) {
    // Determine how many visits per day this service user needs (based on funded hours)
    const weeklyHours = serviceUser.cp365_weeklyfundedhours || 14;
    const avgVisitsPerDay = Math.ceil(weeklyHours / 7 / 0.75); // Assume avg 45min visits

    // Common visit types for this service user
    const visitTypes: VisitType[] = [];
    if (avgVisitsPerDay >= 1) visitTypes.push(VisitType.Morning);
    if (avgVisitsPerDay >= 2) visitTypes.push(VisitType.Evening);
    if (avgVisitsPerDay >= 3) visitTypes.push(VisitType.Lunch);
    if (avgVisitsPerDay >= 4) visitTypes.push(VisitType.Bedtime);

    // Preferred staff (1-3 carers who usually visit)
    const preferredStaff = pickRandomN(staffMembers, randomInRange(1, 3));

    // Generate visits for each day
    let currentDate = startDate;
    while (currentDate < endDate) {
      for (const visitType of visitTypes) {
        // Skip some days randomly (not everyone has visits every day)
        if (random() > 0.85) continue;

        const timeSlot = pickRandom(VISIT_TYPE_TIMES[visitType]);
        const visitId = generateId();
        const isPastDate = currentDate < today;
        const isToday = format(currentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

        // Determine status based on date
        let status: VisitStatus;
        let assignedStaff: StaffMember | undefined;

        if (isPastDate) {
          // Past visits should be completed or missed
          status = random() > 0.05 ? VisitStatus.Completed : VisitStatus.Missed;
          assignedStaff = pickRandom(preferredStaff);
        } else if (isToday) {
          // Today's visits vary
          const hour = parseInt(timeSlot.start.split(':')[0]);
          if (hour < new Date().getHours()) {
            status = random() > 0.1 ? VisitStatus.Completed : VisitStatus.InProgress;
            assignedStaff = pickRandom(preferredStaff);
          } else {
            status = random() > 0.15 ? VisitStatus.Assigned : VisitStatus.Scheduled;
            assignedStaff = status === VisitStatus.Assigned ? pickRandom(preferredStaff) : undefined;
          }
        } else {
          // Future visits - mix of assigned and unassigned
          const assignmentChance = random();
          if (assignmentChance > 0.25) {
            status = VisitStatus.Assigned;
            assignedStaff = pickRandom(preferredStaff);
          } else {
            status = VisitStatus.Scheduled;
            assignedStaff = undefined;
          }
        }

        const visit: Visit = {
          cp365_visitid: visitId,
          cp365_visitname: `${serviceUser.cp365_fullname} - ${getVisitTypeName(visitType)}`,
          cp365_serviceuserid: serviceUser.cp365_serviceuserid,
          cp365_serviceuser: serviceUser,
          cp365_visitdate: format(currentDate, 'yyyy-MM-dd'),
          cp365_scheduledstarttime: timeSlot.start,
          cp365_scheduledendtime: timeSlot.end,
          cp365_durationminutes: timeSlot.duration,
          cp365_staffmemberid: assignedStaff?.cp365_staffmemberid,
          cp365_staffmember: assignedStaff,
          cp365_visitstatus: status,
          cp365_visittypecode: visitType,
          cp365_isrecurring: true,
          statecode: 0,
          createdon: format(subDays(currentDate, randomInRange(7, 30)), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          modifiedon: format(subDays(currentDate, randomInRange(1, 7)), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        };

        // Add check-in/out data for completed visits
        if (status === VisitStatus.Completed || status === VisitStatus.InProgress) {
          const [startHour, startMin] = timeSlot.start.split(':').map(Number);
          const variance = randomInRange(-5, 10); // Can be up to 5 min early or 10 min late
          visit.cp365_actualstarttime = `${String(startHour).padStart(2, '0')}:${String(Math.max(0, startMin + variance)).padStart(2, '0')}`;

          if (status === VisitStatus.Completed) {
            const [endHour, endMin] = timeSlot.end.split(':').map(Number);
            const endVariance = randomInRange(-5, 15);
            visit.cp365_actualendtime = `${String(endHour).padStart(2, '0')}:${String(Math.max(0, endMin + endVariance)).padStart(2, '0')}`;
          }

          visit.cp365_checkinlatitude = serviceUser.cp365_latitude;
          visit.cp365_checkinlongitude = serviceUser.cp365_longitude;
        }

        visits.push(visit);

        // Generate activities for this visit
        const activityTemplates = ACTIVITY_TEMPLATES[visitType] || [];
        activityTemplates.forEach((template, index) => {
          const isCompleted = status === VisitStatus.Completed || (status === VisitStatus.InProgress && random() > 0.5);

          activities.push({
            cp365_visitactivityid: generateId(),
            cp365_visitid: visitId,
            cp365_activityname: template.name,
            cp365_activitycategorycode: template.category,
            cp365_iscompleted: isCompleted,
            cp365_completedtime: isCompleted ? format(currentDate, "yyyy-MM-dd'T'HH:mm:ss'Z'") : undefined,
            cp365_isrequired: template.required,
            cp365_estimatedminutes: pickRandom([10, 15, 20, 25]),
            cp365_requirestwocarer: template.category === ActivityCategory.Mobility && random() > 0.8,
            cp365_displayorder: index + 1,
            statecode: 0,
          });
        });
      }

      currentDate = addDays(currentDate, 1);
    }
  }

  return { visits, activities };
}

/**
 * Generate service user - staff relationships
 */
function generateRelationships(
  serviceUsers: DomiciliaryServiceUser[],
  staffMembers: StaffMember[],
  visits: Visit[]
): ServiceUserStaffRelationship[] {
  const relationships: ServiceUserStaffRelationship[] = [];

  for (const serviceUser of serviceUsers) {
    // Get all staff who have visited this service user
    const serviceUserVisits = visits.filter(v => v.cp365_serviceuserid === serviceUser.cp365_serviceuserid);
    const staffWhoVisited = new Set(serviceUserVisits.map(v => v.cp365_staffmemberid).filter(Boolean));

    for (const staffId of staffWhoVisited) {
      const staff = staffMembers.find(s => s.cp365_staffmemberid === staffId);
      if (!staff) continue;

      const staffVisits = serviceUserVisits.filter(v => v.cp365_staffmemberid === staffId);
      const completedVisits = staffVisits.filter(v => v.cp365_visitstatus === VisitStatus.Completed);

      const isPreferred = random() > 0.7 && completedVisits.length > 5;
      const isExcluded = random() > 0.95;

      relationships.push({
        cp365_relationshipid: generateId(),
        cp365_serviceuserid: serviceUser.cp365_serviceuserid,
        cp365_staffmemberid: staffId!,
        cp365_relationshipstatus: isExcluded
          ? RelationshipStatus.Excluded
          : isPreferred
            ? RelationshipStatus.Preferred
            : RelationshipStatus.Active,
        cp365_ispreferredcarer: isPreferred,
        cp365_isexcluded: isExcluded,
        cp365_exclusionreason: isExcluded ? pickRandom(['Personality clash', 'Service user request', 'Schedule conflict']) : undefined,
        cp365_firstvisitdate: staffVisits[0]?.cp365_visitdate,
        cp365_lastvisitdate: staffVisits[staffVisits.length - 1]?.cp365_visitdate,
        cp365_totalvisits: completedVisits.length,
        cp365_continuityscore: Math.min(100, completedVisits.length * 5 + randomInRange(0, 20)),
        statecode: 0,
      });
    }
  }

  return relationships;
}

/**
 * Generate rounds (geographic groupings)
 */
function generateRounds(visits: Visit[], staffMembers: StaffMember[]): Round[] {
  const rounds: Round[] = [];

  // Group visits by date and type
  const visitsByDateAndType = new Map<string, Visit[]>();
  for (const visit of visits) {
    const key = `${visit.cp365_visitdate}-${visit.cp365_visittypecode}`;
    if (!visitsByDateAndType.has(key)) {
      visitsByDateAndType.set(key, []);
    }
    visitsByDateAndType.get(key)!.push(visit);
  }

  // Create rounds for each group
  for (const [key, groupVisits] of visitsByDateAndType) {
    if (groupVisits.length < 2) continue;

    const [_date, typeStr] = key.split('-');
    const visitType = parseInt(typeStr) as VisitType;

    // Split into rounds of 3-5 visits each
    const roundSize = randomInRange(3, 5);
    for (let i = 0; i < groupVisits.length; i += roundSize) {
      const roundVisits = groupVisits.slice(i, i + roundSize);
      if (roundVisits.length < 2) continue;

      // Try to assign a staff member who is assigned to most visits in this round
      const staffCounts = new Map<string, number>();
      for (const visit of roundVisits) {
        if (visit.cp365_staffmemberid) {
          staffCounts.set(visit.cp365_staffmemberid, (staffCounts.get(visit.cp365_staffmemberid) || 0) + 1);
        }
      }

      let assignedStaffId: string | undefined;
      let maxCount = 0;
      for (const [staffId, count] of staffCounts) {
        if (count > maxCount) {
          maxCount = count;
          assignedStaffId = staffId;
        }
      }

      const firstVisit = roundVisits[0];
      const lastVisit = roundVisits[roundVisits.length - 1];

      rounds.push({
        cp365_roundid: generateId(),
        cp365_roundname: `${getVisitTypeName(visitType)} Round ${String.fromCharCode(65 + (rounds.length % 26))}`,
        cp365_roundtype: visitType,
        cp365_starttime: firstVisit.cp365_scheduledstarttime,
        cp365_endtime: lastVisit.cp365_scheduledendtime,
        cp365_staffmemberid: assignedStaffId,
        cp365_staffmember: staffMembers.find(s => s.cp365_staffmemberid === assignedStaffId),
        cp365_istemplate: false,
        cp365_estimatedtravelminutes: roundVisits.length * randomInRange(5, 15),
        cp365_visitcount: roundVisits.length,
        cp365_totaldurationminutes: roundVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0),
        statecode: 0,
        visits: roundVisits,
      });
    }
  }

  return rounds;
}

/**
 * Generate geographic areas
 */
function generateGeographicAreas(): GeographicArea[] {
  return UK_TOWNS.map((town, index) => ({
    cp365_areaid: generateId(),
    cp365_areaname: town.name,
    cp365_postcodeprefix: town.postcode,
    cp365_centerlatitude: town.lat,
    cp365_centerlongitude: town.lng,
    cp365_radiusmiles: 2,
    cp365_colour: `#${['3B82F6', 'EF4444', '10B981', 'F59E0B', '8B5CF6', 'EC4899', '06B6D4', '84CC16'][index % 8]}`,
    statecode: 0,
  }));
}

/**
 * Helper function to get visit type display name
 */
function getVisitTypeName(type: VisitType): string {
  const names: Record<VisitType, string> = {
    [VisitType.Morning]: 'Morning',
    [VisitType.Lunch]: 'Lunch',
    [VisitType.Afternoon]: 'Afternoon',
    [VisitType.Tea]: 'Tea',
    [VisitType.Evening]: 'Evening',
    [VisitType.Bedtime]: 'Bedtime',
    [VisitType.Night]: 'Night',
    [VisitType.WakingNight]: 'Waking Night',
    [VisitType.SleepIn]: 'Sleep In',
    [VisitType.Emergency]: 'Emergency',
    [VisitType.Assessment]: 'Assessment',
    [VisitType.Review]: 'Review',
  };
  return names[type];
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export interface DummyDataSet {
  serviceUsers: DomiciliaryServiceUser[];
  staffMembers: StaffMember[];
  visits: Visit[];
  activities: VisitActivity[];
  availability: StaffAvailability[];
  relationships: ServiceUserStaffRelationship[];
  rounds: Round[];
  areas: GeographicArea[];
}

/**
 * Generate a complete set of dummy data for testing
 */
export async function generateDummyData(): Promise<DummyDataSet> {
  console.log('Generating dummy data...');

  // Generate base entities
  const serviceUsers = generateServiceUsers(18);
  const staffMembers = generateStaffMembers(12);

  // Generate availability
  const availability = generateStaffAvailability(staffMembers);

  // Generate visits and activities
  const { visits, activities } = generateVisits(serviceUsers, staffMembers, 2, 2);

  // Generate relationships based on visit history
  const relationships = generateRelationships(serviceUsers, staffMembers, visits);

  // Generate rounds
  const rounds = generateRounds(visits, staffMembers);

  // Generate geographic areas
  const areas = generateGeographicAreas();

  console.log(`Generated:
  - ${serviceUsers.length} service users
  - ${staffMembers.length} staff members
  - ${visits.length} visits
  - ${activities.length} activities
  - ${availability.length} availability records
  - ${relationships.length} relationships
  - ${rounds.length} rounds
  - ${areas.length} geographic areas`);

  return {
    serviceUsers,
    staffMembers,
    visits,
    activities,
    availability,
    relationships,
    rounds,
    areas,
  };
}

// Use global window object to ensure singleton across module reloads (HMR)
declare global {
  interface Window {
    __CAREPOINT_DUMMY_DATA__?: DummyDataSet;
    __CAREPOINT_DUMMY_DATA_PROMISE__?: Promise<DummyDataSet>;
  }
}

/**
 * Get dummy data (cached for performance)
 * Uses window global to survive HMR reloads
 */
export async function getDummyData(): Promise<DummyDataSet> {
  // Return cached data if available
  if (typeof window !== 'undefined' && window.__CAREPOINT_DUMMY_DATA__) {
    return window.__CAREPOINT_DUMMY_DATA__;
  }
  
  // Return in-progress promise if already generating
  if (typeof window !== 'undefined' && window.__CAREPOINT_DUMMY_DATA_PROMISE__) {
    return window.__CAREPOINT_DUMMY_DATA_PROMISE__;
  }
  
  // Generate new data
  const promise = generateDummyData();
  
  if (typeof window !== 'undefined') {
    window.__CAREPOINT_DUMMY_DATA_PROMISE__ = promise;
    promise.then(data => {
      window.__CAREPOINT_DUMMY_DATA__ = data;
      window.__CAREPOINT_DUMMY_DATA_PROMISE__ = undefined;
    });
  }
  
  return promise;
}

/**
 * Clear cached dummy data (useful for testing)
 */
export function clearDummyDataCache(): void {
  if (typeof window !== 'undefined') {
    window.__CAREPOINT_DUMMY_DATA__ = undefined;
    window.__CAREPOINT_DUMMY_DATA_PROMISE__ = undefined;
  }
}
