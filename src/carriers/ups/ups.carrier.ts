import type { AxiosInstance } from 'axios';
import type { UPSConfig } from '../../config.js';
import type { CarrierProvider } from '../carrier.interface.js';
import type { RateRequest, RateQuote } from '../../models.js';
import { UPSApiClient } from './ups.client.js';
import { UPSRateMapper } from './ups.mapper.js';

export class UPSCarrierProvider implements CarrierProvider {
  readonly name = 'UPS';
  private readonly client: UPSApiClient;
  private readonly mapper: UPSRateMapper;

  constructor(config: UPSConfig, httpClient: AxiosInstance) {
    this.client = new UPSApiClient(config, httpClient);
    this.mapper = new UPSRateMapper(config.accountNumber);
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const upsRequest = this.mapper.toUPSRequest(request);
    const upsResponse = await this.client.rate(upsRequest);
    return this.mapper.fromUPSResponse(upsResponse);
  }
}
