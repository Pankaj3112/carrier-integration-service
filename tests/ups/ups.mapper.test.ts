import { describe, it, expect } from 'vitest';
import { UPSRateMapper } from '../../src/carriers/ups/ups.mapper.js';
import type { RateRequest } from '../../src/models.js';
import type { UPSRateResponse } from '../../src/carriers/ups/ups.types.js';
import rateResponse from '../fixtures/ups-rate-response.json';
import singleRateResponse from '../fixtures/ups-rate-response-single.json';

const ACCOUNT_NUMBER = 'TEST123';
const mapper = new UPSRateMapper(ACCOUNT_NUMBER);

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

describe('UPSRateMapper', () => {
  describe('toUPSRequest', () => {
    it('builds correct payload from domain RateRequest', () => {
      const result = mapper.toUPSRequest(baseRequest);

      expect(result.RateRequest.Shipment.Shipper.ShipperNumber).toBe(ACCOUNT_NUMBER);
      expect(result.RateRequest.Shipment.ShipTo.Address.City).toBe('Los Angeles');
      expect(result.RateRequest.Shipment.Package).toHaveLength(1);
      expect(result.RateRequest.Shipment.Package[0]!.PackageWeight.Weight).toBe('5');
    });

    it('uses Shop when no serviceCode provided', () => {
      const result = mapper.toUPSRequest(baseRequest);
      expect(result.RateRequest.Request.RequestOption).toBe('Shop');
      expect(result.RateRequest.Shipment.Service).toBeUndefined();
    });

    it('uses Rate with Service.Code when serviceCode provided', () => {
      const result = mapper.toUPSRequest({ ...baseRequest, serviceCode: '03' });
      expect(result.RateRequest.Request.RequestOption).toBe('Rate');
      expect(result.RateRequest.Shipment.Service).toEqual({ Code: '03' });
    });

    it('calculates ShipmentTotalWeight for multiple packages', () => {
      const multiPkg: RateRequest = {
        ...baseRequest,
        packages: [
          { weight: 5, length: 10, width: 8, height: 6, weightUnit: 'LBS', dimensionUnit: 'IN' },
          { weight: 3, length: 7, width: 5, height: 4, weightUnit: 'LBS', dimensionUnit: 'IN' },
        ],
      };
      const result = mapper.toUPSRequest(multiPkg);
      expect(result.RateRequest.Shipment.ShipmentTotalWeight?.Weight).toBe('8');
      expect(result.RateRequest.Shipment.Package).toHaveLength(2);
    });

    it('maps origin to both Shipper and ShipFrom', () => {
      const result = mapper.toUPSRequest(baseRequest);
      const shipperAddr = result.RateRequest.Shipment.Shipper.Address;
      const shipFromAddr = result.RateRequest.Shipment.ShipFrom!.Address;

      expect(shipperAddr).toEqual(shipFromAddr);
      expect(shipperAddr.City).toBe('New York');
      expect(shipperAddr.PostalCode).toBe('10001');
    });

    it('converts numeric dimensions to strings', () => {
      const result = mapper.toUPSRequest(baseRequest);
      const pkg = result.RateRequest.Shipment.Package[0]!;

      expect(pkg.Dimensions.Length).toBe('10');
      expect(pkg.Dimensions.Width).toBe('8');
      expect(pkg.Dimensions.Height).toBe('6');
      expect(pkg.PackageWeight.Weight).toBe('5');
    });
  });

  describe('fromUPSResponse', () => {
    it('maps RatedShipment[] to RateQuote[]', () => {
      const quotes = mapper.fromUPSResponse(rateResponse as UPSRateResponse);
      expect(quotes).toHaveLength(3);
      expect(quotes[0]!.carrier).toBe('UPS');
    });

    it('handles missing GuaranteedDelivery (estimatedDays = null)', () => {
      const quotes = mapper.fromUPSResponse(rateResponse as UPSRateResponse);
      const ground = quotes.find((q) => q.serviceCode === '03');
      expect(ground!.estimatedDays).toBeNull();
      expect(ground!.guaranteedDelivery).toBe(false);
    });

    it('maps service codes to human-readable names', () => {
      const quotes = mapper.fromUPSResponse(rateResponse as UPSRateResponse);
      const names = quotes.map((q) => q.serviceName);
      expect(names).toContain('UPS Ground');
      expect(names).toContain('UPS 2nd Day Air');
      expect(names).toContain('UPS Next Day Air');
    });

    it('parses monetary values from strings to numbers', () => {
      const quotes = mapper.fromUPSResponse(rateResponse as UPSRateResponse);
      const ground = quotes.find((q) => q.serviceCode === '03');
      expect(ground!.totalPrice).toBe(11.3);
      expect(typeof ground!.totalPrice).toBe('number');
    });

    it('extracts estimated days from GuaranteedDelivery', () => {
      const quotes = mapper.fromUPSResponse(rateResponse as UPSRateResponse);
      const nextDay = quotes.find((q) => q.serviceCode === '01');
      expect(nextDay!.estimatedDays).toBe(1);
      expect(nextDay!.guaranteedDelivery).toBe(true);
    });

    it('handles single RatedShipment object (Rate mode response)', () => {
      const quotes = mapper.fromUPSResponse(singleRateResponse as UPSRateResponse);
      expect(quotes).toHaveLength(1);
      expect(quotes[0]!.carrier).toBe('UPS');
      expect(quotes[0]!.serviceCode).toBe('03');
      expect(quotes[0]!.serviceName).toBe('UPS Ground');
      expect(quotes[0]!.totalPrice).toBe(15.54);
      expect(quotes[0]!.currency).toBe('USD');
    });
  });

  describe('toUPSRequest', () => {
    it('includes PaymentDetails with account number', () => {
      const result = mapper.toUPSRequest(baseRequest);
      expect(result.RateRequest.Shipment.PaymentDetails).toEqual({
        ShipmentCharge: {
          Type: '01',
          BillShipper: { AccountNumber: ACCOUNT_NUMBER },
        },
      });
    });

    it('includes NumOfPieces matching package count', () => {
      const multiPkg: RateRequest = {
        ...baseRequest,
        packages: [
          { weight: 5, length: 10, width: 8, height: 6, weightUnit: 'LBS', dimensionUnit: 'IN' },
          { weight: 3, length: 7, width: 5, height: 4, weightUnit: 'LBS', dimensionUnit: 'IN' },
        ],
      };
      const result = mapper.toUPSRequest(multiPkg);
      expect(result.RateRequest.Shipment.NumOfPieces).toBe('2');
    });

    it('includes Description in UnitOfMeasurement', () => {
      const result = mapper.toUPSRequest(baseRequest);
      const pkg = result.RateRequest.Shipment.Package;
      const firstPkg = Array.isArray(pkg) ? pkg[0]! : pkg;
      expect(firstPkg.Dimensions.UnitOfMeasurement.Description).toBe('Inches');
      expect(firstPkg.PackageWeight.UnitOfMeasurement.Description).toBe('Pounds');
    });
  });
});
