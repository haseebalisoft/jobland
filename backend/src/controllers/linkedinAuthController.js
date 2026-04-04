import { config } from '../config/env.js';
import {
  exchangeLinkedInCode,
  fetchLinkedInUserInfo,
  upsertLinkedInTokens,
  getLinkedInConnection,
  verifyLinkedInOAuthState,
  buildLinkedInAuthUrl,
  isLinkedInConfigured,
  signLinkedInOAuthState,
  disconnectLinkedIn,
  syncLinkedInProfileCache,
} from '../services/linkedinOAuthService.js';

const clientBase = () => String(config.clientUrl || 'http://localhost:5173').replace(/\/$/, '');

function buildLinkedInSuccessRedirect(returnTo) {
  const base = clientBase();
  if (returnTo && String(returnTo).startsWith('/')) {
    const path = String(returnTo);
    const sep = path.includes('?') ? '&' : '?';
    return `${base}${path}${sep}linkedinOAuth=success`;
  }
  return `${base}/resume-maker?edit=1&linkedinOAuth=success`;
}

export async function getLinkedInStatus(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isLinkedInConfigured()) {
      return res.json({ connected: false, configured: false });
    }
    const row = await getLinkedInConnection(userId);
    const connected = !!(
      row?.access_token &&
      (!row.expires_at || new Date(row.expires_at) > new Date(Date.now() + 60_000))
    );
    res.json({
      connected,
      configured: true,
      profileName: row?.profile_name || undefined,
      profile: row?.profile_cache ?? null,
      linkedinSub: row?.linkedin_sub || undefined,
    });
  } catch (err) {
    next(err);
  }
}

/** Returns a fresh OAuth URL (same as error payload from from-linkedin). */
export async function getLinkedInOAuthUrl(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isLinkedInConfigured()) {
      return res.status(503).json({ message: 'LinkedIn OAuth is not configured on the server.' });
    }
    const returnTo = req.query.returnTo ? String(req.query.returnTo) : undefined;
    const state = signLinkedInOAuthState(userId, returnTo);
    const url = buildLinkedInAuthUrl(state);
    res.json({ url, authorizationUrl: url });
  } catch (err) {
    next(err);
  }
}

export async function linkedInCallback(req, res) {
  const failRedirect = (msg) => {
    const q = new URLSearchParams({ linkedinOAuth: 'error', message: msg || 'failed' });
    res.redirect(302, `${clientBase()}/resume-maker?${q.toString()}`);
  };
  try {
    const { code, state, error } = req.query;
    if (error) {
      return failRedirect(String(error));
    }
    if (!code || !state) {
      return failRedirect('missing_code');
    }
    const { userId, returnTo } = verifyLinkedInOAuthState(String(state));
    const tokenJson = await exchangeLinkedInCode(String(code));
    const accessToken = tokenJson.access_token;
    const expiresIn = tokenJson.expires_in;
    const userinfo = await fetchLinkedInUserInfo(accessToken);
    await upsertLinkedInTokens(userId, accessToken, expiresIn, userinfo);
    res.redirect(302, buildLinkedInSuccessRedirect(returnTo));
  } catch (e) {
    console.error('[LinkedIn callback]', e);
    failRedirect(e.message || 'callback_error');
  }
}

export async function deleteLinkedIn(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await disconnectLinkedIn(userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function postLinkedInSync(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'user') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isLinkedInConfigured()) {
      return res.status(503).json({ message: 'LinkedIn OAuth is not configured on the server.' });
    }
    const profile = await syncLinkedInProfileCache(userId);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
