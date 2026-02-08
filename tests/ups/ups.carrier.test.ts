import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UPSCarrierProvider } from '../../src/carriers/ups/ups.carrier.js';
import type { UPSConfig } from '../../src/config.js';
import type { RateRequest } from '../../src/models.js';
import { CarrierApiError } from '../../src/errors.js';
import authResponse from '../fixtures/ups-auth-response.json';
import rateResponse from '../fixtures/ups-rate-response.json';
import singleRateResponse from '../fixtures/ups-rate-response-single.json';
import errorResponses from '../fixtures/ups-error-responses.json';

const config: UPSConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  accountNumber: 'TEST123',
  baseUrl: 'https://onlinetools.ups.com',
};

const baseRequest: RateRequest = {
  origin: {
    street: '123 Sender St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    countryCode: 'US',
  },
  destination: {
    street: '456 Receiver Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    countryCode: 'US',
  },
  packages: [
    { weight: 5, length: 10, width: 8, height: 6, weightUnit: 'LBS', dimensionUnit: 'IN' },
  ],
};

function createMockHttpClient() {
  return {
    request: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
}

describe('UPSCarrierProvider', () => {
  let mockHttp: ReturnType<typeof createMockHttpClient>;
  let provider: UPSCarrierProvider;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    provider = new UPSCarrierProvider(config, mockHttp as any);
  });

  it('returns rate quotes for a valid request (full flow)', async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    const quotes = await provider.getRates(baseRequest);

    expect(quotes).toHaveLength(3);
    expect(quotes[0]!.carrier).toBe('UPS');
    expect(quotes[0]!.serviceCode).toBe('03');
    expect(quotes[0]!.totalPrice).toBe(11.3);
    expect(quotes[0]!.currency).toBe('USD');
  });

  it('handles multiple packages in request', async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    const multiPkgRequest: RateRequest = {
      ...baseRequest,
      packages: [
        { weight: 5, length: 10, width: 8, height: 6, weightUnit: 'LBS', dimensionUnit: 'IN' },
        { weight: 3, length: 7, width: 5, height: 4, weightUnit: 'LBS', dimensionUnit: 'IN' },
      ],
    };

    const quotes = await provider.getRates(multiPkgRequest);
    expect(quotes).toHaveLength(3);

    const rateCall = mockHttp.request.mock.calls[1]![0];
    expect(rateCall.data.RateRequest.Shipment.Package).toHaveLength(2);
  });

  it('sends Rate mode when serviceCode is specified', async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: rateResponse });

    await provider.getRates({ ...baseRequest, serviceCode: '03' });

    const rateCall = mockHttp.request.mock.calls[1]![0];
    expect(rateCall.url).toBe('/api/rating/v2409/Rate');
  });

  it('propagates errors from the client', async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockRejectedValueOnce({
        response: { status: 400, data: errorResponses.invalidAddress },
        message: 'Request failed with status code 400',
      });

    await expect(provider.getRates(baseRequest)).rejects.toThrow(CarrierApiError);
  });

  it('handles single RatedShipment response (Rate mode)', async () => {
    mockHttp.request
      .mockResolvedValueOnce({ data: authResponse })
      .mockResolvedValueOnce({ data: singleRateResponse });

    const quotes = await provider.getRates({ ...baseRequest, serviceCode: '03' });

    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.serviceCode).toBe('03');
    expect(quotes[0]!.totalPrice).toBe(15.54);
  });

  it('has name "UPS"', () => {
    expect(provider.name).toBe('UPS');
  });
});
