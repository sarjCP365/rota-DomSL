/**
 * Repository Factory
 *
 * Factory function for creating repositories that automatically switch
 * between dummy and Dataverse implementations based on configuration.
 */

import { dataSource } from '@/services/dataSource';
import type { Repository } from './baseRepository';

/**
 * Create a repository that selects implementation based on data source config
 *
 * @param dummyRepository - Repository implementation using dummy data
 * @param dataverseRepository - Repository implementation using Dataverse
 * @returns The appropriate repository implementation
 *
 * @example
 * ```typescript
 * export const visitRepository = createRepository(
 *   new DummyVisitRepository(),
 *   new DataverseVisitRepository()
 * );
 * ```
 */
export function createRepository<T, R extends Repository<T>>(
  dummyRepository: R,
  dataverseRepository: R
): R {
  if (dataSource.type === 'dataverse') {
    return dataverseRepository;
  }
  return dummyRepository;
}

/**
 * Create a repository with lazy initialization
 * Useful when repositories have expensive initialization
 *
 * @param createDummy - Factory function for dummy repository
 * @param createDataverse - Factory function for Dataverse repository
 * @returns Function that returns the repository (creates on first call)
 *
 * @example
 * ```typescript
 * const getVisitRepository = createLazyRepository(
 *   () => new DummyVisitRepository(),
 *   () => new DataverseVisitRepository()
 * );
 *
 * // Later, when needed:
 * const repo = getVisitRepository();
 * ```
 */
export function createLazyRepository<T, R extends Repository<T>>(
  createDummy: () => R,
  createDataverse: () => R
): () => R {
  let instance: R | null = null;

  return () => {
    if (!instance) {
      instance =
        dataSource.type === 'dataverse' ? createDataverse() : createDummy();
    }
    return instance;
  };
}
