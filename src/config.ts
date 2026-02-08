import "dotenv/config";
import * as z from "zod";

const EnvSchema = z.object({
  UPS_BASE_URL: z.string().url().default("https://onlinetools.ups.com"),
  UPS_CLIENT_ID: z.string().min(1),
  UPS_CLIENT_SECRET: z.string().min(1),
  UPS_ACCOUNT_NUMBER: z.string().min(1),
});

type Env = z.infer<typeof EnvSchema>;

export type UPSConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  accountNumber: string;
};

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}

export function loadUPSConfig(): UPSConfig {
  const env = loadEnv();
  return {
    baseUrl: env.UPS_BASE_URL,
    clientId: env.UPS_CLIENT_ID,
    clientSecret: env.UPS_CLIENT_SECRET,
    accountNumber: env.UPS_ACCOUNT_NUMBER,
  };
}
