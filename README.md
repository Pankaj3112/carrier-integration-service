# Carrier Integration Service

A TypeScript service that fetches shipping rates from carrier APIs. Currently supports UPS, built so adding FedEx/DHL/USPS later doesn't require touching existing code.
This is a service layer that other code imports and uses.

## How it works

Caller sends a rate request (origin, destination, packages) and gets back normalized rate quotes from all registered carriers. The caller never deals with carrier-specific API formats.

```
ShippingService.getRates(request)
  -> validates input (Zod)
  -> UPSCarrierProvider.getRates()
    -> mapper converts clean types to UPS API format
    -> client makes HTTP call (with cached OAuth token)
    -> mapper converts UPS response back to clean types
  -> returns RateQuote[]
```

## Setup

```bash
npm install
cp .env.example .env   # fill in UPS credentials
```

```bash
npm test         # run tests
npm run build    # compile
```

## Project structure

```
src/
  carriers/
    carrier.interface.ts       # contract every carrier implements
    ups/
      ups.carrier.ts           # orchestrates the UPS flow
      ups.client.ts            # HTTP calls + OAuth token management
      ups.mapper.ts            # converts between our types and UPS types
      ups.types.ts             # raw UPS API shapes
  models.ts                    # domain types + Zod schemas
  errors.ts                    # structured error classes
  config.ts                    # env config
  shipping.service.ts          # main entry point
```

## Design decisions

**Two layers of types.** Domain types (`RateRequest`, `RateQuote`) are what callers use. UPS-specific types (`UPSRateRequest`, `UPSRateResponse`) match their API exactly. Mappers translate between them. This keeps carrier ugliness contained.

**Dependency injection for HTTP.** The UPS carrier accepts an Axios instance in its constructor, so tests can inject a mock. No real HTTP calls in tests.

**Structured errors.** Instead of generic Error throws, there are specific classes: `AuthenticationError`, `RateLimitError`, `NetworkError`, `CarrierApiError`, `ParseError`. Callers can catch by type.

**Auth is transparent.** OAuth tokens are fetched, cached, and refreshed automatically inside the client. The caller never knows tokens exist.

**Validation at the boundary.** Input gets validated once in `ShippingService` before any carrier code runs.

## Adding a new carrier

Create a folder under `src/carriers/` with four files:

- `types.ts` for the raw API shapes
- `client.ts` for HTTP + auth
- `mapper.ts` for converting to/from domain types
- `carrier.ts` implementing `CarrierProvider`

Then register it: `service.registerCarrier(new FedExCarrierProvider(config))`. That's it. Existing code doesn't change.

## Adding a new UPS operation (e.g. labels, tracking)

- Add types to `ups.types.ts`
- Add a method to `UPSApiClient` (reuses the same auth flow)
- Add mapper functions
- Add the method to `UPSCarrierProvider`

## What I'd improve with more time

- Response validation with Zod to catch unexpected API changes
- Retry with backoff for transient failures
- Rate response caching with TTL
- Circuit breaker to stop hitting a carrier after repeated failures
- Structured logging for debugging
