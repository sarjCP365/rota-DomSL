/**
 * Round Planning Service
 *
 * Provides geographic clustering, route optimization, and travel calculations
 * for domiciliary care visit rounds.
 */

import {
  VisitType,
  type Visit,
  type Round,
  type RoundWithStats,
  type RoundConstraints,
  type DomiciliaryServiceUser,
  type GeographicArea,
  type TravelEstimate,
} from '@/types/domiciliary';
import { getDummyData } from '@/data/dummyDataGenerator';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Average speed in miles per hour for travel estimation */
const AVERAGE_SPEED_MPH = 20;

/** Default round constraints */
export const DEFAULT_ROUND_CONSTRAINTS: RoundConstraints = {
  maxVisitsPerRound: 8,
  maxDurationMinutes: 240, // 4 hours
  maxTravelMinutes: 60,
  preferContinuity: true,
};

// =============================================================================
// DISTANCE CALCULATIONS
// =============================================================================

/**
 * Calculate Haversine distance between two coordinates in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time between two points
 */
export function estimateTravelTime(distanceMiles: number): number {
  // Simple estimation based on average speed
  return Math.round((distanceMiles / AVERAGE_SPEED_MPH) * 60);
}

// =============================================================================
// TRAVEL MATRIX
// =============================================================================

/**
 * Calculate travel estimates between all visits
 */
export function calculateTravelMatrix(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): Map<string, TravelEstimate> {
  const matrix = new Map<string, TravelEstimate>();

  for (let i = 0; i < visits.length; i++) {
    for (let j = 0; j < visits.length; j++) {
      if (i === j) continue;

      const fromVisit = visits[i];
      const toVisit = visits[j];
      const fromUser = serviceUsers.get(fromVisit.cp365_serviceuserid);
      const toUser = serviceUsers.get(toVisit.cp365_serviceuserid);

      if (!fromUser?.cp365_latitude || !fromUser?.cp365_longitude ||
          !toUser?.cp365_latitude || !toUser?.cp365_longitude) {
        continue;
      }

      const distanceMiles = calculateDistance(
        fromUser.cp365_latitude,
        fromUser.cp365_longitude,
        toUser.cp365_latitude,
        toUser.cp365_longitude
      );

      const key = `${fromVisit.cp365_visitid}->${toVisit.cp365_visitid}`;
      matrix.set(key, {
        fromVisitId: fromVisit.cp365_visitid,
        toVisitId: toVisit.cp365_visitid,
        distanceMiles,
        durationMinutes: estimateTravelTime(distanceMiles),
        mode: 'driving',
      });
    }
  }

  return matrix;
}

/**
 * Get travel estimate between two visits
 */
export function getTravelBetween(
  fromVisit: Visit,
  toVisit: Visit,
  serviceUsers: Map<string, DomiciliaryServiceUser>
): TravelEstimate | null {
  const fromUser = serviceUsers.get(fromVisit.cp365_serviceuserid);
  const toUser = serviceUsers.get(toVisit.cp365_serviceuserid);

  if (!fromUser?.cp365_latitude || !fromUser?.cp365_longitude ||
      !toUser?.cp365_latitude || !toUser?.cp365_longitude) {
    return null;
  }

  const distanceMiles = calculateDistance(
    fromUser.cp365_latitude,
    fromUser.cp365_longitude,
    toUser.cp365_latitude,
    toUser.cp365_longitude
  );

  return {
    fromVisitId: fromVisit.cp365_visitid,
    toVisitId: toVisit.cp365_visitid,
    distanceMiles,
    durationMinutes: estimateTravelTime(distanceMiles),
    mode: 'driving',
  };
}

// =============================================================================
// GEOGRAPHIC CLUSTERING
// =============================================================================

/**
 * Simple K-means clustering for grouping visits by location
 */
