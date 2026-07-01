/**
 * TOYORAKIDS - USER AUTHENTICATION & VISIT TRACKING
 */

document.addEventListener('DOMContentLoaded', () => {
  initAuthSystem();
  trackVisit();
});

function initAuthSystem() {
  // 1. Inject Login Drawer HTML
  if (!document.querySelector('.user-login-drawer')) {
    const drawerOverlay = document.createElement('div');
    drawerOverlay.className = 'user-login-drawer-overlay';
    
    const drawer = document.createElement('div');
    drawer.className = 'user-login-drawer';
    drawer.innerHTML = `
      <div class="user-drawer-header">
        <h3>User Profile</h3>
        <button class="icon-btn close-user-btn"><i class="fas fa-times"></i></button>
      </div>
      <div class="user-drawer-body" id="user-drawer-content">
        <!-- Content injected dynamically based on login state -->
      </div>
    `;
    
    document.body.appendChild(drawerOverlay);
    document.body.appendChild(drawer);

    // Event Listeners
    document.querySelector('.close-user-btn').addEventListener('click', toggleUserDrawer);
    drawerOverlay.addEventListener('click', toggleUserDrawer);
    
    // Setup Nav Button Listeners
    setupNavUserButtons();
  }

  // 2. Render State
  renderUserDrawerState();

  // 3. One-time auto prompt
  const hasBeenPrompted = localStorage.getItem('toyorakids_prompted');
  const currentUser = localStorage.getItem('toyorakids_user');
  
  if (!hasBeenPrompted && !currentUser) {
    setTimeout(() => {
      toggleUserDrawer();
      localStorage.setItem('toyorakids_prompted', 'true');
    }, 2000); // Prompt after 2 seconds on very first visit
  }
}

function setupNavUserButtons() {
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !document.querySelector('.user-toggle-btn')) {
    // Add user button before mobile toggle
    const userBtn = document.createElement('button');
    userBtn.className = 'icon-btn user-toggle-btn user-nav-btn';
    userBtn.title = 'User Profile';
    userBtn.innerHTML = `
      <i class="far fa-user"></i>
      <span class="user-nav-indicator" style="display: none;"></span>
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
  const drawer = document.querySelector('.user-login-drawer');
  const overlay = document.querySelector('.user-login-drawer-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}

function renderUserDrawerState() {
  const container = document.getElementById('user-drawer-content');
  if (!container) return;

  const userDataStr = localStorage.getItem('toyorakids_user');
  
  if (userDataStr) {
    // Logged In State
    const user = JSON.parse(userDataStr);
    
    // Get personal visit stats
    const visitsStr = localStorage.getItem('toyorakids_visits') || '[]';
    const allVisits = JSON.parse(visitsStr);
    const myVisits = allVisits.filter(v => v.userId === user.id);
    
    // Group recent visits (last 5)
    let historyHtml = '';
    const recentVisits = myVisits.slice(-5).reverse();
    
    if (recentVisits.length > 0) {
      recentVisits.forEach(v => {
        const timeStr = new Date(v.timestamp).toLocaleString();
        historyHtml += `
          <div class="visit-item">
            <div class="visit-item-icon"><i class="fas fa-history"></i></div>
            <div class="visit-item-info">
              <div class="visit-item-page">${v.page}</div>
              <div class="visit-item-time">${timeStr}</div>
            </div>
          </div>
        `;
      });
    } else {
      historyHtml = '<p class="text-muted" style="font-size: 0.85rem;">No recent history.</p>';
    }

    container.innerHTML = `
      <div class="user-drawer-welcome">
        <div class="user-drawer-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="user-drawer-name">${user.name}</div>
        <div class="user-drawer-email">${user.email}</div>
      </div>
      
      <div class="user-drawer-stats">
        <div class="user-stat-card">
          <div class="stat-value">${myVisits.length}</div>
          <div class="stat-label">Total Visits</div>
        </div>
        <div class="user-stat-card">
          <div class="stat-value"><i class="fas fa-star" style="font-size: 1.2rem;"></i></div>
          <div class="stat-label">Member</div>
        </div>
      </div>
      
      <div class="user-visit-history">
        <h4>Recent Activity</h4>
        ${historyHtml}
      </div>
      
      <button class="btn btn-secondary btn-full" style="margin-top: 2rem;" onclick="logoutUser()">Sign Out</button>
    `;
  } else {
    // Logged Out State
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <i class="far fa-user-circle" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Welcome to ToyOraKids</h2>
        <p class="text-muted" style="font-size: 0.9rem;">Sign in once to track your visits and save your preferences.</p>
      </div>
      
      <form id="user-login-form">
        <div class="form-group">
          <label class="form-label" for="login-name">Full Name *</label>
          <input type="text" id="login-name" class="form-control" placeholder="e.g. Ali Khan" required>
        </div>
        <div class="form-group" style="margin-bottom: 2rem;">
          <label class="form-label" for="login-email">Email Address *</label>
          <input type="email" id="login-email" class="form-control" placeholder="ali@example.com" required>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Continue</button>
      </form>
    `;

    document.getElementById('user-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('login-name').value.trim();
      const email = document.getElementById('login-email').value.trim();
      
      if (name && email) {
        const user = {
          id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2),
          name: name,
          email: email,
          joined: new Date().toISOString()
        };
        localStorage.setItem('toyorakids_user', JSON.stringify(user));
        
        // Update any anonymous visits of this session to this user
        updateAnonymousVisitsToUser(user.id, user.name, user.email);
        
        renderUserDrawerState();
        updateNavUserIndicator();
      }
    });
  }
}

