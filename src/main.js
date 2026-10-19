// ═══════════════════════════════════════════════════════════
// ECONO — Main Application
// Premium financial intelligence with Supabase
// ═══════════════════════════════════════════════════════════
import './style.css';
import {
  initAuth,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  enterAsGuest,
  signOut,
  onAuthChange,
  getCurrentUser,
  isAuthenticated,
  isLocalMode,
} from './auth.js';
import { loadTransactions, addTransaction, deleteTransaction, deleteAllTransactions, onTransactionsChange, cleanup } from './db.js';
import { initBackground } from './background3d.js';

// ── Helpers ────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const fmt = (n) => 'S/ ' + n.toFixed(2);
const vibrate = (ms) => {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* ignore */ }
};

// ── Quick-add templates ────────────────────────────────────
const DEFAULT_CHIPS = [
  { tipo: 'ingreso', categoria: '', concepto: 'Ingreso Principal', label: 'Salario / Ingreso' },
  { tipo: 'gasto', categoria: 'Alimentación', concepto: 'Alimentación', label: 'Alimentación' },
  { tipo: 'gasto', categoria: 'Transporte', concepto: 'Transporte', label: 'Transporte' },
  { tipo: 'gasto', categoria: 'Servicios', concepto: 'Servicios básicos', label: 'Servicios' },
  { tipo: 'gasto', categoria: 'Suscripciones', concepto: 'Suscripciones', label: 'Suscripción' },
  { tipo: 'gasto', categoria: 'Compras', concepto: 'Compras', label: 'Compras' },
];

function getChips() {
  try {
    const saved = localStorage.getItem('econo:chips');
    return saved ? JSON.parse(saved) : DEFAULT_CHIPS;
  } catch {
    return DEFAULT_CHIPS;
  }
}

function saveChips(chips) {
  try {
    localStorage.setItem('econo:chips', JSON.stringify(chips));
  } catch { /* ignore */ }
}

// ── App State ──────────────────────────────────────────────
let transactions = [];
let currentType = 'ingreso';
let currentFilter = 'todos';
let pulse3D = () => {};
let toastTimeout = null;

// ── DOM References (filled after render) ───────────────────
const app = document.getElementById('app');

// ═══════════════════════════════════════════════════════════
// RENDER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function renderLoading() {
  app.innerHTML = `
    <div id="bg-canvas"></div>
    <div class="loading-screen">
      <div class="spinner"></div>
      <p class="loading-text">Cargando ECONO…</p>
    </div>
  `;
}

