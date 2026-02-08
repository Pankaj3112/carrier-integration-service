export type UPSRateRequest = {
  RateRequest: {
    Request: {
      RequestOption?:
        | "Rate"
        | "Shop"
        | "Ratetimeintransit"
        | "Shoptimeintransit";
      TransactionReference?: {
        CustomerContext: string;
        TransactionIdentifier?: string;
      };
    };
    Shipment: {
      Shipper: {
        Name: string;
        ShipperNumber: string;
        Address: UPSAddress;
      };
      ShipTo: {
        Name: string;
        Address: UPSAddress;
      };
      ShipFrom?: {
        Name: string;
        Address: UPSAddress;
      };
      PaymentDetails?: {
        ShipmentCharge: {
          Type: string;
          BillShipper: {
            AccountNumber: string;
          };
        };
      };
      Service?: { Code: string; Description?: string };
      NumOfPieces?: string;
      ShipmentTotalWeight?: {
        UnitOfMeasurement: UPSUnitOfMeasurement;
        Weight: string;
      };
      Package: UPSPackage | UPSPackage[];
    };
  };
};

export type UPSAddress = {
  AddressLine: string[];
  City: string;
  StateProvinceCode: string;
  PostalCode: string;
  CountryCode: string;
};

export type UPSUnitOfMeasurement = {
  Code: string;
  Description?: string;
};

export type UPSPackage = {
  SimpleRate?: { Description: string; Code: string };
  PackagingType: { Code: string; Description?: string };
  Dimensions: {
    UnitOfMeasurement: UPSUnitOfMeasurement;
    Length: string;
    Width: string;
    Height: string;
  };
  PackageWeight: {
    UnitOfMeasurement: UPSUnitOfMeasurement;
    Weight: string;
  };
};

export type UPSRateResponse = {
  RateResponse: {
    Response: {
      ResponseStatus: { Code: string; Description: string };
      Alert?: Array<{ Code: string; Description: string }>;
      TransactionReference?: {
        CustomerContext: string;
        TransactionIdentifier?: string;
      };
    };
    RatedShipment: UPSRatedShipment | UPSRatedShipment[];
  };
};

export type UPSMonetaryValue = {
  CurrencyCode: string;
  MonetaryValue: string;
};

export type UPSRatedShipment = {
  Service: { Code: string; Description?: string };
  RatedShipmentAlert?: Array<{ Code: string; Description: string }>;
  BillingWeight: {
    UnitOfMeasurement: UPSUnitOfMeasurement;
    Weight: string;
  };
  TransportationCharges: UPSMonetaryValue;
  BaseServiceCharge?: UPSMonetaryValue;
  ServiceOptionsCharges: UPSMonetaryValue;
  TotalCharges: UPSMonetaryValue;
  GuaranteedDelivery?: {
    BusinessDaysInTransit: string;
    DeliveryByTime?: string;
  };
  RatedPackage: UPSRatedPackage | UPSRatedPackage[];
};

export type UPSRatedPackage = {
  BaseServiceCharge?: UPSMonetaryValue;
  TransportationCharges?: UPSMonetaryValue;
  ServiceOptionsCharges?: UPSMonetaryValue;
  TotalCharges?: UPSMonetaryValue;
  Weight?: string;
  BillingWeight?: {
    UnitOfMeasurement: UPSUnitOfMeasurement;
    Weight: string;
  };
  ItemizedCharges?: Array<{
    Code: string;
    CurrencyCode: string;
    MonetaryValue: string;
    SubType?: string;
  }>;
};

export type UPSAuthResponse = {
  token_type: string;
  issued_at: string;
  client_id: string;
  access_token: string;
  scope: string;
  expires_in: string;
  refresh_count: string;
  status: string;
};

export type UPSErrorResponse = {
  response: {
    errors: Array<{
      code: string;
      message: string;
    }>;
  };
};
