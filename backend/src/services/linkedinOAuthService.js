import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { config } from '../config/env.js';

export function isLinkedInConfigured() {
  return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

function redirectUri() {
  return (
    process.env.LINKEDIN_REDIRECT_URI ||
    `${(process.env.API_PUBLIC_URL || `http://localhost:${config.port}`).replace(/\/$/, '')}/api/auth/linkedin/callback`
  );
}

/**
 * LinkedIn OAuth2 authorization URL (OpenID scopes).
 */
export function buildLinkedInAuthUrl(state) {
  const cid = process.env.LINKEDIN_CLIENT_ID;
  if (!cid) throw new Error('LINKEDIN_CLIENT_ID not configured');
  const ru = redirectUri();
  const scope = encodeURIComponent('openid profile email');
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(ru)}&scope=${scope}&state=${encodeURIComponent(state)}`;
}

export async function exchangeLinkedInCode(code) {
  const ru = redirectUri();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: ru,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text || 'LinkedIn token exchange failed');
    err.statusCode = 400;
    throw err;
  }
  return JSON.parse(text);
}

export async function fetchLinkedInUserInfo(accessToken) {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text || 'LinkedIn userinfo failed');
    err.statusCode = 400;
    throw err;
  }
  return JSON.parse(text);
}

export async function upsertLinkedInTokens(userId, accessToken, expiresInSec, userinfo) {
  const expiresAt =
    expiresInSec && Number.isFinite(Number(expiresInSec))
      ? new Date(Date.now() + Number(expiresInSec) * 1000)
      : null;
  const name =
    userinfo.name ||
    [userinfo.given_name, userinfo.family_name].filter(Boolean).join(' ').trim() ||
    null;
  const cacheJson = JSON.stringify(userinfo);
  await pool.query(
    `
    INSERT INTO user_linkedin_oauth (user_id, access_token, expires_at, profile_name, linkedin_sub, profile_cache, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      expires_at = EXCLUDED.expires_at,
      profile_name = EXCLUDED.profile_name,
      linkedin_sub = EXCLUDED.linkedin_sub,
      profile_cache = EXCLUDED.profile_cache,
      updated_at = NOW()
    `,
    [userId, accessToken, expiresAt, name, userinfo.sub || null, cacheJson],
  );
}

export async function getLinkedInConnection(userId) {
  const r = await pool.query(
    `SELECT access_token, expires_at, profile_name, linkedin_sub, profile_cache FROM user_linkedin_oauth WHERE user_id = $1`,
    [userId],
  );
  return r.rows[0] || null;
}

export async function disconnectLinkedIn(userId) {
  await pool.query(`DELETE FROM user_linkedin_oauth WHERE user_id = $1`, [userId]);
}

export async function syncLinkedInProfileCache(userId) {
  const token = await getValidLinkedInAccessToken(userId);
  if (!token) {
    const err = new Error('LinkedIn not connected or token expired');
    err.statusCode = 401;
    throw err;
  }
  const info = await fetchLinkedInUserInfo(token);
  await pool.query(
    `UPDATE user_linkedin_oauth SET profile_cache = $2::jsonb, updated_at = NOW() WHERE user_id = $1`,
    [userId, JSON.stringify(info)],
  );
  return info;
}

export async function getValidLinkedInAccessToken(userId) {
  const row = await getLinkedInConnection(userId);
  if (!row?.access_token) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date(Date.now() + 60_000)) return null;
  return row.access_token;
}

export function signLinkedInOAuthState(userId, returnTo) {
  const payload = { sub: userId, typ: 'linkedin_oauth' };
  if (returnTo && typeof returnTo === 'string') {
    const u = returnTo.trim();
    if (u.startsWith('/') && !u.startsWith('//')) payload.returnTo = u.slice(0, 500);
  }
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '10m' });
}

/** @returns {{ userId: string, returnTo: string | null }} */
export function verifyLinkedInOAuthState(state) {
  const payload = jwt.verify(state, config.jwt.accessSecret);
  if (payload.typ !== 'linkedin_oauth' || !payload.sub) {
    const err = new Error('Invalid OAuth state');
    err.statusCode = 400;
    throw err;
  }
  const returnTo =
    payload.returnTo && typeof payload.returnTo === 'string' && payload.returnTo.startsWith('/')
      ? payload.returnTo
      : null;
  return { userId: payload.sub, returnTo };
}
