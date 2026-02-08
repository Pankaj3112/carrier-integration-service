import type { RateRequest, RateQuote } from "../models.js";

export interface CarrierProvider {
  readonly name: string;
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
