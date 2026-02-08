import { describe, it, expect, vi, beforeEach } from "vitest";
import { UPSApiClient } from "../../src/carriers/ups/ups.client.js";
import type { UPSConfig } from "../../src/config.js";
import type { UPSRateRequest } from "../../src/carriers/ups/ups.types.js";
import {
  AuthenticationError,
  CarrierApiError,
  NetworkError,
  RateLimitError,
} from "../../src/errors.js";
import authResponse from "../fixtures/ups-auth-response.json";
import rateResponse from "../fixtures/ups-rate-response.json";
import errorResponses from "../fixtures/ups-error-responses.json";

const config: UPSConfig = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  accountNumber: "TEST123",
  baseUrl: "https://onlinetools.ups.com",
};

const sampleRateRequest: UPSRateRequest = {
  RateRequest: {
    Request: { RequestOption: "Shop" },
    Shipment: {
      Shipper: {
        Name: "Shipper",
        ShipperNumber: "TEST123",
        Address: {
          AddressLine: ["123 St"],
          City: "NY",
          StateProvinceCode: "NY",
          PostalCode: "10001",
          CountryCode: "US",
        },
      },
      ShipTo: {
        Name: "Recipient",
        Address: {
          AddressLine: ["456 Ave"],
          City: "LA",
          StateProvinceCode: "CA",
          PostalCode: "90001",
          CountryCode: "US",
        },
      },
      Package: [
        {
          PackagingType: { Code: "02" },
          Dimensions: {
            UnitOfMeasurement: { Code: "IN" },
            Length: "10",
            Width: "8",
            Height: "6",
          },
          PackageWeight: { UnitOfMeasurement: { Code: "LBS" }, Weight: "5" },
        },
      ],
    },
  },
};

function createMockHttpClient() {
  return {
    request: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
}

describe("UPSApiClient", () => {
  let mockHttp: ReturnType<typeof createMockHttpClient>;
  let client: UPSApiClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    client = new UPSApiClient(config, mockHttp as any);
    vi.restoreAllMocks();
  });

  it("fetches token on first request", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);

    expect(mockHttp.request).toHaveBeenCalledTimes(2);
    const authCall = mockHttp.request.mock.calls[0]![0];
    expect(authCall.url).toBe("/security/v1/oauth/token");
    expect(authCall.data).toBe("grant_type=client_credentials");
  });

  it("reuses cached token on subsequent requests", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);
    await client.rate(sampleRateRequest);

    // 1 auth + 2 rate = 3 total
    expect(mockHttp.request).toHaveBeenCalledTimes(3);
  });

  it("refreshes token when expired", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: { ...authResponse, expires_in: "0" } })
      .mockResolvedValueOnce({ data: rateResponse })
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);
    await client.rate(sampleRateRequest);

    // 2 auth + 2 rate = 4 calls (token expired immediately)
    expect(mockHttp.request).toHaveBeenCalledTimes(4);
  });

  it("refreshes token when within 60s of expiry", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: { ...authResponse, expires_in: "30" } })
      .mockResolvedValueOnce({ data: rateResponse })
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);
    await client.rate(sampleRateRequest);

    expect(mockHttp.request).toHaveBeenCalledTimes(4);
  });

  it("401 from auth endpoint throws AuthenticationError", async () => {
    mockHttp.request.mockRejectedValueOnce({
      response: { status: 401, data: errorResponses.unauthorized },
      message: "Request failed with status code 401",
    });

    await expect(client.rate(sampleRateRequest)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it("429 throws RateLimitError", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockRejectedValueOnce({
        response: { status: 429, data: errorResponses.rateLimited },
        message: "Request failed with status code 429",
      });

    await expect(client.rate(sampleRateRequest)).rejects.toThrow(
      RateLimitError,
    );
  });

  it("500 throws CarrierApiError with status code", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockRejectedValueOnce({
        response: { status: 500, data: errorResponses.serverError },
        message: "Request failed with status code 500",
      });

    await expect(client.rate(sampleRateRequest)).rejects.toThrow(
      CarrierApiError,
    );
  });

  it("network timeout throws NetworkError", async () => {
    mockHttp.request.mockRejectedValueOnce({
      message: "timeout of 5000ms exceeded",
      code: "ECONNABORTED",
    });

    await expect(client.rate(sampleRateRequest)).rejects.toThrow(NetworkError);
  });

  it("sends Bearer token in authenticated requests", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);

    const rateCall = mockHttp.request.mock.calls[1]![0];
    expect(rateCall.headers.Authorization).toBe("Bearer test-token-abc123");
  });

  it("sends request to correct rating URL", async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await client.rate(sampleRateRequest);

    const rateCall = mockHttp.request.mock.calls[1]![0];
    expect(rateCall.url).toBe("/api/rating/v2409/Shop");
    expect(rateCall.method).toBe("POST");
  });
});
