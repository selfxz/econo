// ═══════════════════════════════════════════════════════════
// Auth Module — Google Login via Supabase (with local fallback)
// ═══════════════════════════════════════════════════════════
import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * @typedef {{ user: any, session: any }} AuthState
 */

/** @type {AuthState} */
let authState = { user: null, session: null };

/** @type {((state: AuthState) => void)[]} */
const listeners = [];

/** Local mode fake user */
const LOCAL_USER = {
  id: 'local-user',
  email: 'usuario@local',
  user_metadata: {
    full_name: 'Usuario Local',
    avatar_url: '',
  },
};

/**
 * Subscribe to auth state changes
 * @param {(state: AuthState) => void} fn
 * @returns {() => void} unsubscribe function
 */
export function onAuthChange(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => fn(authState));
}

/**
 * Initialize auth — listen for session changes
 */
export async function initAuth() {
  if (!isSupabaseConfigured) {
    // Local mode: auto-login as local user
    authState = { user: LOCAL_USER, session: null };
    notifyListeners();
    return authState;
  }

  // 1. Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    authState = { user: session?.user ?? null, session };
    notifyListeners();
  });

  // 2. Handle implicit OAuth callback if tokens are in URL hash (#access_token=...)
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error && data?.session) {
          window.history.replaceState({}, document.title, window.location.pathname.replace(/\*+/g, '') || '/');
          authState = { user: data.session.user, session: data.session };
          notifyListeners();
          return authState;
        }
      } catch (err) {
        console.warn('Error setting session from hash:', err);
      }
    }
  }

  // 3. Handle PKCE OAuth callback if authorization code is in URL query (?code=...)
  if (window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          window.history.replaceState({}, document.title, window.location.pathname.replace(/\*+/g, '') || '/');
          authState = { user: data.session.user, session: data.session };
          notifyListeners();
          return authState;
        }
      } catch (err) {
        console.warn('Error exchanging code for session:', err);
      }
    }
  }

  // 4. Retrieve existing session from storage
  const {
    data: { session },
  } = await supabase.auth.getSession();
  authState = { user: session?.user ?? null, session };
  notifyListeners();

  return authState;
}

/**
 * Sign in with Google (OAuth redirect)
 */
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    console.warn('Supabase no configurado. No se puede iniciar sesión con Google.');
    throw new Error('Supabase no configurado');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

/**
 * Sign in with Email & Password
 */
export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  authState = { user: data.user, session: data.session };
  notifyListeners();
  return data;
}

/**
 * Sign up with Email & Password
 */
export async function signUpWithEmail(email, password) {
  if (!isSupabaseConfigured) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (data.session) {
    authState = { user: data.user, session: data.session };
    notifyListeners();
  }
  return data;
}

/**
 * Continue in Guest / Local mode
 */
export function enterAsGuest() {
  authState = { user: LOCAL_USER, session: null };
  notifyListeners();
  return authState;
}

/**
 * Sign out current user
 */
export async function signOut() {
  if (!isSupabaseConfigured || authState.user?.id === 'local-user') {
    authState = { user: null, session: null };
    notifyListeners();
    return;
  }

  const { error } = await supabase.auth.signOut();
  authState = { user: null, session: null };
  notifyListeners();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get the current user (synchronous)
 */
export function getCurrentUser() {
  return authState.user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!authState.user;
}

/**
 * Whether running in local mode (no Supabase or guest user)
 */
export function isLocalMode() {
  return !isSupabaseConfigured || authState.user?.id === 'local-user';
}
