/**
 * @module utils/digilockerService
 * @description Handles OAuth 2.0 integration with India's NIC DigiLocker API.
 * Provides functions for generating auth URLs, exchanging tokens, and fetching
 * user data (KYC) and documents (issued certificates).
 */

import crypto from 'crypto';
import { logger } from './winstonLogger.js';

const BASE_URL = 'https://api.digitallocker.gov.in/public/oauth2/1';

/**
 * Generates the DigiLocker authorization URL.
 * @param {string} state - A random state string for CSRF protection.
 * @returns {string} The full authorization URL.
 */
export function getDigilockerAuthUrl(state) {
  const clientId = process.env.DIGILOCKER_CLIENT_ID;
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('DigiLocker configuration is missing. Check DIGILOCKER_CLIENT_ID and DIGILOCKER_REDIRECT_URI.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state || crypto.randomBytes(16).toString('hex'),
  });

  return `${BASE_URL}/authorize?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param {string} code - The authorization code received from DigiLocker.
 * @returns {Promise<Object>} The token response { access_token, refresh_token, ... }
 */
export async function exchangeDigilockerToken(code) {
  const clientId = process.env.DIGILOCKER_CLIENT_ID;
  const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET;
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('DigiLocker configuration is missing.');
  }

  // Basic Auth header for token endpoint
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  try {
    const response = await fetch(`${BASE_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('[DIGILOCKER] Token exchange error:', error.message);
    throw error;
  }
}

/**
 * Fetches the user's KYC profile from DigiLocker.
 * @param {string} accessToken - The user's active DigiLocker access token.
 * @returns {Promise<Object>} The user's profile data.
 */
export async function getDigilockerUserProfile(accessToken) {
  try {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('[DIGILOCKER] Profile fetch error:', error.message);
    throw error;
  }
}

/**
 * Fetches the list of documents issued to the user via DigiLocker.
 * @param {string} accessToken - The user's active DigiLocker access token.
 * @returns {Promise<Array>} The list of issued documents.
 */
export async function getDigilockerDocuments(accessToken) {
  try {
    const response = await fetch(`${BASE_URL}/files`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Document fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    logger.error('[DIGILOCKER] Document fetch error:', error.message);
    throw error;
  }
}
