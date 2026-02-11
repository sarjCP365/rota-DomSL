/**
 * Data Source Configuration Service
 *
 * Provides configuration for switching between dummy data (for development)
 * and Dataverse (for production). This allows development and testing
 * without requiring a Dataverse connection.
 *
 * Usage:
 * - Set VITE_DATA_SOURCE=dummy in .env.local for local development
 * - Set VITE_DATA_SOURCE=dataverse for production/staging
 */

/**
 * Available data source types
 * - 'dummy': Uses in-memory mock data (no external dependencies)
 * - 'dataverse': Uses Microsoft Dataverse Web API
 */
export type DataSourceType = 'dummy' | 'dataverse';

/**
 * Configuration for the data source
 */
export interface DataSourceConfig {
  /** Which data source to use */
  type: DataSourceType;
  /** Dataverse environment URL (required for dataverse type) */
  dataverseUrl?: string;
  /** Map tile URL for geographic features */
  mapTileUrl?: string;
}

/**
 * Build configuration from environment variables
 */
function buildConfig(): DataSourceConfig {
  const type = (import.meta.env.VITE_DATA_SOURCE as DataSourceType) || 'dummy';

  // Validate type
  if (type !== 'dummy' && type !== 'dataverse') {
    console.warn(
      `Invalid VITE_DATA_SOURCE value: "${type}". Falling back to "dummy".`
    );
  }

  return {
    type: type === 'dataverse' ? 'dataverse' : 'dummy',
    dataverseUrl: import.meta.env.VITE_DATAVERSE_URL as string | undefined,
    mapTileUrl:
      (import.meta.env.VITE_MAP_TILE_URL as string) ||
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  };
}

/**
 * Data source configuration singleton
 */
export const dataSource: DataSourceConfig = buildConfig();

/**
 * Check if we're using dummy data
 */
export function isDummyDataSource(): boolean {
  return dataSource.type === 'dummy';
}

/**
 * Check if we're using Dataverse
 */
export function isDataverseSource(): boolean {
  return dataSource.type === 'dataverse';
}

/**
 * Get the Dataverse URL, throwing if not configured
 */
export function getDataverseUrl(): string {
  if (!dataSource.dataverseUrl) {
    throw new Error(
      'VITE_DATAVERSE_URL is not configured. Please set it in your .env file.'
    );
  }
  return dataSource.dataverseUrl;
}

/**
 * Log the current data source configuration (for debugging)
 */
export function logDataSourceConfig(): void {
  console.warn('📦 Data Source Configuration:', {
    type: dataSource.type,
    dataverseUrl: dataSource.dataverseUrl ? '(configured)' : '(not configured)',
    mapTileUrl: dataSource.mapTileUrl ? '(configured)' : '(not configured)',
  });
}

// Log configuration on module load in development
if (import.meta.env.DEV) {
  logDataSourceConfig();
}
