import * as web3 from "@solana/web3.js";

// Define the RPC endpoints - FREE PUBLIC ENDPOINTS FIRST, PREMIUM AS BACKUP
const RPC_ENDPOINTS = {
  "mainnet-beta": [
    // Free public endpoints (primary) - from comparenodes.com
    "https://solana-rpc.publicnode.com", // Allnodes - reliable free
    "https://solana.drpc.org/", // dRPC - reliable free
    "https://api.mainnet-beta.solana.com", // Official Solana Foundation
    "https://endpoints.omniatech.io/v1/sol/mainnet/public", // OMNIA free
    "https://solana.api.onfinality.io/public", // OnFinality free
    "https://go.getblock.io/4136d34f90a6488b84214ae26f0ed5f4", // GetBlock free
    // Premium endpoints as backup only
    "https://quick-rough-dew.solana-mainnet.quiknode.pro/0c3c8c1c4c3c4e4e4e4e4e4e4e4e4e4e4e4e4e4e/",
    "https://solana-api.projectserum.com/"
  ],
  "devnet": [
    "https://solana-devnet.drpc.org/", // dRPC devnet free
    "https://api.devnet.solana.com", // Official Solana Foundation
    "https://endpoints.omniatech.io/v1/sol/devnet/public" // OMNIA devnet free
  ]
};

// Rate limiting and retry configuration
interface RateLimitConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  requestsPerSecond: number;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 1, // Allow 1 retry for free endpoints
  baseDelay: 3000, // 3 seconds (more reasonable for free endpoints)
  maxDelay: 15000, // 15 seconds max
  requestsPerSecond: 0.5 // Conservative but reasonable - 1 request per 2 seconds
};

// Track endpoint usage and failures
interface EndpointStats {
  failures: number;
  lastFailure: number;
  lastRequest: number;
  requestCount: number;
}

const endpointStats = new Map<string, EndpointStats>();

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limiting queue
const requestQueue = new Map<string, number[]>();

// Simple cache to avoid redundant requests
interface CacheEntry {
  connection: web3.Connection;
  timestamp: number;
}
const connectionCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 120000; // 2 minutes cache (reasonable)

// Global request queue to serialize all RPC requests
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  fn: () => Promise<any>;
  timestamp: number;
}

const globalRequestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests (reasonable for free endpoints)
let lastRequestTime = 0;

/**
 * Process the global request queue with strict rate limiting
 */
async function processRequestQueue(): Promise<void> {
  if (isProcessingQueue || globalRequestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (globalRequestQueue.length > 0) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    // Ensure minimum interval between requests
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await sleep(waitTime);
    }

    const request = globalRequestQueue.shift();
    if (!request) break;

    try {
      console.log(`Processing queued request (${globalRequestQueue.length} remaining)`);
      const result = await request.fn();
      request.resolve(result);
      lastRequestTime = Date.now();
    } catch (error) {
      console.error('Queued request failed:', error);
      request.reject(error);
    }

    // Small additional delay to be safe
    await sleep(500); // 500ms additional delay
  }

  isProcessingQueue = false;
}

/**
 * Queue a request to be processed with rate limiting
 */
function queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    globalRequestQueue.push({
      resolve,
      reject,
      fn,
      timestamp: Date.now()
    });

    // Start processing if not already running
    processRequestQueue().catch(console.error);
  });
}

/**
 * Check if we can make a request to this endpoint (rate limiting)
 */
function canMakeRequest(endpoint: string): boolean {
  const now = Date.now();
  const requests = requestQueue.get(endpoint) || [];

  // Remove requests older than 1 second
  const recentRequests = requests.filter(time => now - time < 1000);
  requestQueue.set(endpoint, recentRequests);

  return recentRequests.length < RATE_LIMIT_CONFIG.requestsPerSecond;
}

/**
 * Record a request to an endpoint
 */
function recordRequest(endpoint: string): void {
  const now = Date.now();
  const requests = requestQueue.get(endpoint) || [];
  requests.push(now);
  requestQueue.set(endpoint, requests);
}

/**
 * Check if an endpoint is healthy (not recently failed)
 */
function isEndpointHealthy(endpoint: string): boolean {
  const stats = endpointStats.get(endpoint);
  if (!stats) return true;

  const now = Date.now();
  const timeSinceFailure = now - stats.lastFailure;

  // If endpoint failed recently, apply exponential backoff
  if (stats.failures > 0) {
    const backoffTime = Math.min(
      RATE_LIMIT_CONFIG.baseDelay * Math.pow(2, stats.failures - 1),
      RATE_LIMIT_CONFIG.maxDelay
    );
    return timeSinceFailure > backoffTime;
  }

  return true;
}

/**
 * Record endpoint failure
 */
function recordFailure(endpoint: string): void {
  const stats = endpointStats.get(endpoint) || {
    failures: 0,
    lastFailure: 0,
    lastRequest: 0,
    requestCount: 0
  };

  stats.failures++;
  stats.lastFailure = Date.now();
  endpointStats.set(endpoint, stats);
}

/**
 * Record endpoint success (reset failure count)
 */
function recordSuccess(endpoint: string): void {
  const stats = endpointStats.get(endpoint) || {
    failures: 0,
    lastFailure: 0,
    lastRequest: 0,
    requestCount: 0
  };

  stats.failures = 0; // Reset failure count on success
  stats.lastRequest = Date.now();
  stats.requestCount++;
  endpointStats.set(endpoint, stats);
}

