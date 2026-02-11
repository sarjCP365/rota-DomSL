/**
 * Configuration Service
 *
 * Manages system configuration for matching weights, swap rules, and travel thresholds.
 * In production, this would read/write to Dataverse or another persistent store.
 */

import { type CareType, type MatchScoreWeights, DEFAULT_MATCHING_WEIGHTS } from './careContext';
import { type OpenShiftConfiguration, DEFAULT_OPEN_SHIFT_CONFIGURATION } from '@/types/configuration';

// ============================================================================
// Swap Configuration Types
// ============================================================================

export interface SwapConfiguration {
  minNoticeHours: number;
  maxSwapsPerWeek: number;
  requireManagerApproval: boolean;
  allowOpenShifts: boolean;
  openShiftExpiryHours: number;
  notifyAllSuitableStaff: boolean;
  minimumMatchScore: number;
  considerContinuity: boolean;
  allowCrossTeamSwaps: boolean;
  autoApproveHighScore: boolean;
  autoApproveThreshold: number;
}

// ============================================================================
// Matching Configuration Types
// ============================================================================

export interface MatchingConfiguration {
  weightsByCareType: Record<CareType, MatchScoreWeights>;
}

// ============================================================================
// Travel Threshold Types
// ============================================================================

export interface TravelThresholds {
  maxTravelMinutes: number;
  optimalTravelMinutes: number;
  travelPenaltyFactor: number;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_SWAP_CONFIG: SwapConfiguration = {
  minNoticeHours: 24,
  maxSwapsPerWeek: 3,
  requireManagerApproval: true,
  allowOpenShifts: true,
  openShiftExpiryHours: 48,
  notifyAllSuitableStaff: true,
  minimumMatchScore: 60,
  considerContinuity: true,
  allowCrossTeamSwaps: false,
  autoApproveHighScore: false,
  autoApproveThreshold: 90,
};

const DEFAULT_TRAVEL_THRESHOLDS: TravelThresholds = {
  maxTravelMinutes: 60,
  optimalTravelMinutes: 15,
  travelPenaltyFactor: 0.5,
};

// ============================================================================
// In-memory storage (simulates database)
// ============================================================================

let swapConfig: SwapConfiguration = { ...DEFAULT_SWAP_CONFIG };
const matchingConfig: MatchingConfiguration = {
  weightsByCareType: { ...DEFAULT_MATCHING_WEIGHTS },
};
let travelThresholds: TravelThresholds = { ...DEFAULT_TRAVEL_THRESHOLDS };

// ============================================================================
// Swap Configuration Functions
// ============================================================================

export async function getSwapConfiguration(): Promise<SwapConfiguration> {
  // Simulate async operation
  await delay(50);
  return { ...swapConfig };
}

export async function updateSwapConfiguration(
  config: Partial<SwapConfiguration>
): Promise<SwapConfiguration> {
  await delay(100);
  swapConfig = { ...swapConfig, ...config };
  console.warn('📝 Swap configuration updated:', swapConfig);
  return { ...swapConfig };
}

// ============================================================================
// Open Shift Configuration Functions
// ============================================================================

export async function getOpenShiftConfiguration(): Promise<OpenShiftConfiguration> {
  await delay(50);
  return { ...DEFAULT_OPEN_SHIFT_CONFIGURATION };
}

// ============================================================================
// Matching Configuration Functions
// ============================================================================

export async function getMatchingConfiguration(): Promise<MatchingConfiguration> {
  await delay(50);
  return {
    weightsByCareType: { ...matchingConfig.weightsByCareType },
  };
}

export async function updateMatchingWeights(
  careType: CareType,
  weights: MatchScoreWeights
): Promise<MatchScoreWeights> {
  await delay(100);
  matchingConfig.weightsByCareType[careType] = { ...weights };
  console.warn(`📝 Matching weights updated for ${careType}:`, weights);
  return { ...weights };
}

export function getMatchingWeightsSync(careType: CareType): MatchScoreWeights {
  return matchingConfig.weightsByCareType[careType] || DEFAULT_MATCHING_WEIGHTS[careType];
}

// ============================================================================
// Travel Threshold Functions
// ============================================================================

export async function getTravelThresholds(): Promise<TravelThresholds> {
  await delay(50);
  return { ...travelThresholds };
}

export async function updateTravelThresholds(
  thresholds: Partial<TravelThresholds>
): Promise<TravelThresholds> {
  await delay(100);
  travelThresholds = { ...travelThresholds, ...thresholds };
  console.warn('📝 Travel thresholds updated:', travelThresholds);
  return { ...travelThresholds };
}

export function getTravelThresholdsSync(): TravelThresholds {
  return { ...travelThresholds };
}

// ============================================================================
// Utility
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
