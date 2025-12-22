/**
 * Dataverse Web API Client
 * 
 * Handles authenticated requests to Dataverse Web API
 * Based on specification section 9.1
 */

import type { DataverseResponse } from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DATAVERSE_URL = import.meta.env.VITE_DATAVERSE_URL;
const API_VERSION = 'v9.2';

// =============================================================================
// ERROR TYPES
// =============================================================================

export class DataverseError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;
  public readonly innerError?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    innerError?: unknown
  ) {
    super(message);
    this.name = 'DataverseError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.innerError = innerError;
  }

  static fromResponse(response: Response, body?: unknown): DataverseError {
    const error = body as { error?: { message?: string; code?: string; innererror?: unknown } };
    return new DataverseError(
      error?.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      error?.error?.code,
      error?.error?.innererror
    );
  }
}

// =============================================================================
// QUERY OPTIONS
// =============================================================================

export interface QueryOptions {
  /** Fields to select (OData $select) */
  select?: string[];
  /** Filter expression (OData $filter) */
  filter?: string;
  /** Navigation properties to expand (OData $expand) */
  expand?: string[];
  /** Sort order (OData $orderby) */
  orderby?: string;
  /** Maximum records to return (OData $top) */
  top?: number;
  /** Number of records to skip (OData $skip) */
  skip?: number;
  /** Include total count in response (OData $count) */
  count?: boolean;
  /** Apply aggregation (OData $apply) */
  apply?: string;
}

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class DataverseClient {
  private baseUrl: string;
  private getAccessToken: () => Promise<string>;

  constructor(
    baseUrl: string,
    getAccessToken: () => Promise<string>
  ) {
    if (!baseUrl) {
      throw new Error('Dataverse URL is required. Set VITE_DATAVERSE_URL environment variable.');
    }
    this.baseUrl = `${baseUrl}/api/data/${API_VERSION}`;
    this.getAccessToken = getAccessToken;
  }

  /**
   * Build the full URL with query options
   */
  private buildUrl(entitySet: string, options?: QueryOptions): string {
    const url = new URL(`${this.baseUrl}/${entitySet}`);

    if (options) {
      if (options.select?.length) {
        url.searchParams.set('$select', options.select.join(','));
      }
      if (options.filter) {
        url.searchParams.set('$filter', options.filter);
      }
      if (options.expand?.length) {
        url.searchParams.set('$expand', options.expand.join(','));
      }
      if (options.orderby) {
        url.searchParams.set('$orderby', options.orderby);
      }
      if (options.top !== undefined) {
        url.searchParams.set('$top', options.top.toString());
      }
      if (options.skip !== undefined) {
        url.searchParams.set('$skip', options.skip.toString());
      }
      if (options.count) {
        url.searchParams.set('$count', 'true');
      }
      if (options.apply) {
        url.searchParams.set('$apply', options.apply);
      }
    }

    return url.toString();
  }

  /**
   * Get common headers for Dataverse requests
   */
  private async getHeaders(method: 'GET' | 'POST' | 'PATCH' | 'DELETE'): Promise<HeadersInit> {
    const token = await this.getAccessToken();

    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Accept': 'application/json',
      'Prefer': 'odata.include-annotations="*"',
    };

    if (method === 'POST' || method === 'PATCH') {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Handle response and extract data or throw error
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        // Body may not be JSON
      }
      throw DataverseError.fromResponse(response, body);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * GET multiple records from an entity set
   */
  async get<T>(entitySet: string, options?: QueryOptions): Promise<T[]> {
    const url = this.buildUrl(entitySet, options);
    const headers = await this.getHeaders('GET');

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await this.handleResponse<DataverseResponse<T>>(response);
    return data.value;
  }

  /**
   * GET multiple records with full response (includes count, nextLink)
   */
  async getWithMetadata<T>(
    entitySet: string,
    options?: QueryOptions
  ): Promise<DataverseResponse<T>> {
    const url = this.buildUrl(entitySet, { ...options, count: true });
    const headers = await this.getHeaders('GET');

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<DataverseResponse<T>>(response);
  }

  /**
   * GET a single record by ID
   */
  async getById<T>(
    entitySet: string,
    id: string,
    options?: Pick<QueryOptions, 'select' | 'expand'>
  ): Promise<T> {
    const url = this.buildUrl(`${entitySet}(${id})`, options);
    const headers = await this.getHeaders('GET');

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * CREATE a new record
   */
  async create<T>(entitySet: string, data: Partial<T>): Promise<T> {
    const url = `${this.baseUrl}/${entitySet}`;
    const headers = await this.getHeaders('POST');
    
    // Request the created record back
    (headers as Record<string, string>)['Prefer'] = 'return=representation';

    // Debug logging - log payload before sending
    const payload = JSON.stringify(data);
    console.log('[DataverseClient] CREATE entity:', entitySet);
    console.log('[DataverseClient] CREATE payload keys:', Object.keys(data as object));
    console.log('[DataverseClient] CREATE payload:', payload);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * UPDATE an existing record
   */
  async update<T>(
    entitySet: string,
    id: string,
    data: Partial<T>
  ): Promise<void> {
    const url = `${this.baseUrl}/${entitySet}(${id})`;
    const headers = await this.getHeaders('PATCH');

    // Debug logging - log payload before sending
    const payload = JSON.stringify(data);
    console.log('[DataverseClient] UPDATE entity:', entitySet, 'id:', id);
    console.log('[DataverseClient] UPDATE payload keys:', Object.keys(data as object));
    console.log('[DataverseClient] UPDATE payload:', payload);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: payload,
    });

    await this.handleResponse<void>(response);
  }

  /**
   * DELETE a record
   */
  async delete(entitySet: string, id: string): Promise<void> {
    const url = `${this.baseUrl}/${entitySet}(${id})`;
    const headers = await this.getHeaders('DELETE');

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    await this.handleResponse<void>(response);
  }

  /**
   * Associate two records (N:1 or N:N relationship)
   */
  async associate(
    entitySet: string,
    id: string,
    navigationProperty: string,
    relatedEntitySet: string,
    relatedId: string
  ): Promise<void> {
    const url = `${this.baseUrl}/${entitySet}(${id})/${navigationProperty}/$ref`;
    const headers = await this.getHeaders('POST');

    const body = {
      '@odata.id': `${this.baseUrl}/${relatedEntitySet}(${relatedId})`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    await this.handleResponse<void>(response);
  }

  /**
   * Disassociate two records
   */
  async disassociate(
    entitySet: string,
    id: string,
    navigationProperty: string,
    relatedId?: string
  ): Promise<void> {
    let url = `${this.baseUrl}/${entitySet}(${id})/${navigationProperty}/$ref`;
    if (relatedId) {
      url += `?$id=${this.baseUrl}/${entitySet}(${relatedId})`;
    }
    
    const headers = await this.getHeaders('DELETE');

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    await this.handleResponse<void>(response);
  }

  /**
   * Execute a batch request
   */
  async batch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const batchId = `batch_${crypto.randomUUID()}`;
    const url = `${this.baseUrl}/$batch`;
    const token = await this.getAccessToken();

    const batchBody = this.buildBatchBody(batchId, requests);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/mixed;boundary=${batchId}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
      },
      body: batchBody,
    });

    if (!response.ok) {
      throw DataverseError.fromResponse(response);
    }

    return this.parseBatchResponse(await response.text());
  }

  private buildBatchBody(batchId: string, requests: BatchRequest[]): string {
    let body = '';
    
    requests.forEach((request, index) => {
      body += `--${batchId}\r\n`;
      body += 'Content-Type: application/http\r\n';
      body += 'Content-Transfer-Encoding: binary\r\n\r\n';
      body += `${request.method} ${this.baseUrl}/${request.url} HTTP/1.1\r\n`;
      body += 'Content-Type: application/json\r\n';
      body += 'Accept: application/json\r\n';
      if (request.body) {
        body += `\r\n${JSON.stringify(request.body)}\r\n`;
      } else {
        body += '\r\n';
      }
    });

    body += `--${batchId}--\r\n`;
    return body;
  }

  private parseBatchResponse(responseText: string): BatchResponse[] {
    // Simplified batch response parsing
    // In production, this would need more robust parsing
    const responses: BatchResponse[] = [];
    const parts = responseText.split(/--batchresponse_[a-f0-9-]+/);
    
    for (const part of parts) {
      if (part.includes('HTTP/1.1')) {
        const statusMatch = part.match(/HTTP\/1\.1 (\d+)/);
        const bodyMatch = part.match(/\r\n\r\n({[\s\S]*})/);
        
        responses.push({
          status: statusMatch ? parseInt(statusMatch[1], 10) : 500,
          body: bodyMatch ? JSON.parse(bodyMatch[1]) : null,
        });
      }
    }

    return responses;
  }
}

// =============================================================================
// BATCH REQUEST TYPES
// =============================================================================

export interface BatchRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
}

export interface BatchResponse {
  status: number;
  body: unknown;
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: DataverseClient | null = null;

/**
 * Get the Dataverse client instance
 * Must be initialised with setTokenProvider first
 */
export function getDataverseClient(): DataverseClient {
  if (!clientInstance) {
    throw new Error(
      'DataverseClient not initialised. Call initDataverseClient() first.'
    );
  }
  return clientInstance;
}

/**
 * Initialise the Dataverse client with a token provider
 */
export function initDataverseClient(
  getAccessToken: () => Promise<string>
): DataverseClient {
  clientInstance = new DataverseClient(DATAVERSE_URL, getAccessToken);
  return clientInstance;
}

/**
 * Check if the client is initialised
 */
export function isDataverseClientInitialised(): boolean {
  return clientInstance !== null;
}
