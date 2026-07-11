/**
 * TOYORAKIDS - SECURE AUTHENTICATION SYSTEM v2.0
 * Replaces the old localStorage mock with real JWT-based /api/auth/ endpoints.
 * Keeps all existing visit tracking and nav badge logic intact.
 */

// Global session state (populated after /api/auth/session check)
let _authUser = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuthSystem();
  trackVisit();
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function initAuthSystem() {
  // 1. Inject drawer HTML if not already present
  if (!document.querySelector('.user-login-drawer')) {
    const overlay = document.createElement('div');
    overlay.className = 'user-login-drawer-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'user-login-drawer';
    drawer.innerHTML = `
      <div class="user-drawer-header">
        <h3 id="user-drawer-title">Account</h3>
        <button class="icon-btn close-user-btn"><i class="fas fa-times"></i></button>
      </div>
      <div class="user-drawer-body" id="user-drawer-content">
        <div style="text-align:center;padding:3rem 0;">
          <i class="fas fa-circle-notch fa-spin" style="font-size:2rem;color:var(--accent);"></i>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    document.querySelector('.close-user-btn').addEventListener('click', toggleUserDrawer);
    overlay.addEventListener('click', toggleUserDrawer);

    setupNavUserButtons();
  }

  // 2. Check active session from server
  await refreshSession();

  // 3. Auto-prompt unauthenticated visitors once
  if (!_authUser && !sessionStorage.getItem('tok_prompted')) {
    setTimeout(() => {
      toggleUserDrawer();
      sessionStorage.setItem('tok_prompted', 'true');
    }, 2500);
  }
}

// ─── SESSION CHECK ─────────────────────────────────────────────────────────────
async function refreshSession() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await res.json();
    if (data.success && data.loggedIn) {
      _authUser = data.user;
    } else {
      _authUser = null;
    }
  } catch (_) {
    _authUser = null;
  }
  renderUserDrawerState();
  updateNavUserIndicator();
}

// ─── NAV BUTTON ────────────────────────────────────────────────────────────────
function setupNavUserButtons() {
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !document.querySelector('.user-toggle-btn')) {
    const userBtn = document.createElement('button');
    userBtn.className = 'icon-btn user-toggle-btn user-nav-btn';
    userBtn.title = 'User Account';
    userBtn.innerHTML = `
      <i class="far fa-user"></i>
      <span class="user-nav-indicator" style="display:none;"></span>
    `;
    userBtn.addEventListener('click', toggleUserDrawer);

    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
      navActions.insertBefore(userBtn, mobileToggle);
    } else {
      navActions.appendChild(userBtn);
    }
  }
  updateNavUserIndicator();
}

function toggleUserDrawer() {
  const drawer  = document.querySelector('.user-login-drawer');
  const overlay = document.querySelector('.user-login-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}

function updateNavUserIndicator() {
  const indicator = document.querySelector('.user-nav-indicator');
  const icon      = document.querySelector('.user-toggle-btn i');
  if (!indicator || !icon) return;

  if (_authUser) {
    indicator.style.display = 'block';
    icon.className = 'fas fa-user';
    icon.style.color = 'var(--accent)';
  } else {
    indicator.style.display = 'none';
    icon.className = 'far fa-user';
    icon.style.color = '';
  }
}

// ─── DRAWER STATE RENDERER ─────────────────────────────────────────────────────
function renderUserDrawerState(activeTab) {
  const container = document.getElementById('user-drawer-content');
  const titleEl   = document.getElementById('user-drawer-title');
  if (!container) return;

  if (_authUser) {
    // ── LOGGED IN VIEW ──
    if (titleEl) titleEl.textContent = 'My Account';

    const adminRoles = ['Super Admin', 'Admin', 'Staff'];
    const isAdmin = adminRoles.includes(_authUser.role);

    container.innerHTML = `
      <div class="user-drawer-welcome">
        <div class="user-drawer-avatar">${_authUser.name.charAt(0).toUpperCase()}</div>
        <div class="user-drawer-name">${_authUser.name}</div>
        <div class="user-drawer-email">${_authUser.email}</div>
        <span style="display:inline-block;margin-top:0.4rem;font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:4px;background:rgba(230,126,34,0.15);color:var(--accent);font-weight:600;">${_authUser.role}</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:1.5rem;">
        <a href="customer.html" class="btn btn-secondary btn-full">
          <i class="far fa-user" style="margin-right:0.5rem;"></i> My Dashboard
        </a>
        ${isAdmin ? `<a href="admin.html" class="btn btn-secondary btn-full"><i class="fas fa-cog" style="margin-right:0.5rem;"></i> Admin Panel</a>` : ''}
        <button class="btn btn-secondary btn-full" onclick="logoutUser()" style="background:rgba(231,76,60,0.1);border-color:rgba(231,76,60,0.3);color:#E74C3C;">
          <i class="fas fa-sign-out-alt" style="margin-right:0.5rem;"></i> Sign Out
        </button>
      </div>
    `;
  } else {
    // ── LOGGED OUT VIEW ── (Login / Register / Forgot tabs)
    const tab = activeTab || 'login';
    if (titleEl) titleEl.textContent = tab === 'register' ? 'Create Account' : tab === 'forgot' ? 'Reset Password' : 'Sign In';

    // Tab nav
    const tabNav = `
      <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:0.75rem;">
        <button onclick="renderUserDrawerState('login')" class="btn btn-sm ${tab==='login'?'btn-primary':'btn-secondary'}" style="flex:1;padding:6px;">Sign In</button>
        <button onclick="renderUserDrawerState('register')" class="btn btn-sm ${tab==='register'?'btn-primary':'btn-secondary'}" style="flex:1;padding:6px;">Register</button>
      </div>
    `;

    if (tab === 'login') {
      container.innerHTML = `
        ${tabNav}
        <div id="auth-alert"></div>
        <form id="secure-login-form">
          <div class="form-group">
            <label class="form-label" for="sl-email">Email Address *</label>
            <input type="email" id="sl-email" class="form-control" placeholder="ali@example.com" required>
          </div>
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label" for="sl-password">Password *</label>
            <input type="password" id="sl-password" class="form-control" placeholder="Your password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="sl-btn">Sign In</button>
          <button type="button" onclick="renderUserDrawerState('forgot')" style="background:transparent;border:none;color:var(--foreground-muted);font-size:0.85rem;width:100%;text-align:center;margin-top:1rem;cursor:pointer;text-decoration:underline;">Forgot Password?</button>
        </form>
      `;

      document.getElementById('secure-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('sl-email').value;
        const password = document.getElementById('sl-password').value;
        const btn      = document.getElementById('sl-btn');
        btn.disabled   = true;
        btn.textContent = 'Signing in...';
        setAuthAlert('', '');

        try {
          const res  = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();

          if (data.success) {
            _authUser = data.user;
            renderUserDrawerState();
            updateNavUserIndicator();
            trackVisit(); // re-track with real user info
            // Auto-redirect admin roles to admin panel
            const adminRoles = ['Super Admin', 'Admin', 'Staff'];
            if (adminRoles.includes(data.user.role)) {
              window.location.href = 'admin.html';
            }
          } else {
            setAuthAlert(data.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In';
          }
        } catch (_) {
          setAuthAlert('Network error. Please try again.', 'error');
          btn.disabled = false;
          btn.textContent = 'Sign In';
        }
      });

    } else if (tab === 'register') {
      container.innerHTML = `
        ${tabNav}
        <div id="auth-alert"></div>
        <form id="secure-register-form">
          <div class="form-group">
            <label class="form-label" for="sr-name">Full Name *</label>
            <input type="text" id="sr-name" class="form-control" placeholder="e.g. Ali Khan" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="sr-email">Email Address *</label>
            <input type="email" id="sr-email" class="form-control" placeholder="ali@example.com" required>
          </div>
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label" for="sr-password">Password * <span style="font-size:0.75rem;color:var(--foreground-muted);">(min 8 chars)</span></label>
            <input type="password" id="sr-password" class="form-control" placeholder="Min 8 characters" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="sr-btn">Create Account</button>
        </form>
      `;

      document.getElementById('secure-register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name     = document.getElementById('sr-name').value;
        const email    = document.getElementById('sr-email').value;
        const password = document.getElementById('sr-password').value;
        const btn      = document.getElementById('sr-btn');
        btn.disabled   = true;
        btn.textContent = 'Creating account...';
        setAuthAlert('', '');

        try {
          const res  = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
          });
          const data = await res.json();

          if (data.success) {
            let msg = data.message;
            // In dev mode, show the verification link directly
            if (data.debugLink) {
              msg += `<br><br><small style="word-break:break-all;"><b>Dev Verify Link:</b><br><a href="${data.debugLink}" target="_blank" style="color:var(--accent);">Click here to verify email</a></small>`;
            }
            setAuthAlert(msg, 'success');
            btn.disabled = false;
            btn.textContent = 'Create Account';
          } else {
            setAuthAlert(data.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
          }
        } catch (_) {
          setAuthAlert('Network error. Please try again.', 'error');
          btn.disabled = false;
          btn.textContent = 'Create Account';
        }
      });

    } else if (tab === 'forgot') {
      container.innerHTML = `
        <button onclick="renderUserDrawerState('login')" style="background:transparent;border:none;color:var(--foreground-muted);cursor:pointer;margin-bottom:1rem;font-size:0.85rem;">
          <i class="fas fa-arrow-left"></i> Back to Sign In
        </button>
        <p class="text-muted" style="font-size:0.9rem;margin-bottom:1.5rem;">Enter your registered email address and we will send a password reset link.</p>
        <div id="auth-alert"></div>
        <form id="secure-forgot-form">
          <div class="form-group" style="margin-bottom:1.5rem;">
            <label class="form-label" for="sf-email">Email Address *</label>
            <input type="email" id="sf-email" class="form-control" placeholder="ali@example.com" required>
          </div>
          <button type="submit" class="btn btn-primary btn-full" id="sf-btn">Send Reset Link</button>
        </form>
      `;

      document.getElementById('secure-forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('sf-email').value;
        const btn   = document.getElementById('sf-btn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        setAuthAlert('', '');

        try {
          const res  = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();

          let msg = data.message;
          if (data.debugLink) {
            msg += `<br><br><small style="word-break:break-all;"><b>Dev Reset Link:</b><br><a href="${data.debugLink}" target="_blank" style="color:var(--accent);">Click here to reset password</a></small>`;
          }
          setAuthAlert(msg, data.success ? 'success' : 'error');
          btn.disabled = false;
          btn.textContent = 'Send Reset Link';
        } catch (_) {
          setAuthAlert('Network error. Please try again.', 'error');
          btn.disabled = false;
          btn.textContent = 'Send Reset Link';
        }
      });
    }
  }
}

// Alert helper inside drawer
function setAuthAlert(message, type) {
  const el = document.getElementById('auth-alert');
  if (!el) return;
  if (!message) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.85rem;
      background:${type==='success'?'rgba(46,204,113,0.1)':'rgba(231,76,60,0.1)'};
      border-left:3px solid ${type==='success'?'#2ECC71':'#E74C3C'};
      color:${type==='success'?'#2ECC71':'#E74C3C'};">
      ${message}
    </div>
  `;
}

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
window.logoutUser = async function () {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (_) {}
  _authUser = null;
  renderUserDrawerState();
  updateNavUserIndicator();
};

// ─── VISIT TRACKING (preserved from original) ──────────────────────────────────
function trackVisit() {
  let sessionId = sessionStorage.getItem('toyorakids_session_id');
  if (!sessionId) {
    sessionId = 'anon_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    sessionStorage.setItem('toyorakids_session_id', sessionId);
  }

  const userId    = _authUser ? _authUser.id   : sessionId;
  const userName  = _authUser ? _authUser.name  : 'Anonymous';
  const userEmail = _authUser ? _authUser.email : 'none';

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const pageTitle   = document.title;

  const visit = {
    visitId:   'v_' + Date.now().toString(36),
    userId,
    name:      userName,
    email:     userEmail,
    page:      currentPath,
    pageTitle,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  let visits = JSON.parse(localStorage.getItem('toyorakids_visits') || '[]');
  visits.push(visit);
  if (visits.length > 1000) visits = visits.slice(-1000);
  localStorage.setItem('toyorakids_visits', JSON.stringify(visits));
}
