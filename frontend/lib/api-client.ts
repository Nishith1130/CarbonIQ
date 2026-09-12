export class ApiClientError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.message || 'API Error');
    this.name = 'ApiClientError';
  }
}

let getAuthToken: () => string | null = () => null;

export function setTokenProvider(provider: () => string | null) {
  getAuthToken = provider;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}, retries = 1): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}${endpoint}`;
  
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    if (!response.ok) {
      if (response.status >= 500 && retries > 0) {
        return fetchApi(endpoint, options, retries - 1);
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      throw new ApiClientError(response.status, errorData);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.blob();
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
