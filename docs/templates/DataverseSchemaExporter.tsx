/**
 * Dataverse Schema Exporter
 * 
 * A reusable React component to export Dataverse table metadata.
 * Copy this into your project and customize the TABLES_TO_FETCH array.
 * 
 * USAGE:
 * 1. Copy this file to your project (e.g., src/pages/DebugSchema.tsx)
 * 2. Update the import for useAuth to match your auth hook
 * 3. Update DATAVERSE_URL to match your environment variable
 * 4. Add TABLES_TO_FETCH with your table logical names
 * 5. Add a route to this page (e.g., /debug-schema)
 * 6. Navigate to the page, authenticate, and click "Fetch All Table Schemas"
 * 7. Download the JSON and analyze it
 * 8. DELETE THIS PAGE after use (it's for debugging only)
 * 
 * @example
 * // In App.tsx or your router:
 * import { DataverseSchemaExporter } from './pages/DebugSchema';
 * <Route path="/debug-schema" element={<DataverseSchemaExporter />} />
 */

import { useState, useMemo } from 'react';
// UPDATE THIS IMPORT to match your auth hook:
// import { useAuth } from '../hooks/useAuth';

// UPDATE THIS to match your environment variable:
const DATAVERSE_URL = import.meta.env.VITE_DATAVERSE_URL;

// ADD YOUR TABLES HERE:
const TABLES_TO_FETCH = [
  // Example tables - replace with your own:
  'cp365_shiftpatterntemplatenew',
  'cp365_shiftpatternday',
  'cp365_staffpatternassignment',
  'cp365_shift',
  'cp365_location',
  'cp365_sublocation',
  'cp365_staffmember',
  'cp365_shiftreference',
  'cp365_rota',
];

interface AttributeMetadata {
  LogicalName: string;
  AttributeType: string;
  DisplayName?: { UserLocalizedLabel: { Label: string } };
  SchemaName: string;
  IsPrimaryId?: boolean;
  IsPrimaryName?: boolean;
  IsCustomizable?: { Value: boolean };
  IsCustom?: boolean;
  RequiredLevel?: { Value: number };
  Description?: { UserLocalizedLabel: { Label: string } };
}

interface EntityMetadata {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: { UserLocalizedLabel: { Label: string } };
  Description?: { UserLocalizedLabel: { Label: string } };
  PrimaryIdAttribute: string;
  PrimaryNameAttribute: string;
  IsCustomizable?: { Value: boolean };
  IsCustomEntity?: boolean;
  Attributes: AttributeMetadata[];
}

interface SchemaExport {
  tableName: string;
  schemaName: string;
  primaryId: string;
  primaryName: string;
  columns: Array<{
    logicalName: string;
    schemaName: string;
    displayName: string;
    type: string;
    isCustom: boolean;
    isRequired: boolean;
  }>;
}

