/**
 * Location API Operations
 * CRUD operations for cp365_location, cp365_sublocation, and cp365_rota entities
 */

import { getDataverseClient, isDataverseClientInitialised } from './client';
import type { Location, Sublocation, Rota } from './types';
import { StateCode, LocationStatus } from './types';

/**
 * Get all active locations
 */
export async function getLocations(): Promise<Location[]> {
  console.log('[Locations] getLocations called');
  console.log('[Locations] isDataverseClientInitialised:', isDataverseClientInitialised());
  
  if (!isDataverseClientInitialised()) {
    console.warn('[Locations] Dataverse client not initialised - returning empty array');
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[Locations] Fetching locations from Dataverse...');
    
    // Fetch locations - only request essential fields
    const locations = await client.get<Location>('cp365_locations', {
      select: [
        'cp365_locationid',
        'cp365_locationname',
        'cp365_locationstatus',
      ],
      orderby: 'cp365_locationname asc',
      top: 100,
    });
    
    console.log('[Locations] Fetched locations:', locations.length);
    if (locations.length > 0) {
      console.log('[Locations] First location:', locations[0]);
    }
    
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
      select: [
        'cp365_locationid',
        'cp365_locationname',
        'cp365_locationstatus',
      ],
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
  console.log('[Locations] getSublocations called for locationId:', locationId);
  
  if (!isDataverseClientInitialised()) {
    console.warn('[Locations] Dataverse client not initialised');
    return [];
  }

  try {
    const client = getDataverseClient();
    console.log('[Locations] Fetching sublocations...');
    
    const sublocations = await client.get<Sublocation>('cp365_sublocations', {
      filter: `_cp365_location_value eq '${locationId}'`,
      select: [
        'cp365_sublocationid',
        'cp365_sublocationname',
        '_cp365_location_value',
      ],
      orderby: 'cp365_sublocationname asc',
    });
    
    console.log('[Locations] Fetched sublocations:', sublocations.length);
    if (sublocations.length > 0) {
      console.log('[Locations] First sublocation:', sublocations[0]);
    }
    
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
      select: [
        'cp365_sublocationid',
        'cp365_sublocationname',
        '_cp365_location_value',
      ],
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
      select: [
        'cp365_sublocationid',
        'cp365_sublocationname',
        '_cp365_location_value',
      ],
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
      select: [
        'cp365_rotaid',
        'cp365_rotaname',
        'statecode',
        '_cp365_sublocation_value',
      ],
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
      select: [
        'cp365_rotaid',
        'cp365_rotaname',
        'statecode',
        '_cp365_sublocation_value',
      ],
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
  console.log('[Locations] getActiveRotaForSublocation called for sublocationId:', sublocationId);
  
  if (!isDataverseClientInitialised()) {
    return null;
  }

  try {
    const client = getDataverseClient();
    const rotas = await client.get<Rota>('cp365_rotas', {
      filter: `_cp365_sublocation_value eq '${sublocationId}' and statecode eq ${StateCode.Active}`,
      select: [
        'cp365_rotaid',
        'cp365_rotaname',
        'statecode',
        '_cp365_sublocation_value',
      ],
      top: 1,
    });

    console.log('[Locations] Found rotas:', rotas.length);
    return rotas.length > 0 ? rotas[0] : null;
  } catch (error) {
    console.error('[Locations] Error fetching active rota:', error);
    return null;
  }
}

/**
 * DEBUG: Get all rotas and their parent locations
 */
export async function debugGetAllRotas(): Promise<void> {
  if (!isDataverseClientInitialised()) {
    console.log('[DEBUG] Dataverse client not initialised');
    return;
  }

  try {
    const client = getDataverseClient();
    
    // Get all rotas
    console.log('[DEBUG] Fetching ALL rotas...');
    const rotas = await client.get<Rota>('cp365_rotas', {
      select: ['cp365_rotaid', 'cp365_rotaname', 'statecode', '_cp365_sublocation_value'],
      top: 50,
    });
    console.log('[DEBUG] Total rotas found:', rotas.length);

    // Get all sublocations to map them
    console.log('[DEBUG] Fetching ALL sublocations...');
    const allSublocations = await client.get<Sublocation>('cp365_sublocations', {
      select: ['cp365_sublocationid', 'cp365_sublocationname', '_cp365_location_value'],
      top: 100,
    });
    console.log('[DEBUG] Total sublocations found:', allSublocations.length);

    // Get all locations
    console.log('[DEBUG] Fetching ALL locations...');
    const allLocations = await client.get<Location>('cp365_locations', {
      select: ['cp365_locationid', 'cp365_locationname'],
      top: 50,
    });
    console.log('[DEBUG] Total locations found:', allLocations.length);

    // Create lookup maps
    const locationMap = new Map(allLocations.map(l => [l.cp365_locationid, l.cp365_locationname]));
    const sublocationMap = new Map(allSublocations.map(s => [s.cp365_sublocationid, {
      name: s.cp365_sublocationname,
      locationId: s._cp365_location_value,
    }]));

    // Log which locations have sublocations with rotas
    console.log('[DEBUG] ========================================');
    console.log('[DEBUG] LOCATIONS WITH ROTAS:');
    console.log('[DEBUG] ========================================');
    
    const locationsWithRotas = new Set<string>();
    
    for (const rota of rotas) {
      const sublocationId = rota._cp365_sublocation_value;
      const sublocation = sublocationMap.get(sublocationId);
      
      if (sublocation) {
        const locationName = locationMap.get(sublocation.locationId) || 'Unknown Location';
        locationsWithRotas.add(sublocation.locationId);
        
        console.log(`[DEBUG] Rota: "${rota.cp365_rotaname}"`);
        console.log(`[DEBUG]   └─ Sublocation: "${sublocation.name}" (${sublocationId})`);
        console.log(`[DEBUG]   └─ Location: "${locationName}" (${sublocation.locationId})`);
        console.log('[DEBUG]   ---');
      } else {
        console.log(`[DEBUG] Rota: "${rota.cp365_rotaname}" - Sublocation NOT FOUND: ${sublocationId}`);
      }
    }

    console.log('[DEBUG] ========================================');
    console.log('[DEBUG] SUMMARY: Select one of these locations to see shifts:');
    for (const locationId of locationsWithRotas) {
      const locationName = locationMap.get(locationId);
      console.log(`[DEBUG]   - "${locationName}" (${locationId})`);
    }
    console.log('[DEBUG] ========================================');
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
  }
}
