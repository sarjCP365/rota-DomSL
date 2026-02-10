/**
 * Base Repository Interface
 *
 * Defines the standard CRUD operations that all repositories must implement.
 * This provides a consistent API regardless of the underlying data source
 * (dummy data or Dataverse).
 */

/**
 * Filter options for querying entities
 */
export interface QueryFilter {
  /** Field-value pairs for exact matching */
  [key: string]: unknown;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Number of records to skip */
  skip?: number;
  /** Maximum number of records to return */
  take?: number;
  /** Field to order by */
  orderBy?: string;
  /** Sort direction */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResult<T> {
  /** The data items */
  items: T[];
  /** Total count of all matching items */
  total: number;
  /** Whether there are more items */
  hasMore: boolean;
}

/**
 * Base repository interface with standard CRUD operations
 * All entity repositories should extend this interface
 */
export interface Repository<T> {
  /**
   * Get all entities
   * @returns Promise resolving to array of all entities
   */
  getAll(): Promise<T[]>;

  /**
   * Get a single entity by ID
   * @param id - The entity's unique identifier
   * @returns Promise resolving to the entity or null if not found
   */
  getById(id: string): Promise<T | null>;

  /**
   * Create a new entity
   * @param entity - Partial entity data (ID will be generated)
   * @returns Promise resolving to the created entity with ID
   */
  create(entity: Partial<T>): Promise<T>;

  /**
   * Update an existing entity
   * @param id - The entity's unique identifier
   * @param entity - Partial entity data to update
   * @returns Promise resolving to the updated entity
   */
  update(id: string, entity: Partial<T>): Promise<T>;

  /**
   * Delete an entity (soft delete in Dataverse)
   * @param id - The entity's unique identifier
   * @returns Promise resolving when deletion is complete
   */
  delete(id: string): Promise<void>;

  /**
   * Query entities with filters
   * @param filter - Field-value pairs to filter by
   * @returns Promise resolving to matching entities
   */
  query(filter: QueryFilter): Promise<T[]>;
}

/**
 * Extended repository interface with pagination support
 */
export interface PaginatedRepository<T> extends Repository<T> {
  /**
   * Get entities with pagination
   * @param options - Pagination options
   * @returns Promise resolving to paginated result
   */
  getPaginated(options?: PaginationOptions): Promise<PaginatedResult<T>>;

  /**
   * Query entities with filters and pagination
   * @param filter - Field-value pairs to filter by
   * @param options - Pagination options
   * @returns Promise resolving to paginated result
   */
  queryPaginated(
    filter: QueryFilter,
    options?: PaginationOptions
  ): Promise<PaginatedResult<T>>;
}

/**
 * Abstract base class for repositories
 * Provides common functionality that can be shared across implementations
 */
export abstract class BaseRepository<T> implements Repository<T> {
  abstract getAll(): Promise<T[]>;
  abstract getById(id: string): Promise<T | null>;
  abstract create(entity: Partial<T>): Promise<T>;
  abstract update(id: string, entity: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract query(filter: QueryFilter): Promise<T[]>;

  /**
   * Check if an entity exists
   * @param id - The entity's unique identifier
   * @returns Promise resolving to true if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.getById(id);
    return entity !== null;
  }

  /**
   * Get multiple entities by IDs
   * @param ids - Array of entity identifiers
   * @returns Promise resolving to found entities (missing IDs are skipped)
   */
  async getByIds(ids: string[]): Promise<T[]> {
    const results = await Promise.all(ids.map((id) => this.getById(id)));
    return results.filter((entity): entity is T => entity !== null);
  }

  /**
   * Create multiple entities
   * @param entities - Array of partial entity data
   * @returns Promise resolving to created entities
   */
  async createMany(entities: Partial<T>[]): Promise<T[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  /**
   * Delete multiple entities
   * @param ids - Array of entity identifiers
   * @returns Promise resolving when all deletions are complete
   */
  async deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }
}
