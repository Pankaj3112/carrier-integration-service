import type { AxiosInstance, AxiosError } from 'axios';
import type { UPSConfig } from '../../config.js';
import type { UPSRateRequest, UPSRateResponse, UPSAuthResponse, UPSErrorResponse } from './ups.types.js';
import {
  AuthenticationError,
  CarrierApiError,
  NetworkError,
  RateLimitError,
} from '../../errors.js';

export class UPSApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private readonly config: UPSConfig,
    private readonly httpClient: AxiosInstance,
  ) {}

  async rate(request: UPSRateRequest): Promise<UPSRateResponse> {
    const option = request.RateRequest.Request.RequestOption;
    return this.authenticatedRequest<UPSRateResponse>(
      'POST',
      `/api/rating/v2409/${option}`,
      request,
    );
  }

  private async authenticatedRequest<T>(method: string, url: string, data?: unknown): Promise<T> {
    await this.ensureValidToken();

    try {
      const response = await this.httpClient.request<T>({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (this.isTokenValid()) return;
    await this.fetchToken();
  }

  private isTokenValid(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiresAt - 60_000;
  }

  private async fetchToken(): Promise<void> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    try {
      const response = await this.httpClient.request<UPSAuthResponse>({
        method: 'POST',
        url: '/security/v1/oauth/token',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: 'grant_type=client_credentials',
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + parseInt(response.data.expires_in, 10) * 1000;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    const axiosError = error as AxiosError<UPSErrorResponse>;

    if (!axiosError.response) {
      return new NetworkError('UPS', { message: axiosError.message });
    }

    const status = axiosError.response.status;
    const responseData = axiosError.response.data;

    if (status === 401) {
      return new AuthenticationError('UPS', responseData);
    }

    if (status === 429) {
      return new RateLimitError('UPS', responseData);
    }

    const errorMessage =
      responseData?.response?.errors?.[0]?.message ?? `UPS API error (HTTP ${status})`;

    return new CarrierApiError('UPS', status, errorMessage, responseData);
  }
}