export function clusterVisitsByLocation(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>,
  numClusters: number = 3
): Visit[][] {
  console.warn(`🗺️ clusterVisitsByLocation: ${visits.length} visits, ${serviceUsers.size} service users, ${numClusters} clusters`);
  
  // Get visits with valid coordinates
  const visitsWithCoords = visits.filter(v => {
    const user = serviceUsers.get(v.cp365_serviceuserid);
    return user?.cp365_latitude && user?.cp365_longitude;
  });
  
  console.warn(`🗺️ Visits with valid coords: ${visitsWithCoords.length}/${visits.length}`);

  if (visitsWithCoords.length === 0) {
    console.warn(`🗺️ No visits have coordinates, returning all in single cluster`);
    return [visits];
  }
  if (visitsWithCoords.length <= numClusters) {
    return visitsWithCoords.map(v => [v]);
  }

  // Initialize centroids using first n visits
  const centroids: { lat: number; lng: number }[] = [];
  for (let i = 0; i < Math.min(numClusters, visitsWithCoords.length); i++) {
    const user = serviceUsers.get(visitsWithCoords[i].cp365_serviceuserid)!;
    centroids.push({ lat: user.cp365_latitude!, lng: user.cp365_longitude! });
  }

  // K-means iterations
  const maxIterations = 10;
  let clusters: Visit[][] = [];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Assign visits to nearest centroid
    clusters = Array.from({ length: numClusters }, () => []);

    for (const visit of visitsWithCoords) {
      const user = serviceUsers.get(visit.cp365_serviceuserid)!;
      let minDist = Infinity;
      let nearestCluster = 0;

      for (let c = 0; c < centroids.length; c++) {
        const dist = calculateDistance(
          user.cp365_latitude!,
          user.cp365_longitude!,
          centroids[c].lat,
          centroids[c].lng
        );
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = c;
        }
      }

      clusters[nearestCluster].push(visit);
    }

    // Update centroids
    for (let c = 0; c < centroids.length; c++) {
      if (clusters[c].length === 0) continue;

      let sumLat = 0;
      let sumLng = 0;

      for (const visit of clusters[c]) {
        const user = serviceUsers.get(visit.cp365_serviceuserid)!;
        sumLat += user.cp365_latitude!;
        sumLng += user.cp365_longitude!;
      }

      centroids[c] = {
        lat: sumLat / clusters[c].length,
        lng: sumLng / clusters[c].length,
      };
    }
  }

  // Filter out empty clusters and add any visits without coords
  const nonEmptyClusters = clusters.filter(c => c.length > 0);
  const visitsWithoutCoords = visits.filter(v => {
    const user = serviceUsers.get(v.cp365_serviceuserid);
    return !user?.cp365_latitude || !user?.cp365_longitude;
  });

  if (visitsWithoutCoords.length > 0 && nonEmptyClusters.length > 0) {
    nonEmptyClusters[0].push(...visitsWithoutCoords);
  }

  return nonEmptyClusters;
}

// =============================================================================
// ROUTE OPTIMIZATION
// =============================================================================

/**
 * Optimize visit order within a round using nearest neighbour algorithm
 */