/**
 * Get the best available endpoint from the list
 */
function getBestEndpoint(endpoints: string[]): string | null {
  // Filter healthy endpoints that can accept requests
  const availableEndpoints = endpoints.filter(endpoint =>
    isEndpointHealthy(endpoint) && canMakeRequest(endpoint)
  );

  if (availableEndpoints.length === 0) {
    // If no endpoints are available, return the one with oldest failure
    const sortedByFailure = endpoints.sort((a, b) => {
      const statsA = endpointStats.get(a);
      const statsB = endpointStats.get(b);
      const timeA = statsA?.lastFailure || 0;
      const timeB = statsB?.lastFailure || 0;
      return timeA - timeB;
    });
    return sortedByFailure[0];
  }

  // Return the endpoint with least recent usage
  return availableEndpoints.sort((a, b) => {
    const statsA = endpointStats.get(a);
    const statsB = endpointStats.get(b);
    const timeA = statsA?.lastRequest || 0;
    const timeB = statsB?.lastRequest || 0;
    return timeA - timeB;
  })[0];
}

/**
 * Create a connection with retry logic and rate limiting
 */
async function createConnectionWithRetry(endpoint: string): Promise<web3.Connection> {
  return queueRequest(async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RATE_LIMIT_CONFIG.maxRetries; attempt++) {
      try {
        recordRequest(endpoint);

        const connection = new web3.Connection(endpoint, {
          commitment: "confirmed" as web3.Commitment,
          confirmTransactionInitialTimeout: 30000,
          disableRetryOnRateLimit: false
        });

        // Test the connection with a simple call
        await connection.getLatestBlockhash();

        recordSuccess(endpoint);
        console.log(`Successfully connected to ${endpoint}`);
        return connection;

      } catch (error: any) {
        lastError = error;
        recordFailure(endpoint);

        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.warn(`Rate limited on ${endpoint}, attempt ${attempt + 1}`);
          const delay = RATE_LIMIT_CONFIG.baseDelay * Math.pow(2, attempt);
          await sleep(Math.min(delay, RATE_LIMIT_CONFIG.maxDelay));
        } else {
          console.error(`Connection failed on ${endpoint}, attempt ${attempt + 1}:`, error.message);
          await sleep(1000 * (attempt + 1)); // Linear backoff for other errors
        }
      }
    }

    throw lastError || new Error(`Failed to connect to ${endpoint} after ${RATE_LIMIT_CONFIG.maxRetries} attempts`);
  });
}

/**
 * Return a Solana connection using the configured RPC endpoints.
 * Implements rate limiting, retry logic, caching, and automatic failover.
 */
export async function getConnection(
  cluster: "mainnet-beta" | "devnet" = "mainnet-beta"
): Promise<web3.Connection> {
  const cacheKey = `connection_${cluster}`;
  const now = Date.now();

  // Check cache first
  const cached = connectionCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using cached connection for ${cluster}`);
    return cached.connection;
  }

  const endpoints = RPC_ENDPOINTS[cluster] || RPC_ENDPOINTS["devnet"];

  // Try endpoints in order of preference/health
  for (const endpoint of endpoints) {
    const bestEndpoint = getBestEndpoint([endpoint]);
    if (!bestEndpoint) continue;

    try {
      const connection = await createConnectionWithRetry(bestEndpoint);

      // Cache the successful connection
      connectionCache.set(cacheKey, {
        connection,
        timestamp: now
      });

      return connection;
    } catch (error) {
      console.error(`Failed to connect to ${bestEndpoint}:`, error);
      continue;
    }
  }

  // Last resort: try all endpoints one more time
  console.warn("All preferred endpoints failed, trying all endpoints...");
  for (const endpoint of endpoints) {
    try {
      const connection = await createConnectionWithRetry(endpoint);

      // Cache even fallback connections
      connectionCache.set(cacheKey, {
        connection,
        timestamp: now
      });

      return connection;
    } catch (error) {
      console.error(`Final attempt failed for ${endpoint}:`, error);
    }
  }

  // Ultimate fallback
  console.error("All RPC endpoints failed, using basic devnet connection");
  const fallbackConnection = new web3.Connection("https://api.devnet.solana.com", "confirmed" as web3.Commitment);

  // Cache even the ultimate fallback
  connectionCache.set(cacheKey, {
    connection: fallbackConnection,
    timestamp: now
  });

  return fallbackConnection;
}

/**
 * Synchronous version for backward compatibility
 * Note: This doesn't include the advanced retry logic
 */
export function getConnectionSync(
  cluster: "mainnet-beta" | "devnet" = "mainnet-beta"
): web3.Connection {
  const endpoints = RPC_ENDPOINTS[cluster] || RPC_ENDPOINTS["devnet"];
  const bestEndpoint = getBestEndpoint(endpoints);

  if (bestEndpoint && canMakeRequest(bestEndpoint)) {
    recordRequest(bestEndpoint);
    try {
      const connection = new web3.Connection(bestEndpoint, "confirmed" as web3.Commitment);
      recordSuccess(bestEndpoint);
      return connection;
    } catch (error) {
      recordFailure(bestEndpoint);
    }
  }

  // Fallback to first available endpoint
  return new web3.Connection(endpoints[0], "confirmed" as web3.Commitment);
}
