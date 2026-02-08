import { describe, it, expect, vi } from 'vitest';
import { ShippingService } from '../src/shipping.service.js';
import { ValidationError, ShippingError } from '../src/errors.js';
import type { CarrierProvider } from '../src/carriers/carrier.interface.js';
import type { RateRequest, RateQuote } from '../src/models.js';

const validRequest: RateRequest = {
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

function createMockCarrier(name: string, quotes: RateQuote[]): CarrierProvider {
  return {
    name,
    getRates: vi.fn<(req: RateRequest) => Promise<RateQuote[]>>().mockResolvedValue(quotes),
  };
}

describe('ShippingService', () => {
  it('validates input before calling carrier', async () => {
    const mockCarrier = createMockCarrier('UPS', []);
    const service = new ShippingService();
    service.registerCarrier(mockCarrier);

    const badRequest = { ...validRequest, packages: [] } as any;

    await expect(service.getRates(badRequest)).rejects.toThrow(ValidationError);
    expect(mockCarrier.getRates).not.toHaveBeenCalled();
  });

  it('routes to correct carrier via getRatesFromCarrier', async () => {
    const upsQuotes: RateQuote[] = [
      { carrier: 'UPS', serviceName: 'UPS Ground', serviceCode: '03', totalPrice: 11.3, currency: 'USD', estimatedDays: null, guaranteedDelivery: false },
    ];
    const mockCarrier = createMockCarrier('UPS', upsQuotes);
    const service = new ShippingService();
    service.registerCarrier(mockCarrier);

    const quotes = await service.getRatesFromCarrier('UPS', validRequest);

    expect(quotes).toEqual(upsQuotes);
    expect(mockCarrier.getRates).toHaveBeenCalledOnce();
  });

  it('aggregates rates from multiple carriers', async () => {
    const upsQuotes: RateQuote[] = [
      { carrier: 'UPS', serviceName: 'UPS Ground', serviceCode: '03', totalPrice: 11.3, currency: 'USD', estimatedDays: null, guaranteedDelivery: false },
    ];
    const fedexQuotes: RateQuote[] = [
      { carrier: 'FedEx', serviceName: 'FedEx Ground', serviceCode: 'GROUND', totalPrice: 10.5, currency: 'USD', estimatedDays: 5, guaranteedDelivery: false },
    ];

    const service = new ShippingService();
    service.registerCarrier(createMockCarrier('UPS', upsQuotes));
    service.registerCarrier(createMockCarrier('FedEx', fedexQuotes));

    const quotes = await service.getRates(validRequest);

    expect(quotes).toHaveLength(2);
    expect(quotes.map((q) => q.carrier)).toContain('UPS');
    expect(quotes.map((q) => q.carrier)).toContain('FedEx');
  });

  it('handles carrier not found', async () => {
    const service = new ShippingService();

    await expect(service.getRatesFromCarrier('DHL', validRequest)).rejects.toThrow(ShippingError);
    await expect(service.getRatesFromCarrier('DHL', validRequest)).rejects.toThrow(
      /not registered/,
    );
  });

  it('throws ValidationError for missing postalCode', async () => {
    const service = new ShippingService();
    service.registerCarrier(createMockCarrier('UPS', []));

    const badRequest = {
      ...validRequest,
      origin: { ...validRequest.origin, postalCode: '' },
    };

    await expect(service.getRates(badRequest)).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for negative package weight', async () => {
    const service = new ShippingService();
    service.registerCarrier(createMockCarrier('UPS', []));

    const badRequest = {
      ...validRequest,
      packages: [{ weight: -1, length: 10, width: 8, height: 6, weightUnit: 'LBS' as const, dimensionUnit: 'IN' as const }],
    };

    await expect(service.getRates(badRequest)).rejects.toThrow(ValidationError);
  });

  it('continues when one carrier fails but another succeeds', async () => {
    const upsQuotes: RateQuote[] = [
      { carrier: 'UPS', serviceName: 'UPS Ground', serviceCode: '03', totalPrice: 11.3, currency: 'USD', estimatedDays: null, guaranteedDelivery: false },
    ];
    const failingCarrier: CarrierProvider = {
      name: 'FailCarrier',
      getRates: vi.fn().mockRejectedValue(new Error('Carrier down')),
    };

    const service = new ShippingService();
    service.registerCarrier(createMockCarrier('UPS', upsQuotes));
    service.registerCarrier(failingCarrier);

    const quotes = await service.getRates(validRequest);

    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.carrier).toBe('UPS');
  });
});
