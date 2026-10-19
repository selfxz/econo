// ═══════════════════════════════════════════════════════════
// Database Module — Transactions CRUD
// Supabase when configured, localStorage fallback otherwise
// ═══════════════════════════════════════════════════════════
import { supabase, isSupabaseConfigured } from './supabase.js';
import { getCurrentUser, isLocalMode } from './auth.js';

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} [user_id]
 * @property {'ingreso'|'gasto'} tipo
 * @property {string} categoria
 * @property {string} concepto
 * @property {number} monto
 * @property {string} fecha - ISO 8601
 * @property {string} [created_at]
 */

const LS_KEY = 'balance3d:v2';

/** @type {((txs: Transaction[]) => void)[]} */
const changeListeners = [];
let cachedTx = [];
let realtimeSub = null;

/**
 * Subscribe to transaction list changes
 */
export function onTransactionsChange(fn) {
  changeListeners.push(fn);
  return () => {
    const idx = changeListeners.indexOf(fn);
    if (idx > -1) changeListeners.splice(idx, 1);
  };
}

function notify() {
  changeListeners.forEach((fn) => fn([...cachedTx]));
}

// ── localStorage helpers ───────────────────────────────────
function loadFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cachedTx));
  } catch { /* quota exceeded, silently fail */ }
}

function generateLocalId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Supabase Realtime ──────────────────────────────────────
function subscribeToRealtime(userId) {
  if (realtimeSub) {
    supabase.removeChannel(realtimeSub);
    realtimeSub = null;
  }

  realtimeSub = supabase
    .channel('transactions-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        handleRealtimeEvent(payload);
      }
    )
    .subscribe();
}

function handleRealtimeEvent(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case 'INSERT':
      if (!cachedTx.find((t) => t.id === newRecord.id)) {
        cachedTx.unshift(newRecord);
      }
      break;
    case 'UPDATE':
      cachedTx = cachedTx.map((t) => (t.id === newRecord.id ? newRecord : t));
      break;
    case 'DELETE':
      cachedTx = cachedTx.filter((t) => t.id !== oldRecord.id);
      break;
  }

  cachedTx.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  notify();
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

/**
 * Load all transactions for the current user
 */
export async function loadTransactions() {
  if (isLocalMode()) {
    // Local mode
    cachedTx = loadFromLocalStorage();
    cachedTx.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    notify();
    return cachedTx;
  }

  // Supabase mode
  const user = getCurrentUser();
  if (!user) {
    cachedTx = [];
    notify();
    return cachedTx;
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error loading transactions:', error);
    throw error;
  }

  cachedTx = data || [];
  notify();
  subscribeToRealtime(user.id);

  return cachedTx;
}

/**
 * Add a new transaction
 */
export async function addTransaction(tx) {
  if (isLocalMode()) {
    // Local mode
    const record = {
      id: generateLocalId(),
      tipo: tx.tipo,
      categoria: tx.categoria || '',
      concepto: tx.concepto,
      monto: tx.monto,
      fecha: tx.fecha,
      created_at: new Date().toISOString(),
    };
    cachedTx.unshift(record);
    cachedTx.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    saveToLocalStorage();
    notify();
    return record;
  }

  // Supabase mode
  const user = getCurrentUser();
  if (!user) throw new Error('No user authenticated');

  const record = {
    user_id: user.id,
    tipo: tx.tipo,
    categoria: tx.categoria || '',
    concepto: tx.concepto,
    monto: tx.monto,
    fecha: tx.fecha,
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }

  if (!cachedTx.find((t) => t.id === data.id)) {
    cachedTx.unshift(data);
    cachedTx.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    notify();
  }

  return data;
}

/**
 * Delete a transaction by ID
 */
export async function deleteTransaction(id) {
  if (isLocalMode()) {
    cachedTx = cachedTx.filter((t) => t.id !== id);
    saveToLocalStorage();
    notify();
    return;
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id);

  if (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }

  cachedTx = cachedTx.filter((t) => t.id !== id);
  notify();
}

/**
 * Delete ALL transactions for the current user
 */
export async function deleteAllTransactions() {
  if (isLocalMode()) {
    cachedTx = [];
    saveToLocalStorage();
    notify();
    return;
  }

  const user = getCurrentUser();
  if (!user) return;

  const { error } = await supabase.from('transactions').delete().eq('user_id', user.id);

  if (error) {
    console.error('Error deleting all:', error);
    throw error;
  }

  cachedTx = [];
  notify();
}

/**
 * Unsubscribe from realtime
 */
export function cleanup() {
  if (realtimeSub && supabase) {
    supabase.removeChannel(realtimeSub);
    realtimeSub = null;
  }
}

/**
 * Get cached transactions (synchronous)
 */
export function getCachedTransactions() {
  return [...cachedTx];
}
