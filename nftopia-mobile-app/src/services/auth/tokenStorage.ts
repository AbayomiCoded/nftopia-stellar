import * as SecureStore from "expo-secure-store";

// token keys
const ACCESS_TOKEN_KEY = "nftopia_access_token";
const REFRESH_TOKEN_KEY = "nftopia_refresh_token";
const TOKEN_EXPIRY_KEY = "nftopia_token_expiry";

interface TokenPayload {
  exp?: number;
  iat?: number;
  [key: string]: any;
}

// TokenStorage class for managing tokens in secure storage
export class TokenStorage {
  // save tokens
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

    // Extract and store expiry time from JWT
    const expiry = this.getTokenExpiry(accessToken);
    if (expiry) {
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
    }
  }

  // get access token
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  // get refresh token
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  // get token expiry time
  async getTokenExpiryTime(): Promise<number | null> {
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry, 10) : null;
  }

  // get time remaining until token expiry (in seconds)
  async getTimeRemaining(): Promise<number | null> {
    const expiry = await this.getTokenExpiryTime();
    if (!expiry) return null;

    const now = Math.floor(Date.now() / 1000);
    const remaining = expiry - now;
    return remaining > 0 ? remaining : 0;
  }

  // check if token is expired
  async isTokenExpired(): Promise<boolean> {
    const remaining = await this.getTimeRemaining();
    return remaining === null ? false : remaining <= 0;
  }

  // decode JWT payload (without verification)
  private decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded) as TokenPayload;
    } catch {
      return null;
    }
  }

  // extract expiry from JWT
  private getTokenExpiry(token: string): number | null {
    const payload = this.decodeToken(token);
    return payload?.exp || null;
  }

  // clear all tokens
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  }
}

export const tokenStorage = new TokenStorage();
