export class ShippingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly carrier?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ShippingError';
  }
}

export class ValidationError extends ShippingError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', undefined, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ShippingError {
  constructor(carrier: string, details?: unknown) {
    super(`Authentication failed for ${carrier}`, 'AUTHENTICATION_ERROR', carrier, details);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ShippingError {
  constructor(carrier: string, details?: unknown) {
    super(`Rate limit exceeded for ${carrier}`, 'RATE_LIMIT_ERROR', carrier, details);
    this.name = 'RateLimitError';
  }
}

export class CarrierApiError extends ShippingError {
  constructor(
    carrier: string,
    public readonly statusCode: number,
    message: string,
    details?: unknown,
  ) {
    super(message, 'CARRIER_API_ERROR', carrier, details);
    this.name = 'CarrierApiError';
  }
}

export class NetworkError extends ShippingError {
  constructor(carrier: string, details?: unknown) {
    super(`Network error communicating with ${carrier}`, 'NETWORK_ERROR', carrier, details);
    this.name = 'NetworkError';
  }
}

export class ParseError extends ShippingError {
  constructor(carrier: string, details?: unknown) {
    super(`Failed to parse response from ${carrier}`, 'PARSE_ERROR', carrier, details);
    this.name = 'ParseError';
  }
}