export function optimizeVisitOrder(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): Visit[] {
  if (visits.length <= 2) return visits;

  const optimized: Visit[] = [];
  const remaining = [...visits];

  // Start with the earliest visit by scheduled time
  remaining.sort((a, b) => a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime));
  optimized.push(remaining.shift()!);

  // Greedily pick nearest unvisited
  while (remaining.length > 0) {
    const lastVisit = optimized[optimized.length - 1];
    const lastUser = serviceUsers.get(lastVisit.cp365_serviceuserid);

    if (!lastUser?.cp365_latitude || !lastUser?.cp365_longitude) {
      // No coordinates, just take next by time
      optimized.push(remaining.shift()!);
      continue;
    }

    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidateUser = serviceUsers.get(remaining[i].cp365_serviceuserid);
      if (!candidateUser?.cp365_latitude || !candidateUser?.cp365_longitude) {
        continue;
      }

      const dist = calculateDistance(
        lastUser.cp365_latitude,
        lastUser.cp365_longitude,
        candidateUser.cp365_latitude,
        candidateUser.cp365_longitude
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    optimized.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return optimized;
}

/**
 * Calculate total travel for a round
 */
export function calculateRoundTravel(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): { totalMiles: number; totalMinutes: number } {
  let totalMiles = 0;
  let totalMinutes = 0;

  for (let i = 0; i < visits.length - 1; i++) {
    const fromUser = serviceUsers.get(visits[i].cp365_serviceuserid);
    const toUser = serviceUsers.get(visits[i + 1].cp365_serviceuserid);

    if (fromUser?.cp365_latitude && fromUser?.cp365_longitude &&
        toUser?.cp365_latitude && toUser?.cp365_longitude) {
      const dist = calculateDistance(
        fromUser.cp365_latitude,
        fromUser.cp365_longitude,
        toUser.cp365_latitude,
        toUser.cp365_longitude
      );
      totalMiles += dist;
      totalMinutes += estimateTravelTime(dist);
    }
  }

  return { totalMiles, totalMinutes };
}

// =============================================================================
// ROUND CREATION
// =============================================================================

/**
 * Create rounds from visits for a specific date and visit type
 */
export async function createRoundsFromVisits(
  visits: Visit[],
  visitType: VisitType,
  date: string,
  constraints: RoundConstraints = DEFAULT_ROUND_CONSTRAINTS
): Promise<RoundWithStats[]> {
  console.warn(`🗺️ createRoundsFromVisits called:`, {
    inputVisitsCount: visits.length,
    visitType,
    date,
    sampleVisit: visits[0] ? {
      date: visits[0].cp365_visitdate,
      type: visits[0].cp365_visittypecode,
    } : null,
  });

  const data = await getDummyData();
  const serviceUsersMap = new Map(
    data.serviceUsers.map(su => [su.cp365_serviceuserid, su])
  );

  // Filter visits by type and date
  const filteredVisits = visits.filter(
    v => v.cp365_visittypecode === visitType && v.cp365_visitdate === date
  );

  console.warn(`🗺️ Filtered visits: ${filteredVisits.length} (looking for type ${visitType}, date ${date})`);
  
  // Debug: show unique visit types in input
  const uniqueTypes = new Set(visits.map(v => v.cp365_visittypecode));
  console.warn(`🗺️ Unique visit types in input:`, Array.from(uniqueTypes));

  if (filteredVisits.length === 0) {
    console.warn(`🗺️ No visits match, returning empty array`);
    return [];
  }
  
  console.warn(`🗺️ Proceeding with ${filteredVisits.length} visits...`);

  // Determine number of clusters based on visit count and constraints
  // Use a smaller target per round for better geographic grouping (4-6 visits per round)
  const targetPerRound = Math.min(constraints.maxVisitsPerRound, 5);
  const numClusters = Math.max(2, Math.ceil(filteredVisits.length / targetPerRound));
  
  console.warn(`🗺️ Creating ${numClusters} clusters (target ${targetPerRound} per round, max ${constraints.maxVisitsPerRound})`);

  // Cluster visits by location
  const clusters = clusterVisitsByLocation(filteredVisits, serviceUsersMap, numClusters);

  // Create rounds from clusters
  const rounds: RoundWithStats[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const clusterVisits = clusters[i];
    if (clusterVisits.length === 0) continue;

    // Optimize visit order within cluster
    const optimizedVisits = optimizeVisitOrder(clusterVisits, serviceUsersMap);

    // Calculate travel
    const { totalMiles: _totalMiles, totalMinutes } = calculateRoundTravel(optimizedVisits, serviceUsersMap);

    // Calculate stats
    const totalVisitMinutes = optimizedVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
    const uniqueServiceUsers = new Set(optimizedVisits.map(v => v.cp365_serviceuserid)).size;
    const isFullyAssigned = optimizedVisits.every(v => !!v.cp365_staffmemberid);

    // Get start/end times from visits
    const sortedByTime = [...optimizedVisits].sort((a, b) =>
      a.cp365_scheduledstarttime.localeCompare(b.cp365_scheduledstarttime)
    );
    const startTime = sortedByTime[0]?.cp365_scheduledstarttime || '08:00';
    const endTime = sortedByTime[sortedByTime.length - 1]?.cp365_scheduledendtime || '12:00';

    const roundName = `${getVisitTypeName(visitType)} Round ${String.fromCharCode(65 + i)}`;

    const round: RoundWithStats = {
      cp365_roundid: crypto.randomUUID(),
      cp365_roundname: roundName,
      cp365_roundtype: visitType,
      cp365_starttime: startTime,
      cp365_endtime: endTime,
      cp365_istemplate: false,
      cp365_visitcount: optimizedVisits.length,
      cp365_totaldurationminutes: totalVisitMinutes + totalMinutes,
      cp365_estimatedtravelminutes: totalMinutes,
      statecode: 0,
      visits: optimizedVisits,
      totalVisitMinutes,
      totalTravelMinutes: totalMinutes,
      serviceUserCount: uniqueServiceUsers,
      isFullyAssigned,
    };

    rounds.push(round);
  }

  console.warn(`🗺️ Created ${rounds.length} rounds with ${rounds.reduce((sum, r) => sum + r.visits.length, 0)} total visits`);
  return rounds;
}

/**
 * Get display name for visit type
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
    [VisitType.SleepIn]: 'Sleep-in',
    [VisitType.Emergency]: 'Emergency',
    [VisitType.Assessment]: 'Assessment',
    [VisitType.Review]: 'Review',
  };
  return names[type] || 'Unknown';
}

// =============================================================================
// ROUND STATISTICS
// =============================================================================

/**
 * Calculate statistics for a round
 */
export function calculateRoundStats(
  round: Round,
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): RoundWithStats {
  const roundVisits = visits.filter(v => v.cp365_roundid === round.cp365_roundid);
  const optimizedVisits = optimizeVisitOrder(roundVisits, serviceUsers);
  const { totalMinutes } = calculateRoundTravel(optimizedVisits, serviceUsers);
  
  const totalVisitMinutes = optimizedVisits.reduce((sum, v) => sum + v.cp365_durationminutes, 0);
  const uniqueServiceUsers = new Set(optimizedVisits.map(v => v.cp365_serviceuserid)).size;
  const isFullyAssigned = optimizedVisits.every(v => !!v.cp365_staffmemberid);

  return {
    ...round,
    visits: optimizedVisits,
    totalVisitMinutes,
    totalTravelMinutes: totalMinutes,
    serviceUserCount: uniqueServiceUsers,
    isFullyAssigned,
  };
}

// =============================================================================
// GEOGRAPHIC AREA UTILITIES
// =============================================================================

/**
 * Find geographic area for a postcode
 */
export function findAreaForPostcode(
  postcode: string,
  areas: GeographicArea[]
): GeographicArea | null {
  const prefix = postcode.split(' ')[0].toUpperCase();
  
  for (const area of areas) {
    const prefixes = area.cp365_postcodeprefix.split(',').map(p => p.trim().toUpperCase());
    if (prefixes.some(p => prefix.startsWith(p))) {
      return area;
    }
  }
  
  return null;
}

/**
 * Find geographic area containing a location
 */
export function findAreaForLocation(
  latitude: number,
  longitude: number,
  areas: GeographicArea[]
): GeographicArea | null {
  for (const area of areas) {
    const distance = calculateDistance(
      latitude,
      longitude,
      area.cp365_centerlatitude,
      area.cp365_centerlongitude
    );
    
    if (distance <= area.cp365_radiusmiles) {
      return area;
    }
  }
  
  return null;
}

/**
 * Get center point for a set of visits
 */
export function getVisitsCenterPoint(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): { lat: number; lng: number } | null {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const visit of visits) {
    const user = serviceUsers.get(visit.cp365_serviceuserid);
    if (user?.cp365_latitude && user?.cp365_longitude) {
      sumLat += user.cp365_latitude;
      sumLng += user.cp365_longitude;
      count++;
    }
  }

  if (count === 0) return null;

  return {
    lat: sumLat / count,
    lng: sumLng / count,
  };
}

/**
 * Get bounds for a set of visits (for map fitting)
 */
export function getVisitsBounds(
  visits: Visit[],
  serviceUsers: Map<string, DomiciliaryServiceUser>
): { north: number; south: number; east: number; west: number } | null {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  let hasCoords = false;

  for (const visit of visits) {
    const user = serviceUsers.get(visit.cp365_serviceuserid);
    if (user?.cp365_latitude && user?.cp365_longitude) {
      hasCoords = true;
      north = Math.max(north, user.cp365_latitude);
      south = Math.min(south, user.cp365_latitude);
      east = Math.max(east, user.cp365_longitude);
      west = Math.min(west, user.cp365_longitude);
    }
  }

  if (!hasCoords) return null;

  // Add some padding
  const latPadding = (north - south) * 0.1 || 0.01;
  const lngPadding = (east - west) * 0.1 || 0.01;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding,
  };
}