function renderAuthScreen() {
  let isSignUp = false;

  app.innerHTML = `
    <div id="bg-canvas"></div>
    <div id="toast" class="glass">
      <span id="toast-text"></span>
      <button id="undo-btn" class="hidden neg" style="background:none;border:none;cursor:pointer;font-weight:700;font-size:0.625rem;text-transform:uppercase;letter-spacing:0.05em;font-family:inherit;color:var(--red)">Deshacer</button>
    </div>
    <div class="auth-screen fade">
      <div class="brand-header">
        <div class="econo-logo-container">
          <svg class="econo-logo-icon" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="econo-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="60%" stop-color="#E2E8F0" />
                <stop offset="100%" stop-color="#94A3B8" />
              </linearGradient>
              <linearGradient id="econo-red-accent" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF3B30" />
                <stop offset="100%" stop-color="#E11D48" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="18" fill="#0C0F17" stroke="rgba(255,255,255,0.14)" stroke-width="1.5" />
            <path d="M19 17 H45 V22.5 H25 V28.5 H39 V33.5 H25 V39.5 H45 V45 H19 Z" fill="url(#econo-grad-main)" />
            <path d="M31 39 L43 27 L47 31 L47 23 L39 23 L43 27" stroke="url(#econo-red-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </div>
        <h1 class="auth-title">ECONO</h1>
        <p class="auth-tagline">CONTROL FINANCIERO INTELIGENTE</p>
        <p class="auth-subtitle">Gestión patrimonial y control de presupuesto personal en tiempo real.</p>
      </div>

      <div class="auth-card glass">
        <button id="google-login" class="auth-btn">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
          Continuar con Google
        </button>

        <div class="auth-divider">o con correo</div>

        <form id="email-form" class="auth-form">
          <input id="auth-email" type="email" class="inp" placeholder="tu@correo.com" required autocomplete="email">
          <input id="auth-pass" type="password" class="inp" placeholder="Contraseña (mín. 6 caracteres)" required minlength="6" autocomplete="current-password">
          <button id="auth-submit" type="submit" class="auth-submit-btn">Iniciar sesión</button>
        </form>

        <button id="toggle-auth-mode" type="button" class="auth-mode-toggle">
          ¿No tienes cuenta? <strong>Regístrate aquí</strong>
        </button>
      </div>

      <button id="guest-login" type="button" class="auth-skip">
        Continuar en modo local (sin cuenta) →
      </button>
    </div>
  `;

  const bgEl = document.getElementById('bg-canvas');
  if (bgEl) {
    const bg = initBackground(bgEl);
    pulse3D = bg.pulse;
  }

  // Google OAuth
  document.getElementById('google-login').addEventListener('click', async () => {
    const btn = document.getElementById('google-login');
    btn.textContent = 'Redirigiendo…';
    btn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (e) {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
        Continuar con Google
      `;
      btn.disabled = false;
      showToast(e.message || 'Error con Google. Configura OAuth en Supabase o usa correo.');
    }
  });

  // Toggle Login / SignUp
  const toggleBtn = document.getElementById('toggle-auth-mode');
  const submitBtn = document.getElementById('auth-submit');
  toggleBtn.addEventListener('click', () => {
    isSignUp = !isSignUp;
    submitBtn.textContent = isSignUp ? 'Crear cuenta' : 'Iniciar sesión';
    toggleBtn.innerHTML = isSignUp
      ? '¿Ya tienes cuenta? <strong>Inicia sesión</strong>'
      : '¿No tienes cuenta? <strong>Regístrate aquí</strong>';
  });

  // Email form submit
  document.getElementById('email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-pass').value;

    if (!email || !pass) return;

    submitBtn.disabled = true;
    submitBtn.textContent = isSignUp ? 'Creando cuenta…' : 'Iniciando sesión…';

    try {
      if (isSignUp) {
        const res = await signUpWithEmail(email, pass);
        if (res.session) {
          showToast('¡Cuenta creada exitosamente!');
        } else {
          showToast('Cuenta creada. Revisa tu correo para confirmar.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta';
        }
      } else {
        await signInWithEmail(email, pass);
      }
    } catch (err) {
      showToast(err.message || 'Error al autenticar');
      submitBtn.disabled = false;
      submitBtn.textContent = isSignUp ? 'Crear cuenta' : 'Iniciar sesión';
    }
  });

  // Guest login
  document.getElementById('guest-login').addEventListener('click', () => {
    enterAsGuest();
  });
}

function renderMainApp(user) {
  const month = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  app.innerHTML = `
    <div id="bg-canvas"></div>
    <div id="cloud-status" title="Estado de conexión"></div>
    <div id="toast" class="glass">
      <span id="toast-text"></span>
      <button id="undo-btn" class="hidden neg" style="background:none;border:none;cursor:pointer;font-weight:700;font-size:0.625rem;text-transform:uppercase;letter-spacing:0.05em;font-family:inherit;color:var(--red)">Deshacer</button>
    </div>

    <main class="main-content">
      <!-- User bar -->
      <div class="user-bar fade">
        <div class="brand-badge">
          <img src="/favicon.svg" alt="ECONO" class="brand-mini-logo" width="26" height="26">
          <span class="brand-name">ECONO</span>
        </div>
        <div class="user-actions">
          <button id="install-app-btn" class="install-pwa-btn" title="Instalar ECONO como aplicación">📲 App</button>
          <div class="user-info">
            ${user.user_metadata?.avatar_url
              ? `<img src="${esc(user.user_metadata.avatar_url)}" alt="" class="user-avatar" referrerpolicy="no-referrer">`
              : ''}
            <span>${esc(user.user_metadata?.full_name || user.email || 'Usuario')}</span>
          </div>
          <button id="logout-btn" class="logout-btn">${isLocalMode() ? 'Iniciar sesión' : 'Cerrar sesión'}</button>
        </div>
      </div>

      <!-- Header -->
      <header class="header fade" style="animation-delay:.05s">
        <p class="header-month">${esc(month)}</p>
        <p class="header-label">Balance neto del mes</p>
        <h1 id="balance" class="header-balance">S/ 0.00</h1>
        <p class="header-daily">Puedes gastar <span id="daily" class="daily-amount">S/ 0.00</span></p>
      </header>

      <!-- Quick templates -->
      <div class="chips-section fade" style="animation-delay:.1s">
        <div class="chips-header">
          <p class="chips-label">Plantillas frecuentes</p>
          <button id="add-chip-btn" type="button" class="chip-add-btn" title="Crear plantilla personalizada">+ Nueva plantilla</button>
        </div>
        <div id="chips" class="chips-scroll"></div>
      </div>

      <!-- Stats -->
      <div class="stats-grid fade" style="animation-delay:.15s">
        <div class="stat-card glass tilt">
          <p class="stat-label">Ingresos</p>
          <p id="income" class="stat-value">S/ 0.00</p>
        </div>
        <div class="stat-card glass tilt expense">
          <p class="stat-label">Gastos</p>
          <p id="expenses" class="stat-value neg">S/ 0.00</p>
        </div>
      </div>

      <!-- Consumption -->
      <div class="consumption-card glass fade" style="animation-delay:.2s">
        <div class="consumption-header">
          <div>
            <p class="consumption-label">Nivel de consumo</p>
            <p id="savings" class="consumption-savings"></p>
          </div>
          <p id="consumption-pct" class="consumption-pct">0%</p>
        </div>
        <div class="bar-track">
          <div id="bar-fill" class="bar-fill" style="width:0"></div>
        </div>
      </div>

      <!-- Form -->
      <section class="form-section glass fade" style="animation-delay:.25s">
        <div class="tabs">
          <button type="button" id="tab-income" class="tab active">Ingreso</button>
          <button type="button" id="tab-expense" class="tab expense-tab">Gasto</button>
        </div>
        <form id="tx-form" class="form-fields">
          <select id="category" class="inp hidden">
            <option value="" disabled selected>Categoría…</option>
            <option>Transporte</option>
            <option>Alimentación</option>
            <option>Servicios</option>
            <option>Suscripciones</option>
            <option>Compras</option>
            <option>Otros</option>
          </select>
          <input id="concept" class="inp" placeholder="¿De dónde viene el ingreso?" required autocomplete="off">
          <div class="amount-wrap">
            <span class="amount-prefix">S/</span>
            <input id="amount" type="number" inputmode="decimal" step="0.01" min="0.01" class="inp amount-input" placeholder="0.00" required>
          </div>
          <button id="submit-btn" type="submit" class="btn btn-submit">Registrar ingreso</button>
        </form>
      </section>

      <!-- Categories breakdown -->
      <section class="categories-section glass fade" style="animation-delay:.3s">
        <div class="section-header">
          <h2 class="section-title">Gastos del mes por categoría</h2>
          <span id="top-category" class="neg" style="font-size:0.75rem;font-weight:600">Sin gastos</span>
        </div>
        <div id="categories-list"></div>
      </section>

      <!-- History -->
      <section class="fade" style="animation-delay:.35s">
        <div class="history-header">
          <h2 class="section-title">Historial</h2>
          <div class="history-actions">
            <button id="export-csv" class="btn-csv">Exportar CSV</button>
            <button id="clear-all" class="btn-clear">Borrar todo</button>
          </div>
        </div>
        <div class="filters" id="filters">
          <button data-f="todos" class="pill active">Todos</button>
          <button data-f="gasto" class="pill">Gastos</button>
          <button data-f="ingreso" class="pill">Ingresos</button>
        </div>
        <input id="search" placeholder="Buscar (ej. Uber, Menú)…" class="search-input">
        <div id="tx-list" class="tx-list"></div>
      </section>
    </main>

    <!-- Confirm Modal -->
    <div id="modal" class="modal-overlay hidden">
      <div class="modal-content glass">
        <h3 id="modal-title" class="modal-title"></h3>
        <p id="modal-text" class="modal-text"></p>
        <div class="modal-actions">
          <button id="modal-cancel" class="btn-cancel">Cancelar</button>
          <button id="modal-confirm" class="btn-confirm">Confirmar</button>
        </div>
      </div>
    </div>

    <!-- Custom Template Modal -->
    <div id="chip-modal" class="modal-overlay hidden">
      <div class="modal-content glass">
        <h3 class="modal-title">Nueva plantilla</h3>
        <p class="modal-text">Crea un acceso rápido personalizado para agilizar tus registros.</p>
        <form id="custom-chip-form" style="display:flex;flex-direction:column;gap:0.75rem">
          <div class="tabs" style="margin-bottom:0.25rem">
            <button type="button" id="chip-tab-income" class="tab active" style="font-size:0.75rem;padding:0.4rem">Ingreso</button>
            <button type="button" id="chip-tab-expense" class="tab expense-tab" style="font-size:0.75rem;padding:0.4rem">Gasto</button>
          </div>
          <select id="chip-category" class="inp hidden" style="font-size:0.8rem;padding:0.55rem">
            <option value="" disabled selected>Categoría…</option>
            <option>Transporte</option>
            <option>Alimentación</option>
            <option>Servicios</option>
            <option>Suscripciones</option>
            <option>Compras</option>
            <option>Otros</option>
          </select>
          <input id="chip-label" class="inp" placeholder="Nombre (ej. Alquiler, Gimnasio)" required style="font-size:0.8rem;padding:0.55rem">
          <input id="chip-amount" type="number" step="0.01" min="0.01" class="inp" placeholder="Monto habitual (opcional, ej. 50.00)" style="font-size:0.8rem;padding:0.55rem">
          <div class="modal-actions" style="margin-top:0.25rem">
            <button type="button" id="chip-modal-cancel" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-confirm">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Init 3D background
  const bgEl = document.getElementById('bg-canvas');
  if (bgEl) {
    const bg = initBackground(bgEl);
    pulse3D = bg.pulse;
  }

  // Init tilt effect on stat cards
  initTiltEffect();

  // Render chips
  renderChips();

  // Wire up events
  wireEvents();

  // Set cloud to syncing
  setCloudStatus('syncing');

  // Load data
  loadTransactions()
    .then(() => setCloudStatus('online'))
    .catch(() => {
      setCloudStatus('error');
      showToast('Error al cargar datos');
    });

  // Listen for transaction changes
  onTransactionsChange((txs) => {
    transactions = txs;
    updateDashboard();
    renderTransactionList();
  });
}

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function renderChips() {
  const container = document.getElementById('chips');
  if (!container) return;

  const chips = getChips();

  container.innerHTML = chips
    .map((c, i) => {
      const isExpense = c.tipo === 'gasto';
      return `
      <div class="chip" data-chip="${i}">
        <span class="${isExpense ? 'neg' : 'text-green'}" style="font-weight:700">${isExpense ? '−' : '+'}</span>
        <span>${esc(c.label || c.concepto)}</span>
        ${c.monto ? `<strong ${isExpense ? 'class="neg"' : ''}>S/ ${Number(c.monto).toFixed(2)}</strong>` : ''}
        ${chips.length > 2 ? `<button data-del-chip="${i}" class="chip-del-btn" title="Eliminar plantilla" aria-label="Eliminar">×</button>` : ''}
      </div>`;
    })
    .join('');

  container.onclick = (e) => {
    const delBtn = e.target.closest('[data-del-chip]');
    if (delBtn) {
      e.stopPropagation();
      const idx = parseInt(delBtn.dataset.delChip);
      const current = getChips();
      current.splice(idx, 1);
      saveChips(current);
      renderChips();
      showToast('Plantilla eliminada');
      return;
    }

    const chipEl = e.target.closest('[data-chip]');
    if (!chipEl) return;
    const idx = parseInt(chipEl.dataset.chip);
    const chip = getChips()[idx];
    if (chip) applyChip(chip);
  };
}

function applyChip(chip) {
  setFormType(chip.tipo);

  const conceptEl = document.getElementById('concept');
  const catEl = document.getElementById('category');
  const amountEl = document.getElementById('amount');

  if (conceptEl) conceptEl.value = chip.concepto || chip.label || '';
  if (catEl && chip.tipo === 'gasto' && chip.categoria) {
    catEl.value = chip.categoria;
  }

  if (amountEl) {
    if (chip.monto && Number(chip.monto) > 0) {
      amountEl.value = Number(chip.monto).toFixed(2);
    } else {
      amountEl.value = '';
    }
    amountEl.focus();
    amountEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  showToast(`Plantilla "${chip.label || chip.concepto}" lista para ingresar`);
}

function renderTransactionList() {
  const listEl = document.getElementById('tx-list');
  if (!listEl) return;

  const searchEl = document.getElementById('search');
  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';

  const filtered = transactions.filter((t) => {
    const matchFilter = currentFilter === 'todos' || t.tipo === currentFilter;
    const matchSearch =
      !query || `${t.concepto} ${t.categoria || ''}`.toLowerCase().includes(query);
    return matchFilter && matchSearch;
  });

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">${transactions.length ? 'No se encontraron movimientos.' : 'Tu registro está vacío.'}</p>
        <p class="empty-sub">${transactions.length ? 'Prueba con otra palabra o filtro.' : 'Usa un botón rápido o el formulario.'}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered
    .map((t) => {
      const isExpense = t.tipo === 'gasto';
      const dateStr = new Date(t.fecha).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
      <div class="tx-item">
        <div class="tx-info">
          <p class="tx-concept">
            ${esc(t.concepto)}
            ${isExpense && t.categoria ? `<span class="tx-cat-badge">${esc(t.categoria)}</span>` : ''}
          </p>
          <p class="tx-date">${dateStr}</p>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${isExpense ? 'neg' : ''}">${isExpense ? '−' : '+'} ${fmt(t.monto)}</span>
          <button data-del="${esc(t.id)}" class="tx-delete" aria-label="Eliminar">✕</button>
        </div>
      </div>`;
    })
    .join('');
}

function updateDashboard() {
  const now = new Date();
  const currentYM = now.getFullYear() * 12 + now.getMonth();

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap = {};

  transactions.forEach((t) => {
    const d = new Date(t.fecha);
    if (d.getFullYear() * 12 + d.getMonth() !== currentYM) return;

    if (t.tipo === 'ingreso') {
      totalIncome += t.monto;
    } else {
      totalExpenses += t.monto;
      const cat = t.categoria || 'Otros';
      categoryMap[cat] = (categoryMap[cat] || 0) + t.monto;
    }
  });

  const balance = totalIncome - totalExpenses;

  // Balance
  const balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = fmt(balance);
    balanceEl.classList.toggle('neg', balance < 0);
  }

  // Income / Expenses
  const incomeEl = document.getElementById('income');
  const expensesEl = document.getElementById('expenses');
  if (incomeEl) incomeEl.textContent = fmt(totalIncome);
  if (expensesEl) expensesEl.textContent = fmt(totalExpenses);

  // Daily allowance
  const daysLeft =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
    now.getDate() +
    1;
  const dailyEl = document.getElementById('daily');
  if (dailyEl) {
    dailyEl.textContent = `${fmt(Math.max(0, balance / daysLeft))} por día (${daysLeft} d restantes)`;
  }

  // Consumption %
  const consumption =
    totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : totalExpenses > 0 ? 100 : 0;
  const consPctEl = document.getElementById('consumption-pct');
  if (consPctEl) {
    consPctEl.textContent = consumption.toFixed(1) + '%';
    consPctEl.classList.toggle('neg', consumption >= 85);
  }
  const savingsEl = document.getElementById('savings');
  if (savingsEl) {
    savingsEl.textContent = 'Ahorro posible: ' + Math.max(0, 100 - consumption).toFixed(1) + '%';
  }
  const barEl = document.getElementById('bar-fill');
  if (barEl) {
    barEl.style.width = Math.min(consumption, 100) + '%';
    barEl.classList.toggle('danger', consumption >= 85);
  }

  // Categories
  const catArr = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  const topEl = document.getElementById('top-category');
  if (topEl) {
    topEl.textContent = catArr.length ? 'Mayor: ' + catArr[0][0] : 'Sin gastos';
  }

  const catsEl = document.getElementById('categories-list');
  if (catsEl) {
    if (!catArr.length) {
      catsEl.innerHTML =
        '<p style="text-align:center;padding:0.75rem 0;font-size:0.75rem;color:var(--text-faint)">Registra un gasto para ver el desglose.</p>';
    } else {
      catsEl.innerHTML = catArr
        .map(([cat, value]) => {
          const pct = (value / totalExpenses) * 100;
          return `
          <div class="category-item">
            <div class="category-header">
              <span class="category-name">${esc(cat)}</span>
              <span class="category-value">${fmt(value)} <span class="category-pct">(${pct.toFixed(0)}%)</span></span>
            </div>
            <div class="category-bar-track">
              <div class="category-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>`;
        })
        .join('');
    }
  }
}

// ═══════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════

function wireEvents() {
  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    cleanup();
    await signOut();
  });

  // Tabs
  document.getElementById('tab-income')?.addEventListener('click', () => setFormType('ingreso'));
  document.getElementById('tab-expense')?.addEventListener('click', () => setFormType('gasto'));

  // Form submit
  document.getElementById('tx-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const conceptEl = document.getElementById('concept');
    const amountEl = document.getElementById('amount');
    const catEl = document.getElementById('category');

    const concepto = conceptEl.value.trim();
    const monto = parseFloat(amountEl.value);

    if (!concepto || !(monto > 0)) return;

    const categoria = currentType === 'gasto' ? catEl.value : '';
    if (currentType === 'gasto' && !categoria) return;

    await registerTransaction({
      tipo: currentType,
      categoria,
      concepto,
      monto,
      fecha: new Date().toISOString(),
    });

    conceptEl.value = '';
    amountEl.value = '';
    catEl.value = '';
    conceptEl.focus();
  });

  // Delete single
  document.getElementById('tx-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    showConfirm('Borrar registro', '¿Eliminar este movimiento?', () =>
      deleteTransaction(btn.dataset.del)
    );
  });

  // Clear all
  document.getElementById('clear-all')?.addEventListener('click', () => {
    if (!transactions.length) return;
    showConfirm(
      'Borrar todo',
      'Se eliminarán todos tus registros. No se puede deshacer.',
      deleteAllTransactions
    );
  });

  // Search
  document.getElementById('search')?.addEventListener('input', renderTransactionList);

  // Filters
  document.getElementById('filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-f]');
    if (!btn) return;
    vibrate(15);
    currentFilter = btn.dataset.f;
    document.querySelectorAll('#filters .pill').forEach((p) =>
      p.classList.toggle('active', p === btn)
    );
    renderTransactionList();
  });

  // CSV export
  document.getElementById('export-csv')?.addEventListener('click', exportCSV);

  // Confirm Modal
  document.getElementById('modal-cancel')?.addEventListener('click', hideConfirm);
  document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') hideConfirm();
  });

  // Custom Template Modal Events
  let chipModalType = 'ingreso';
  const chipModal = document.getElementById('chip-modal');
  const chipTabIncome = document.getElementById('chip-tab-income');
  const chipTabExpense = document.getElementById('chip-tab-expense');
  const chipCat = document.getElementById('chip-category');

  function setChipModalType(type) {
    chipModalType = type;
    const isExp = type === 'gasto';
    chipTabIncome?.classList.toggle('active', !isExp);
    chipTabExpense?.classList.toggle('active', isExp);
    chipCat?.classList.toggle('hidden', !isExp);
    if (chipCat) chipCat.required = isExp;
  }

  chipTabIncome?.addEventListener('click', () => setChipModalType('ingreso'));
  chipTabExpense?.addEventListener('click', () => setChipModalType('gasto'));

  document.getElementById('add-chip-btn')?.addEventListener('click', () => {
    setChipModalType('ingreso');
    document.getElementById('custom-chip-form')?.reset();
    chipModal?.classList.remove('hidden');
    document.getElementById('chip-label')?.focus();
  });

  document.getElementById('chip-modal-cancel')?.addEventListener('click', () => {
    chipModal?.classList.add('hidden');
  });

  chipModal?.addEventListener('click', (e) => {
    if (e.target.id === 'chip-modal') chipModal.classList.add('hidden');
  });

  document.getElementById('custom-chip-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('chip-label')?.value.trim();
    const rawAmt = document.getElementById('chip-amount')?.value;
    const amountVal = rawAmt ? parseFloat(rawAmt) : null;
    const catVal = chipModalType === 'gasto' ? chipCat?.value : '';

    if (!label) return;
    if (chipModalType === 'gasto' && !catVal) return;

    const chips = getChips();
    chips.push({
      tipo: chipModalType,
      categoria: catVal || '',
      concepto: label,
      label,
      monto: amountVal && amountVal > 0 ? amountVal : null,
    });
    saveChips(chips);
    renderChips();
    chipModal?.classList.add('hidden');
    showToast(`Plantilla "${label}" guardada`);
  });

  // PWA Install Button
  document.getElementById('install-app-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        deferredInstallPrompt = null;
      }
    } else {
      showToast('En tu teléfono: abre el menú (⋮ o Compartir) y elige "Instalar aplicación" o "Agregar a inicio"', null, 4500);
    }
  });
}