window.logoutUser = function() {
  localStorage.removeItem('toyorakids_user');
  renderUserDrawerState();
  updateNavUserIndicator();
};

function updateNavUserIndicator() {
  const indicator = document.querySelector('.user-nav-indicator');
  const icon = document.querySelector('.user-toggle-btn i');
  
  if (!indicator || !icon) return;
  
  if (localStorage.getItem('toyorakids_user')) {
    indicator.style.display = 'block';
    icon.className = 'fas fa-user';
    icon.style.color = 'var(--accent)';
  } else {
    indicator.style.display = 'none';
    icon.className = 'far fa-user';
    icon.style.color = '';
  }
}

// --- VISIT TRACKING ---
function trackVisit() {
  // Generate a temporary session ID if no user is logged in yet
  let sessionId = sessionStorage.getItem('toyorakids_session_id');
  if (!sessionId) {
    sessionId = 'anon_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    sessionStorage.setItem('toyorakids_session_id', sessionId);
  }

  const userDataStr = localStorage.getItem('toyorakids_user');
  let userId = sessionId;
  let userName = 'Anonymous';
  let userEmail = 'none';
  
  if (userDataStr) {
    const user = JSON.parse(userDataStr);
    userId = user.id;
    userName = user.name;
    userEmail = user.email;
  }

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const pageTitle = document.title;

  const visit = {
    visitId: 'v_' + Date.now().toString(36),
    userId: userId,
    name: userName,
    email: userEmail,
    page: currentPath,
    pageTitle: pageTitle,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  let visits = JSON.parse(localStorage.getItem('toyorakids_visits') || '[]');
  visits.push(visit);
  
  // Keep only last 1000 visits to avoid localStorage bloat
  if (visits.length > 1000) {
    visits = visits.slice(-1000);
  }
  
  localStorage.setItem('toyorakids_visits', JSON.stringify(visits));
}

function updateAnonymousVisitsToUser(newUserId, newName, newEmail) {
  const sessionId = sessionStorage.getItem('toyorakids_session_id');
  if (!sessionId) return;

  let visits = JSON.parse(localStorage.getItem('toyorakids_visits') || '[]');
  let updated = false;
  
  visits = visits.map(v => {
    if (v.userId === sessionId) {
      updated = true;
      return { ...v, userId: newUserId, name: newName, email: newEmail };
    }
    return v;
  });
  
  if (updated) {
    localStorage.setItem('toyorakids_visits', JSON.stringify(visits));
  }
}
