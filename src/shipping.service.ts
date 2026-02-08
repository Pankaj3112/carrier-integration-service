import type { CarrierProvider } from './carriers/carrier.interface.js';
import type { RateRequest, RateQuote } from './models.js';
import { RateRequestSchema } from './models.js';
import { ValidationError, ShippingError } from './errors.js';

export class ShippingService {
  private readonly carriers = new Map<string, CarrierProvider>();

  registerCarrier(carrier: CarrierProvider): void {
    this.carriers.set(carrier.name, carrier);
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const validated = this.validate(request);

    const results = await Promise.allSettled(
      [...this.carriers.values()].map((c) => c.getRates(validated)),
    );

    const quotes: RateQuote[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        quotes.push(...result.value);
      }
    }

    return quotes;
  }

  async getRatesFromCarrier(carrierName: string, request: RateRequest): Promise<RateQuote[]> {
    const validated = this.validate(request);

    const carrier = this.carriers.get(carrierName);
    if (!carrier) {
      throw new ShippingError(
        `Carrier "${carrierName}" is not registered`,
        'CARRIER_NOT_FOUND',
      );
    }

    return carrier.getRates(validated);
  }

  private validate(request: RateRequest): RateRequest {
    const result = RateRequestSchema.safeParse(request);
    if (!result.success) {
      throw new ValidationError('Invalid rate request', result.error.issues);
    }
    return result.data;
  }
}
