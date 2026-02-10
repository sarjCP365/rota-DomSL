/**
 * Location API Operations
 * CRUD operations for cp365_location, cp365_sublocation, and cp365_rota entities
 */

import { getDataverseClient, isDataverseClientInitialised } from './client';
import type { Location, Sublocation, Rota } from './types';
import { StateCode } from './types';
// LocationStatus removed - unused

/**
 * Get all active locations
 */
export async function getLocations(): Promise<Location[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Locations] Dataverse client not initialised - returning empty array');
    return [];
  }

  try {
    const client = getDataverseClient();

    // Fetch locations - only request essential fields
    const locations = await client.get<Location>('cp365_locations', {
      select: ['cp365_locationid', 'cp365_locationname', 'cp365_locationstatus'],
      orderby: 'cp365_locationname asc',
      top: 100,
    });

    return locations;
  } catch (error) {
    console.error('[Locations] Error fetching locations:', error);
    throw error;
  }
}

/**
 * Get a single location by ID
 */
export async function getLocationById(locationId: string): Promise<Location | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    return await client.getById<Location>('cp365_locations', locationId, {
      select: ['cp365_locationid', 'cp365_locationname', 'cp365_locationstatus'],
    });
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return null;
  }
}

/**
 * Get all sublocations for a location
 */
export async function getSublocations(locationId: string): Promise<Sublocation[]> {
  if (!isDataverseClientInitialised()) {
    console.warn('[Locations] Dataverse client not initialised');
    return [];
  }

  try {
    const client = getDataverseClient();

    const sublocations = await client.get<Sublocation>('cp365_sublocations', {
      filter: `_cp365_location_value eq '${locationId}'`,
      select: ['cp365_sublocationid', 'cp365_sublocationname', '_cp365_location_value'],
      orderby: 'cp365_sublocationname asc',
    });

    return sublocations;
  } catch (error) {
    console.error('[Locations] Error fetching sublocations:', error);
    throw error;
  }
}

/**
 * Get all sublocations across all locations
 */
export async function getAllSublocations(): Promise<Sublocation[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    return await client.get<Sublocation>('cp365_sublocations', {
      select: ['cp365_sublocationid', 'cp365_sublocationname', '_cp365_location_value'],
      orderby: 'cp365_sublocationname asc',
    });
  } catch (error) {
    console.error('[Locations] Error fetching all sublocations:', error);
    throw error;
  }
}

/**
 * Get a single sublocation by ID
 */
export async function getSublocationById(sublocationId: string): Promise<Sublocation | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    return await client.getById<Sublocation>('cp365_sublocations', sublocationId, {
      select: ['cp365_sublocationid', 'cp365_sublocationname', '_cp365_location_value'],
    });
  } catch (error) {
    console.error('Failed to fetch sublocation:', error);
    return null;
  }
}

/**
 * Get all rotas for a sublocation
 */
export async function getRotas(sublocationId: string): Promise<Rota[]> {
  if (!isDataverseClientInitialised()) {
    return [];
  }

  try {
    const client = getDataverseClient();
    return await client.get<Rota>('cp365_rotas', {
      filter: `_cp365_sublocation_value eq '${sublocationId}' and statecode eq ${StateCode.Active}`,
      select: ['cp365_rotaid', 'cp365_rotaname', 'statecode', '_cp365_sublocation_value'],
      orderby: 'cp365_rotaname asc',
    });
  } catch (error) {
    console.error('[Locations] Error fetching rotas:', error);
    throw error;
  }
}

/**
 * Get a single rota by ID
 */
export async function getRotaById(rotaId: string): Promise<Rota | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    return await client.getById<Rota>('cp365_rotas', rotaId, {
      select: ['cp365_rotaid', 'cp365_rotaname', 'statecode', '_cp365_sublocation_value'],
    });
  } catch (error) {
    console.error('Failed to fetch rota:', error);
    return null;
  }
}

/**
 * Get the active rota for a sublocation
 */
export async function getActiveRotaForSublocation(sublocationId: string): Promise<Rota | null> {
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    const rotas = await client.get<Rota>('cp365_rotas', {
      filter: `_cp365_sublocation_value eq '${sublocationId}' and statecode eq ${StateCode.Active}`,
      select: ['cp365_rotaid', 'cp365_rotaname', 'statecode', '_cp365_sublocation_value'],
      top: 1,
    });

    return rotas.length > 0 ? rotas[0] : null;
  } catch (error) {
    console.error('[Locations] Error fetching active rota:', error);
    return null;
  }
}

/**
 * @deprecated Debug function - remove in production
 * DEBUG: Get all rotas and their parent locations
 */
export async function debugGetAllRotas(): Promise<void> {
  // This is a debug-only function that intentionally uses console.log
   
  if (!isDataverseClientInitialised()) {
    console.warn('[DEBUG] Dataverse client not initialised');
    return;
  }
  // Debug function implementation - console output is expected
  console.warn('[DEBUG] debugGetAllRotas called - this is a debug function');
}