function setFormType(type) {
  vibrate(15);
  currentType = type;
  const isExpense = type === 'gasto';

  const tabIncome = document.getElementById('tab-income');
  const tabExpense = document.getElementById('tab-expense');
  const submitBtn = document.getElementById('submit-btn');
  const conceptEl = document.getElementById('concept');
  const catEl = document.getElementById('category');

  tabIncome?.classList.toggle('active', !isExpense);
  tabExpense?.classList.toggle('active', isExpense);

  if (submitBtn) {
    submitBtn.classList.toggle('btn-danger', isExpense);
    submitBtn.textContent = isExpense ? 'Registrar gasto' : 'Registrar ingreso';
  }

  if (conceptEl) {
    conceptEl.placeholder = isExpense
      ? '¿En qué gastaste? (ej. Almuerzo)'
      : '¿De dónde viene el ingreso? (ej. Sueldo)';
  }

  if (catEl) {
    catEl.classList.toggle('hidden', !isExpense);
    catEl.required = isExpense;
  }
}

async function registerTransaction(tx) {
  vibrate(40);
  pulse3D(tx.tipo === 'ingreso' ? 0xffffff : 0xff1e1e);

  setCloudStatus('syncing');
  try {
    const saved = await addTransaction(tx);
    setCloudStatus('online');
    showToast(
      `${tx.concepto}: ${tx.tipo === 'ingreso' ? '+' : '-'} ${fmt(tx.monto)}`,
      () => deleteTransaction(saved.id)
    );
  } catch (e) {
    setCloudStatus('error');
    showToast('No se pudo guardar. Intenta de nuevo.');
  }
}

