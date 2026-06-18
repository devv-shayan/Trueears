/**
 * Payment Service Client
 * Handles communication with the payment-service backend for LemonSqueezy integration
 */

interface CheckoutRequest {
  variant_id: string;
}

interface CheckoutResponse {
  checkout_url: string;
}

interface LicenseStatus {
  valid: boolean;
  license_key?: string;
  product_name?: string;
  variant_name?: string;
  activations_used?: number;
  activations_limit?: number;
  expires_at?: string | null;
}

interface OrderResponse {
  id: string;
  status: string;
  total: number;
  currency: string;
  license_key?: string;
  variant_id?: string;
  license_status?: string;
  created_at: string;
}

interface ActivateLicenseRequest {
  license_key: string;
  device_name?: string;
}

interface ActivateLicenseResponse {
  success: boolean;
  activations_used: number;
  activations_limit: number;
}

class PaymentService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    // Default to localhost for development
    // In production, this should be configured via environment variables
    this.baseUrl = import.meta.env.VITE_PAYMENT_SERVICE_URL || 'http://localhost:3002';

    // A production build that still points at localhost will fail every request
    // with an opaque "Failed to fetch". Make that misconfiguration loud and obvious.
    if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(this.baseUrl)) {
      console.error(
        `[PaymentService] Misconfigured: payment service URL is "${this.baseUrl}" in a ` +
          `production build. Set VITE_PAYMENT_SERVICE_URL to the deployed payment service ` +
          `before building, otherwise all license/account requests will fail.`
      );
    }
  }

  /**
   * Wrapper around fetch that turns opaque network failures (the browser's
   * "TypeError: Failed to fetch") into an actionable error that names the URL
   * we tried to reach. This is the difference between a user seeing
   * "Failed to fetch" and "Couldn't reach the payment service at <url>".
   */
  private async safeFetch(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, init);
    } catch (err) {
      // fetch only rejects on network-level failures (DNS, connection refused,
      // CORS, offline) — never on HTTP status codes.
      throw new Error(
        `Couldn't reach the payment service at ${this.baseUrl}. ` +
          `Check your connection and that VITE_PAYMENT_SERVICE_URL is configured. ` +
          `(${err instanceof Error ? err.message : String(err)})`
      );
    }
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Create a checkout session for a product variant
   * @param variantId - LemonSqueezy variant ID
   * @returns Checkout URL to redirect user to
   */
  async createCheckout(variantId: string): Promise<string> {
    try {
      const response = await this.safeFetch(`/api/checkout`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ variant_id: variantId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        if (response.status === 401) {
          const message = String(error.error || '');
          if (message.toLowerCase().includes('invalidsignature')) {
            throw new Error(
              'Authentication token is invalid for payment service. Sign out, sign in again, and verify JWT_SECRET matches auth-server.'
            );
          }
          throw new Error('Authentication required. Please sign in again.');
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: CheckoutResponse = await response.json();
      return data.checkout_url;
    } catch (error) {
      console.error('[PaymentService] Failed to create checkout:', error);
      throw error;
    }
  }

  /**
   * Check if user has a valid license
   * @returns License status
   */
  async checkLicenseStatus(): Promise<LicenseStatus> {
    try {
      const response = await this.safeFetch(`/api/license/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { valid: false };
        }
        if (response.status === 401) {
          const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
          throw new Error(
            String(error.error || 'Authentication token is invalid for payment service')
          );
        }
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PaymentService] Failed to check license status:', error);
      throw error;
    }
  }

  /**
   * Get user's purchase history
   * @returns List of orders
   */
  async getOrders(): Promise<OrderResponse[]> {
    try {
      const response = await this.safeFetch(`/api/orders/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PaymentService] Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Activate a license key on this device
   * @param licenseKey - License key to activate
   * @param deviceName - Optional device name
   * @returns Activation result
   */
  async activateLicense(
    licenseKey: string,
    deviceName?: string
  ): Promise<ActivateLicenseResponse> {
    try {
      const response = await this.safeFetch(`/api/license/activate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          license_key: licenseKey,
          device_name: deviceName,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PaymentService] Failed to activate license:', error);
      throw error;
    }
  }

  /**
   * Deactivate license on this device
   * @returns Success status
   */
  async deactivateLicense(): Promise<{ success: boolean }> {
    try {
      const response = await this.safeFetch(`/api/license/deactivate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PaymentService] Failed to deactivate license:', error);
      throw error;
    }
  }

  /**
   * Health check for payment service
   * @returns true if service is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.safeFetch(`/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('[PaymentService] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Export types
export type {
  CheckoutRequest,
  CheckoutResponse,
  LicenseStatus,
  OrderResponse,
  ActivateLicenseRequest,
  ActivateLicenseResponse,
};
