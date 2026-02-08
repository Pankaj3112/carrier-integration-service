export {
  AddressSchema,
  PackageSchema,
  RateRequestSchema,
  type Address,
  type Package,
  type RateRequest,
  type RateQuote,
} from "./models.js";

export {
  ShippingError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  CarrierApiError,
  NetworkError,
  ParseError,
} from "./errors.js";

export { ShippingService } from "./shipping.service.js";

export { type CarrierProvider } from "./carriers/carrier.interface.js";
export { UPSCarrierProvider } from "./carriers/ups/ups.carrier.js";

export { loadUPSConfig, type UPSConfig } from "./config.js";
