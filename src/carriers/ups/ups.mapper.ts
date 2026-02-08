import type { RateRequest, RateQuote } from '../../models.js';
import type { UPSRateRequest, UPSRateResponse, UPSRatedShipment } from './ups.types.js';

const UPS_SERVICE_CODES: Record<string, string> = {
  '01': 'UPS Next Day Air',
  '02': 'UPS 2nd Day Air',
  '03': 'UPS Ground',
  '07': 'UPS Worldwide Express',
  '08': 'UPS Expedited',
  '11': 'UPS Standard',
  '12': 'UPS 3 Day Select',
  '13': 'UPS Next Day Air Saver',
  '14': 'UPS Next Day Air Early',
  '54': 'UPS Worldwide Express Plus',
  '59': 'UPS 2nd Day Air A.M.',
  '65': 'UPS Worldwide Saver',
};

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export class UPSRateMapper {
  constructor(private readonly accountNumber: string) {}

  toUPSRequest(request: RateRequest): UPSRateRequest {
    const hasServiceCode = request.serviceCode !== undefined;

    const shipperAddress = {
      AddressLine: [request.origin.street],
      City: request.origin.city,
      StateProvinceCode: request.origin.state,
      PostalCode: request.origin.postalCode,
      CountryCode: request.origin.countryCode,
    };

    const packages = request.packages.map((pkg) => ({
      PackagingType: { Code: '02', Description: 'Customer Supplied Package' },
      Dimensions: {
        UnitOfMeasurement: { Code: pkg.dimensionUnit, Description: pkg.dimensionUnit === 'IN' ? 'Inches' : 'Centimeters' },
        Length: String(pkg.length),
        Width: String(pkg.width),
        Height: String(pkg.height),
      },
      PackageWeight: {
        UnitOfMeasurement: { Code: pkg.weightUnit, Description: pkg.weightUnit === 'LBS' ? 'Pounds' : 'Kilograms' },
        Weight: String(pkg.weight),
      },
    }));

    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0);
    const weightUnit = request.packages[0]!.weightUnit;

    const shipment: UPSRateRequest['RateRequest']['Shipment'] = {
      Shipper: {
        Name: 'Shipper',
        ShipperNumber: this.accountNumber,
        Address: shipperAddress,
      },
      ShipTo: {
        Name: 'Recipient',
        Address: {
          AddressLine: [request.destination.street],
          City: request.destination.city,
          StateProvinceCode: request.destination.state,
          PostalCode: request.destination.postalCode,
          CountryCode: request.destination.countryCode,
        },
      },
      ShipFrom: {
        Name: 'Shipper',
        Address: shipperAddress,
      },
      PaymentDetails: {
        ShipmentCharge: {
          Type: '01',
          BillShipper: {
            AccountNumber: this.accountNumber,
          },
        },
      },
      NumOfPieces: String(request.packages.length),
      Package: packages,
      ShipmentTotalWeight: {
        UnitOfMeasurement: { Code: weightUnit },
        Weight: String(totalWeight),
      },
    };

    if (hasServiceCode) {
      shipment.Service = { Code: request.serviceCode! };
    }

    return {
      RateRequest: {
        Request: {
          RequestOption: hasServiceCode ? 'Rate' : 'Shop',
        },
        Shipment: shipment,
      },
    };
  }

  fromUPSResponse(response: UPSRateResponse): RateQuote[] {
    const shipments = toArray(response.RateResponse.RatedShipment);

    return shipments.map((shipment: UPSRatedShipment) => {
      const serviceCode = shipment.Service.Code;
      const days = shipment.GuaranteedDelivery?.BusinessDaysInTransit;

      return {
        carrier: 'UPS',
        serviceName: UPS_SERVICE_CODES[serviceCode] ?? `UPS Service ${serviceCode}`,
        serviceCode,
        totalPrice: parseFloat(shipment.TotalCharges.MonetaryValue),
        currency: shipment.TotalCharges.CurrencyCode,
        estimatedDays: days ? parseInt(days, 10) : null,
        guaranteedDelivery: shipment.GuaranteedDelivery !== undefined,
      };
    });
  }
}
