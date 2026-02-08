import * as z from "zod";

export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  countryCode: z.string().length(2),
});

export const PackageSchema = z.object({
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weightUnit: z.enum(["LBS", "KGS"]).default("LBS"),
  dimensionUnit: z.enum(["IN", "CM"]).default("IN"),
});

export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1).max(200),
  serviceCode: z.string().optional(),
});

export type RateQuote = {
  carrier: string;
  serviceName: string;
  serviceCode: string;
  totalPrice: number;
  currency: string;
  estimatedDays: number | null;
  guaranteedDelivery: boolean;
};

export type Address = z.infer<typeof AddressSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type RateRequest = z.infer<typeof RateRequestSchema>;
