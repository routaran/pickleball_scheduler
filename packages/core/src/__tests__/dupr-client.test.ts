/**
 * Unit tests for DUPRClient
 * Tests cover: constructor, searchPlayers, error handling, rate limiting, retries, and apiHitToPlayer
 */

import axios, { AxiosInstance } from 'axios';
import {
  DUPRClient,
  DUPRAPIError,
  TokenExpiredError,
  RateLimitError,
  PlayerNotFoundError,
  apiHitToPlayer,
  DUPRAPIHit,
  DUPRAPIResponse,
  DUPR_API_URL,
  REQUEST_DELAY_MS,
  RETRY_COUNT,
  RETRY_DELAY_MS,
} from '../dupr-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DUPRClient', () => {
  let client: DUPRClient;
  let mockAxiosInstance: jest.Mocked<Pick<AxiosInstance, 'post' | 'defaults'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockAxiosInstance = {
      post: jest.fn(),
      defaults: { headers: {} as any },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    mockedAxios.isAxiosError.mockImplementation((error: any) => error?.isAxiosError === true);

    client = new DUPRClient('test-token');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create axios instance with correct base URL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.dupr.gg',
        })
      );
    });

    it('should set Authorization header correctly', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should create instance with different tokens', () => {
      mockedAxios.create.mockClear();
      new DUPRClient('another-token');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer another-token',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // searchPlayers Success Tests
  // ==========================================================================

  describe('searchPlayers - success cases', () => {
    it('should return array of DUPRPlayer objects on successful response', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: {
            hits: [
              {
                id: 12345,
                fullName: 'John A. Smith',
                firstName: 'John',
                lastName: 'Smith',
                duprId: 'ABC123',
                shortAddress: 'Edmonton, AB, CA',
                ratings: {
                  singles: 3.95,
                  doubles: 4.25,
                  singlesVerified: true,
                  doublesVerified: true,
                },
              },
            ],
            total: 1,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const players = await client.searchPlayers('John Smith');

      expect(players).toHaveLength(1);
      expect(players[0].id).toBe(12345);
      expect(players[0].fullName).toBe('John A. Smith');
      expect(players[0].duprId).toBe('ABC123');
      expect(players[0].ratings.doubles).toBe(4.25);
      expect(players[0].ratings.singles).toBe(3.95);
      expect(players[0].bestRating).toBe(4.25);
    });

    it('should transform API response correctly with multiple players', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: {
            hits: [
              {
                id: 12345,
                fullName: 'John A. Smith',
                duprId: 'ABC123',
                shortAddress: 'Edmonton, AB, CA',
                ratings: { singles: 3.95, doubles: 4.25, singlesVerified: true, doublesVerified: true },
              },
              {
                id: 67890,
                fullName: 'John B. Smith',
                duprId: 'XYZ789',
                shortAddress: 'Vancouver, BC, CA',
                ratings: { singles: 'NR', doubles: 3.50, singlesVerified: 'NR', doublesVerified: false },
              },
            ],
            total: 2,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const players = await client.searchPlayers('John Smith');

      expect(players).toHaveLength(2);
      expect(players[0].fullName).toBe('John A. Smith');
      expect(players[1].fullName).toBe('John B. Smith');
      expect(players[1].ratings.singles).toBeNull(); // NR converted to null
    });

    it('should handle location parameters correctly', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: {
            hits: [],
            total: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await client.searchPlayers('John Smith', 'Alberta, Canada', 53.5461, -113.4938);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/player/v1.0/search',
        expect.objectContaining({
          filter: expect.objectContaining({
            locationText: 'Alberta, Canada',
            lat: 53.5461,
            lng: -113.4938,
          }),
          query: 'John Smith',
        })
      );
    });

    it('should handle empty results', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: {
            hits: [],
            total: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const players = await client.searchPlayers('NonexistentPlayer');

      expect(players).toEqual([]);
    });

    it('should return empty array on non-SUCCESS response', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'ERROR',
          error: 'Something went wrong',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const players = await client.searchPlayers('Unknown');

      expect(players).toEqual([]);
    });

    it('should return empty array when result is missing', async () => {
      const mockResponse: { data: Partial<DUPRAPIResponse> } = {
        data: {
          status: 'SUCCESS',
          // result is missing
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const players = await client.searchPlayers('Test');

      expect(players).toEqual([]);
    });

    it('should send correct default request parameters', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: { hits: [], total: 0 },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await client.searchPlayers('Test Query');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/player/v1.0/search',
        expect.objectContaining({
          query: 'Test Query',
          limit: 20,
          offset: 0,
          filter: expect.objectContaining({
            locationText: '',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should throw TokenExpiredError on 401', async () => {
      const axiosError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        isAxiosError: true,
        message: 'Request failed with status code 401',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.searchPlayers('test')).rejects.toThrow(TokenExpiredError);
    });

    it('should throw RateLimitError on 429 after retries', async () => {
      const axiosError = {
        response: { status: 429, data: { message: 'Rate limit exceeded' } },
        isAxiosError: true,
        message: 'Request failed with status code 429',
      };
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      // Start the request and run all timers together
      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      // Wait for both to settle
      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(RateLimitError);
      }
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(RETRY_COUNT);
    });

    it('should throw DUPRAPIError on network error', async () => {
      const networkError = {
        message: 'Network Error',
        isAxiosError: true,
        code: 'ERR_NETWORK',
      };
      mockAxiosInstance.post.mockRejectedValue(networkError);

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(DUPRAPIError);
        expect(searchResult.reason.message).toBe('Network Error');
      }
    });

    it('should throw DUPRAPIError with status code on other HTTP errors', async () => {
      const axiosError = {
        response: { status: 500, data: { message: 'Internal Server Error' } },
        isAxiosError: true,
        message: 'Request failed with status code 500',
      };
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(DUPRAPIError);
      }
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(RETRY_COUNT);
    });

    it('should not retry on 401 errors', async () => {
      const axiosError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        isAxiosError: true,
        message: 'Request failed with status code 401',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.searchPlayers('test')).rejects.toThrow(TokenExpiredError);

      // Should only be called once (no retries)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should handle non-axios errors', async () => {
      const genericError = new Error('Unexpected error');
      mockAxiosInstance.post.mockRejectedValue(genericError);

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(DUPRAPIError);
        expect(searchResult.reason.message).toBe('Unexpected error');
      }
    });
  });

  // ==========================================================================
  // Rate Limiting Tests
  // ==========================================================================

  describe('rate limiting', () => {
    it('should delay between consecutive requests', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: { hits: [], total: 0 },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // First request
      const promise1 = client.searchPlayers('Query 1');
      await jest.advanceTimersByTimeAsync(0); // Let the first request resolve
      await promise1;

      // Second request immediately after
      const promise2 = client.searchPlayers('Query 2');

      // Should wait for the delay
      await jest.advanceTimersByTimeAsync(REQUEST_DELAY_MS);
      await promise2;

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should enforce REQUEST_DELAY_MS between requests', async () => {
      const mockResponse: { data: DUPRAPIResponse } = {
        data: {
          status: 'SUCCESS',
          result: { hits: [], total: 0 },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      // Verify constant value
      expect(REQUEST_DELAY_MS).toBe(500);

      const promise = client.searchPlayers('Test');
      await jest.advanceTimersByTimeAsync(REQUEST_DELAY_MS);
      await promise;
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================

  describe('retry logic', () => {
    it('should retry on 500 errors and succeed on recovery', async () => {
      const axiosError = {
        response: { status: 500, data: { message: 'Internal Server Error' } },
        isAxiosError: true,
        message: 'Request failed with status code 500',
      };

      // First two calls fail, third succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce(axiosError)
        .mockRejectedValueOnce(axiosError)
        .mockResolvedValueOnce({
          data: {
            status: 'SUCCESS',
            result: { hits: [], total: 0 },
          },
        });

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('fulfilled');
      if (searchResult.status === 'fulfilled') {
        expect(searchResult.value).toEqual([]);
      }
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 401 errors', async () => {
      const axiosError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        isAxiosError: true,
        message: 'Request failed with status code 401',
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError);

      await expect(client.searchPlayers('test')).rejects.toThrow(TokenExpiredError);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should retry with backoff on 429 and throw after exhausting retries', async () => {
      const axiosError = {
        response: { status: 429, data: { message: 'Rate limit exceeded' } },
        isAxiosError: true,
        message: 'Request failed with status code 429',
      };

      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(RateLimitError);
      }
      // Should have attempted RETRY_COUNT times
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(RETRY_COUNT);
    });

    it('should exhaust all retries before throwing', async () => {
      const axiosError = {
        response: { status: 503, data: { message: 'Service Unavailable' } },
        isAxiosError: true,
        message: 'Request failed with status code 503',
      };
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const searchPromise = client.searchPlayers('test');
      const timerPromise = jest.runAllTimersAsync();

      const [searchResult] = await Promise.allSettled([searchPromise, timerPromise]);

      expect(searchResult.status).toBe('rejected');
      if (searchResult.status === 'rejected') {
        expect(searchResult.reason).toBeInstanceOf(DUPRAPIError);
      }
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(RETRY_COUNT);
    });

    it('should verify RETRY_COUNT and RETRY_DELAY_MS constants', () => {
      expect(RETRY_COUNT).toBe(3);
      expect(RETRY_DELAY_MS).toBe(2000);
    });
  });

  // ==========================================================================
  // setToken Tests
  // ==========================================================================

  describe('setToken', () => {
    it('should update the authorization header', () => {
      client.setToken('new-token');

      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe('Bearer new-token');
    });

    it('should allow multiple token updates', () => {
      client.setToken('token-1');
      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe('Bearer token-1');

      client.setToken('token-2');
      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe('Bearer token-2');
    });
  });
});

// ==========================================================================
// apiHitToPlayer Helper Tests
// ==========================================================================

describe('apiHitToPlayer', () => {
  it('should convert API hit to DUPRPlayer', () => {
    const hit: DUPRAPIHit = {
      id: 12345,
      fullName: 'John A. Smith',
      firstName: 'John',
      lastName: 'Smith',
      duprId: 'ABC123',
      shortAddress: 'Edmonton, AB, CA',
      ratings: {
        singles: 3.95,
        doubles: 4.25,
        singlesVerified: true,
        doublesVerified: true,
      },
    };

    const player = apiHitToPlayer(hit);

    expect(player.id).toBe(12345);
    expect(player.fullName).toBe('John A. Smith');
    expect(player.firstName).toBe('John');
    expect(player.lastName).toBe('Smith');
    expect(player.duprId).toBe('ABC123');
    expect(player.shortAddress).toBe('Edmonton, AB, CA');
    expect(player.ratings.singles).toBe(3.95);
    expect(player.ratings.doubles).toBe(4.25);
    expect(player.ratings.singlesVerified).toBe(true);
    expect(player.ratings.doublesVerified).toBe(true);
    expect(player.bestRating).toBe(4.25);
    expect(player.profileUrl).toBe('https://dashboard.dupr.com/dashboard/player/12345');
  });

  it('should handle NR ratings as null', () => {
    const hit: DUPRAPIHit = {
      id: 67890,
      fullName: 'New Player',
      duprId: 'XYZ789',
      shortAddress: 'Calgary, AB',
      ratings: {
        singles: 'NR',
        doubles: 'NR',
        singlesVerified: 'NR',
        doublesVerified: 'NR',
      },
    };

    const player = apiHitToPlayer(hit);

    expect(player.ratings.singles).toBeNull();
    expect(player.ratings.doubles).toBeNull();
    expect(player.ratings.singlesVerified).toBe(false);
    expect(player.ratings.doublesVerified).toBe(false);
    expect(player.bestRating).toBeNull();
  });

  it('should prefer doubles rating for bestRating when both available', () => {
    const hit: DUPRAPIHit = {
      id: 123,
      fullName: 'Test Player',
      duprId: 'T1',
      shortAddress: 'City',
      ratings: {
        singles: 4.5,
        doubles: 3.8,
        singlesVerified: true,
        doublesVerified: true,
      },
    };

    const player = apiHitToPlayer(hit);
    expect(player.bestRating).toBe(3.8); // Prefers doubles over singles
  });

  it('should use singles rating for bestRating when doubles is NR', () => {
    const hit: DUPRAPIHit = {
      id: 123,
      fullName: 'Singles Player',
      duprId: 'S1',
      shortAddress: 'City',
      ratings: {
        singles: 4.0,
        doubles: 'NR',
        singlesVerified: true,
        doublesVerified: 'NR',
      },
    };

    const player = apiHitToPlayer(hit);
    expect(player.bestRating).toBe(4.0);
  });

  it('should use doubles rating for bestRating when singles is NR', () => {
    const hit: DUPRAPIHit = {
      id: 123,
      fullName: 'Doubles Player',
      duprId: 'D1',
      shortAddress: 'City',
      ratings: {
        singles: 'NR',
        doubles: 3.5,
        singlesVerified: 'NR',
        doublesVerified: true,
      },
    };

    const player = apiHitToPlayer(hit);
    expect(player.bestRating).toBe(3.5);
  });

  it('should build profile URL correctly', () => {
    const hit: DUPRAPIHit = {
      id: 99999,
      fullName: 'Test',
      duprId: 'T99',
      shortAddress: 'Location',
      ratings: { singles: 3.0, doubles: 3.0, singlesVerified: true, doublesVerified: true },
    };

    const player = apiHitToPlayer(hit);
    expect(player.profileUrl).toBe('https://dashboard.dupr.com/dashboard/player/99999');
  });

  it('should handle missing firstName and lastName', () => {
    const hit: DUPRAPIHit = {
      id: 123,
      fullName: 'FullName Only',
      duprId: 'F1',
      shortAddress: 'City',
      ratings: { singles: 3.0, doubles: 3.0, singlesVerified: true, doublesVerified: true },
    };

    const player = apiHitToPlayer(hit);
    expect(player.firstName).toBe('');
    expect(player.lastName).toBe('');
    expect(player.fullName).toBe('FullName Only');
  });

  it('should handle verified flags as boolean NR', () => {
    const hit: DUPRAPIHit = {
      id: 123,
      fullName: 'Mixed Verified',
      duprId: 'M1',
      shortAddress: 'City',
      ratings: {
        singles: 3.5,
        doubles: 4.0,
        singlesVerified: 'NR', // NR as string
        doublesVerified: false, // boolean false
      },
    };

    const player = apiHitToPlayer(hit);
    expect(player.ratings.singlesVerified).toBe(false);
    expect(player.ratings.doublesVerified).toBe(false);
  });
});

// ==========================================================================
// Error Class Tests
// ==========================================================================

describe('Error classes', () => {
  describe('DUPRAPIError', () => {
    it('should create error with message and status code', () => {
      const error = new DUPRAPIError('Test error', 500);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('DUPRAPIError');
    });

    it('should create error with message only', () => {
      const error = new DUPRAPIError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBeUndefined();
    });
  });

  describe('TokenExpiredError', () => {
    it('should have default message', () => {
      const error = new TokenExpiredError();
      expect(error.message).toBe('Authentication token expired');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('TokenExpiredError');
    });

    it('should allow custom message', () => {
      const error = new TokenExpiredError('Custom message');
      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(401);
    });

    it('should be instanceof DUPRAPIError', () => {
      const error = new TokenExpiredError();
      expect(error).toBeInstanceOf(DUPRAPIError);
    });
  });

  describe('RateLimitError', () => {
    it('should have default message', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should allow custom message', () => {
      const error = new RateLimitError('Custom rate limit message');
      expect(error.message).toBe('Custom rate limit message');
    });

    it('should be instanceof DUPRAPIError', () => {
      const error = new RateLimitError();
      expect(error).toBeInstanceOf(DUPRAPIError);
    });
  });

  describe('PlayerNotFoundError', () => {
    it('should include player query in message', () => {
      const error = new PlayerNotFoundError('John Smith');
      expect(error.message).toBe('Player not found: John Smith');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('PlayerNotFoundError');
    });

    it('should be instanceof DUPRAPIError', () => {
      const error = new PlayerNotFoundError('Test');
      expect(error).toBeInstanceOf(DUPRAPIError);
    });
  });
});

// ==========================================================================
// Constants Tests
// ==========================================================================

describe('Constants', () => {
  it('should export correct DUPR_API_URL', () => {
    expect(DUPR_API_URL).toBe('https://api.dupr.gg/player/v1.0/search');
  });

  it('should export correct REQUEST_DELAY_MS', () => {
    expect(REQUEST_DELAY_MS).toBe(500);
  });

  it('should export correct RETRY_COUNT', () => {
    expect(RETRY_COUNT).toBe(3);
  });

  it('should export correct RETRY_DELAY_MS', () => {
    expect(RETRY_DELAY_MS).toBe(2000);
  });
});