export function DataverseSchemaExporter() {
  // UPDATE THIS to use your auth hook:
  // const { acquireToken, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  
  // TEMPORARY: Remove these lines and uncomment above when integrating
  const acquireToken = async () => { throw new Error('Update useAuth import'); };
  const isAuthenticated = false;
  const isLoadingAuth = false;
  
  const [schemaData, setSchemaData] = useState<EntityMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const fetchSchema = async () => {
    setError(null);
    setIsLoading(true);
    setSchemaData([]);
    setProgress('Starting...');

    if (!isAuthenticated) {
      setError('Not authenticated. Please log in first.');
      setIsLoading(false);
      return;
    }

    try {
      const token = await acquireToken();
      if (!token) {
        setError('Failed to acquire access token.');
        setIsLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Prefer': 'odata.include-annotations="*"',
      };

      const fetchedEntities: EntityMetadata[] = [];

      for (let i = 0; i < TABLES_TO_FETCH.length; i++) {
        const logicalName = TABLES_TO_FETCH[i];
        setProgress(`Fetching ${i + 1}/${TABLES_TO_FETCH.length}: ${logicalName}`);
        
        try {
          // Fetch entity metadata
          const entityResponse = await fetch(
            `${DATAVERSE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$select=LogicalName,SchemaName,DisplayName,Description,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomizable,IsCustomEntity`,
            { headers }
          );
          
          if (!entityResponse.ok) {
            const errorData = await entityResponse.json();
            throw new Error(errorData.error?.message || `HTTP ${entityResponse.status}`);
          }
          
          const entityData = await entityResponse.json();

          // Fetch attribute metadata
          // NOTE: Do NOT include 'Targets' in $select - it only exists on Lookup attributes
          const attributesResponse = await fetch(
            `${DATAVERSE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,AttributeType,DisplayName,SchemaName,IsPrimaryId,IsPrimaryName,IsCustomizable,IsCustom,RequiredLevel,Description`,
            { headers }
          );
          
          if (!attributesResponse.ok) {
            const errorData = await attributesResponse.json();
            throw new Error(errorData.error?.message || `HTTP ${attributesResponse.status}`);
          }
          
          const attributesData = await attributesResponse.json();

          fetchedEntities.push({
            ...entityData,
            Attributes: attributesData.value,
          });
        } catch (entityError: unknown) {
          const message = entityError instanceof Error ? entityError.message : 'Unknown error';
          console.error(`Error fetching schema for ${logicalName}:`, entityError);
          setError((prev) => `${prev ? prev + '\n' : ''}${logicalName}: ${message}`);
        }
      }
      
      setSchemaData(fetchedEntities);
      setProgress('Complete!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schema';
      console.error('General fetch error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Transform to simplified format
  const simplifiedSchema: SchemaExport[] = useMemo(() => {
    return schemaData.map(entity => ({
      tableName: entity.LogicalName,
      schemaName: entity.SchemaName,
      primaryId: entity.PrimaryIdAttribute,
      primaryName: entity.PrimaryNameAttribute,
      columns: entity.Attributes
        .filter(attr => attr.IsCustom || attr.IsPrimaryId || attr.IsPrimaryName)
        .map(attr => ({
          logicalName: attr.LogicalName,
          schemaName: attr.SchemaName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          type: attr.AttributeType,
          isCustom: attr.IsCustom || false,
          isRequired: attr.RequiredLevel?.Value === 2,
        }))
        .sort((a, b) => a.logicalName.localeCompare(b.logicalName)),
    }));
  }, [schemaData]);

  const jsonOutput = useMemo(() => JSON.stringify(simplifiedSchema, null, 2), [simplifiedSchema]);

  const handleDownloadJson = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataverse-schema-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    alert('Schema copied to clipboard!');
  };

  // Loading auth state
  if (isLoadingAuth) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <p>Authenticating...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Authentication Required</h1>
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>Please log in to access the schema exporter.</p>
        <button
          onClick={() => window.location.href = '/'}
          style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
          Dataverse Schema Exporter
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Exports metadata for the configured tables. <strong>Delete this page after use.</strong>
        </p>

        {/* Tables being fetched */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Tables to fetch:</h2>
          <code style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {TABLES_TO_FETCH.join(', ')}
          </code>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchSchema}
            disabled={isLoading}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', backgroundColor: isLoading ? '#9ca3af' : '#10b981', 
              color: 'white', borderRadius: '0.5rem', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isLoading ? 'Fetching...' : 'Fetch All Table Schemas'}
          </button>
          <button
            onClick={handleDownloadJson}
            disabled={schemaData.length === 0 || isLoading}
            style={{ 
              padding: '0.75rem 1.5rem', backgroundColor: schemaData.length === 0 ? '#9ca3af' : '#3b82f6', 
              color: 'white', borderRadius: '0.5rem', border: 'none', cursor: schemaData.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            Download JSON
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={schemaData.length === 0 || isLoading}
            style={{ 
              padding: '0.75rem 1.5rem', backgroundColor: schemaData.length === 0 ? '#9ca3af' : '#6b7280', 
              color: 'white', borderRadius: '0.5rem', border: 'none', cursor: schemaData.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            Copy to Clipboard
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <p style={{ color: '#3b82f6', marginBottom: '1rem' }}>{progress}</p>
        )}

        {/* Error display */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
            <strong>Errors:</strong><br />{error}
          </div>
        )}

        {/* Results */}
        {schemaData.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Fetched {schemaData.length} Tables
            </h2>
            
            {schemaData.map((entity) => (
              <div key={entity.LogicalName} style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                  {entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  <code>{entity.LogicalName}</code> | Schema: <code>{entity.SchemaName}</code> | 
                  Primary ID: <code>{entity.PrimaryIdAttribute}</code>
                </p>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Display Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>LogicalName</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>SchemaName</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Custom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entity.Attributes
                        .filter(attr => attr.IsCustom || attr.IsPrimaryId || attr.IsPrimaryName)
                        .sort((a, b) => a.LogicalName.localeCompare(b.LogicalName))
                        .map((attr) => (
                          <tr key={attr.LogicalName}>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              {attr.DisplayName?.UserLocalizedLabel?.Label || '-'}
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              <code>{attr.LogicalName}</code>
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb', fontWeight: attr.LogicalName !== attr.SchemaName ? 'bold' : 'normal', color: attr.LogicalName !== attr.SchemaName ? '#dc2626' : 'inherit' }}>
                              <code>{attr.SchemaName}</code>
                              {attr.LogicalName !== attr.SchemaName && ' ⚠️'}
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              {attr.AttributeType}
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                              {attr.IsCustom ? '✓' : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataverseSchemaExporter;

