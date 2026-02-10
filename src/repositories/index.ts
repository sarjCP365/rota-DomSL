/**
 * Repository Exports
 *
 * Central export point for all repository interfaces and instances.
 */

// Base types and utilities
export type {
  Repository,
  PaginatedRepository,
  QueryFilter,
  PaginationOptions,
  PaginatedResult,
} from './baseRepository';
export { BaseRepository } from './baseRepository';

// Factory (kept for backwards compatibility)
export { createRepository, createLazyRepository } from './repositoryFactory';

// Entity-specific repository interfaces
export type { VisitRepository } from './visitRepository';
export type { ServiceUserRepository } from './serviceUserRepository';
export type { StaffAvailabilityRepository } from './staffAvailabilityRepository';
export type { VisitActivityRepository } from './visitActivityRepository';
export type { RoundRepository } from './roundRepository';
export type { ServiceUserStaffRelationshipRepository } from './serviceUserStaffRelationshipRepository';

// Repository instances
export { visitRepository } from './visitRepository';
export { serviceUserRepository } from './serviceUserRepository';
export { staffAvailabilityRepository } from './staffAvailabilityRepository';
export { visitActivityRepository } from './visitActivityRepository';
export { roundRepository } from './roundRepository';
export { serviceUserStaffRelationshipRepository } from './serviceUserStaffRelationshipRepository';