// ═══════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════

function setCloudStatus(status) {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  el.className = '';
  if (status) el.classList.add(status);
}

function showToast(message, undoFn, ms = 2800) {
  const toastEl = document.getElementById('toast');
  const textEl = document.getElementById('toast-text');
  const undoBtn = document.getElementById('undo-btn');
  if (!toastEl || !textEl || !undoBtn) return;

  textEl.textContent = message;
  undoBtn.classList.toggle('hidden', !undoFn);
  undoBtn.onclick = () => {
    if (undoFn) undoFn();
    toastEl.classList.remove('show');
  };

  toastEl.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), undoFn ? 4500 : ms);
}

let confirmCallback = null;

function showConfirm(title, text, fn) {
  const modal = document.getElementById('modal');
  const titleEl = document.getElementById('modal-title');
  const textEl = document.getElementById('modal-text');
  const confirmBtn = document.getElementById('modal-confirm');

  if (!modal || !titleEl || !textEl || !confirmBtn) return;

  titleEl.textContent = title;
  textEl.textContent = text;
  confirmCallback = fn;

  confirmBtn.onclick = () => {
    if (confirmCallback) confirmCallback();
    hideConfirm();
  };

  modal.classList.remove('hidden');
}

function hideConfirm() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.add('hidden');
  confirmCallback = null;
}

function initTiltEffect() {
  document.querySelectorAll('.tilt').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const rotX = ((e.clientY - r.top) / r.height - 0.5) * -14;
      const rotY = ((e.clientX - r.left) / r.width - 0.5) * 14;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
      card.style.transition = 'transform .1s';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform .5s';
    });
  });
}

function exportCSV() {
  if (!transactions.length) return;
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [
    'Fecha,Tipo,Categoría,Concepto,Monto (S/)',
    ...transactions.map((t) =>
      [
        q(new Date(t.fecha).toLocaleString('es-PE')),
        t.tipo,
        q(t.categoria || '-'),
        q(t.concepto),
        t.monto.toFixed(2),
      ].join(',')
    ),
  ];
  const blob = new Blob(['\uFEFF' + rows.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Gastos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function boot() {
  renderLoading();

  // Listen for auth state changes
  onAuthChange((state) => {
    if (state.user) {
      renderMainApp(state.user);
    } else {
      cleanup();
      renderAuthScreen();
    }
  });

  // Init auth (will trigger onAuthChange)
  await initAuth();
}

// ── PWA & Service Worker ──────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  showToast('¡ECONO instalada con éxito!');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showToast('Nueva versión de ECONO disponible. Recarga para actualizar.');
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}

boot();
