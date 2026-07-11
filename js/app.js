/**
 * TOYORAKIDS - CORE APPLICATION SCRIPT
 * Manages cart, wishlist, products database, spotlight, and WhatsApp checkout integration.
 */

// --- CONFIGURATION ---
const WHATSAPP_NUMBER = "03704842601"; // Default admin phone number (Pakistan format)

// --- STATE MANAGEMENT ---
let products = [];
let cart = JSON.parse(localStorage.getItem('toyorakids_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('toyorakids_wishlist')) || [];

// --- INITIALIZE APPLICATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch & Initialize Products
  await initProducts();

  // 2. Setup Spotlight Effect Tracking
  initSpotlight();

  // 3. Initialize Shared Layout Elements
  initLayout();

  // 4. Update Badges & Drawers
  updateCartBadge();
  updateWishlistBadge();
  renderCartDrawer();

  // 5. Page-Specific Initializations
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === '' || currentPage === 'index.html') {
    initHomePage();
  } else if (currentPage === 'shop.html') {
    initShopPage();
  } else if (currentPage === 'product-detail.html') {
    initDetailPage();
  } else if (currentPage === 'wishlist.html') {
    initWishlistPage();
  } else if (currentPage === 'checkout.html') {
    initCheckoutPage();
  } else if (currentPage === 'admin.html') {
    initAdminPage();
  }
});

// --- DATABASE & PRODUCTS LOGIC ---
async function initProducts() {
  // Combine initialProducts (static fallback) with local admin products
  const adminProducts = JSON.parse(localStorage.getItem('toyorakids_admin_products')) || [];
  
  try {
    const response = await fetch('/api/products');
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      // Merge remote products (if configured) with local admin products
      const dbProductIds = new Set(result.data.map(p => p.id));
      const filteredAdminProducts = adminProducts.filter(p => !dbProductIds.has(p.id));
      
      // Merge all together
      products = [...result.data, ...filteredAdminProducts];
    } else {
      // API returned no data or fallback mode: merge initialProducts and adminProducts
      const staticProductIds = new Set(initialProducts.map(p => p.id));
      const filteredAdminProducts = adminProducts.filter(p => !staticProductIds.has(p.id));
      
      products = [...initialProducts, ...filteredAdminProducts];
    }
  } catch (err) {
    console.warn('Backend API connection failed, running in serverless client-side mode.');
    const staticProductIds = new Set(initialProducts.map(p => p.id));
    const filteredAdminProducts = adminProducts.filter(p => !staticProductIds.has(p.id));
    
    products = [...initialProducts, ...filteredAdminProducts];
  }
}

// --- SPOTLIGHT MOUSE-TRACKING EFFECT ---
function initSpotlight() {
  // Track mouse coordinates globally to reduce event listener overhead
  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.spotlight-card');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// --- SHARED LAYOUT & CONTROLS ---
function initLayout() {
  // Ambient Blobs Generator
  const blobsContainer = document.createElement('div');
  blobsContainer.className = 'ambient-blobs-container';
  blobsContainer.innerHTML = `
    <div class="ambient-blob blob-primary"></div>
    <div class="ambient-blob blob-secondary"></div>
    <div class="ambient-blob blob-tertiary"></div>
  `;
  document.body.appendChild(blobsContainer);

  // Cart Drawer Structure (if not already in HTML)
  if (!document.querySelector('.cart-drawer')) {
    const drawerOverlay = document.createElement('div');
    drawerOverlay.className = 'cart-drawer-overlay';
    
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3>Shopping Cart</h3>
        <button class="icon-btn close-cart-btn"><i class="fas fa-times"></i></button>
      </div>
      <div class="cart-drawer-items"></div>
      <div class="cart-drawer-footer">
        <div class="cart-drawer-summary-row">
          <span>Subtotal</span>
          <span class="cart-subtotal">Rs. 0</span>
        </div>
        <a href="checkout.html" class="btn btn-primary btn-full">Proceed to Order</a>
      </div>
    `;
    
    document.body.appendChild(drawerOverlay);
    document.body.appendChild(drawer);

    // Setup Cart Drawer Events
    const cartToggleBtns = document.querySelectorAll('.cart-toggle-btn');
    cartToggleBtns.forEach(btn => btn.addEventListener('click', toggleCartDrawer));
    
    document.querySelector('.close-cart-btn').addEventListener('click', toggleCartDrawer);
    drawerOverlay.addEventListener('click', toggleCartDrawer);
  }

  // Sidebar Menu Drawer Setup
  const mobileMenuBtn = document.querySelector('.mobile-toggle');
  
  if (mobileMenuBtn) {
    // 1. Create Sidebar HTML
    const sidebarHtml = `
      <div class="sidebar-drawer-overlay"></div>
      <div class="sidebar-drawer">
        <div class="sidebar-header">
          <a href="index.html" class="logo" style="font-size:1.5rem;">ToyOraKids <span class="logo-dot"></span></a>
          <button class="icon-btn close-sidebar-btn"><i class="fas fa-times"></i></button>
        </div>
        <div class="sidebar-links">
          <a href="index.html"><i class="fas fa-home"></i> Home</a>
          <a href="shop.html"><i class="fas fa-store"></i> Shop</a>
          <a href="about.html"><i class="far fa-address-card"></i> About</a>
          <a href="blog.html"><i class="fas fa-pen-nib"></i> Blog</a>
          <a href="wishlist.html"><i class="far fa-heart"></i> Wishlist</a>
          <a href="admin.html"><i class="fas fa-cogs"></i> Admin Portal</a>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', sidebarHtml);

    // 2. Setup Toggle Events
    const sidebarOverlay = document.querySelector('.sidebar-drawer-overlay');
    const sidebarDrawer = document.querySelector('.sidebar-drawer');
    const closeSidebarBtn = document.querySelector('.close-sidebar-btn');

    function toggleSidebar() {
      sidebarDrawer.classList.toggle('open');
      sidebarOverlay.classList.toggle('open');
    }

    mobileMenuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }
}

// --- CART ACTIONS ---
function toggleCartDrawer() {
  document.querySelector('.cart-drawer').classList.toggle('open');
  document.querySelector('.cart-drawer-overlay').classList.toggle('open');
}

function addToCart(productId, size = 'One Size', quantity = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const cartIndex = cart.findIndex(item => item.id === productId && item.selectedSize === size);

  if (cartIndex > -1) {
    cart[cartIndex].quantity += quantity;
  } else {
    cart.push({
      ...product,
      selectedSize: size,
      quantity: quantity
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  
  // Open Cart Drawer automatically to show feedback
  toggleCartDrawer();
}

function updateCartItemQty(id, size, change) {
  const index = cart.findIndex(item => item.id === id && item.selectedSize === size);
  if (index > -1) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
    updateCartBadge();
    renderCartDrawer();
  }
}

function removeFromCart(id, size) {
  cart = cart.filter(item => !(item.id === id && item.selectedSize === size));
  saveCart();
  updateCartBadge();
  renderCartDrawer();
}

function saveCart() {
  localStorage.setItem('toyorakids_cart', JSON.stringify(cart));
}

function updateCartBadge() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

function renderCartDrawer() {
  const container = document.querySelector('.cart-drawer-items');
  const subtotalEl = document.querySelector('.cart-subtotal');
  
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-drawer-empty">
        <i class="fas fa-shopping-basket"></i>
        <p>Your shopping cart is empty.</p>
        <a href="shop.html" class="btn btn-secondary btn-sm" onclick="toggleCartDrawer()">Explore Shop</a>
      </div>
    `;
    subtotalEl.textContent = "Rs. 0";
    document.querySelector('.cart-drawer-footer .btn-primary').style.pointerEvents = 'none';
    document.querySelector('.cart-drawer-footer .btn-primary').style.opacity = '0.5';
    return;
  }

  document.querySelector('.cart-drawer-footer .btn-primary').style.pointerEvents = 'auto';
  document.querySelector('.cart-drawer-footer .btn-primary').style.opacity = '1';

  let html = '';
  let total = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    html += `
      <div class="cart-drawer-item">
        <img src="${item.image_url}" alt="${item.name}" class="cart-drawer-item-img">
        <div class="cart-drawer-item-info">
          <div>
            <div class="cart-drawer-item-name">${item.name}</div>
            <div class="cart-drawer-item-meta">Size: ${item.selectedSize}</div>
          </div>
          <div class="cart-drawer-item-qty">
            <button class="qty-btn" onclick="updateCartItemQty('${item.id}', '${item.selectedSize}', -1)">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartItemQty('${item.id}', '${item.selectedSize}', 1)">+</button>
          </div>
        </div>
        <div>
          <button class="cart-drawer-item-remove" onclick="removeFromCart('${item.id}', '${item.selectedSize}')"><i class="fas fa-trash-alt"></i></button>
          <div class="cart-drawer-item-price" style="margin-top: 1.5rem;">Rs. ${item.price.toLocaleString()}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  subtotalEl.textContent = `Rs. ${total.toLocaleString()}`;
}

// --- WISHLIST ACTIONS ---
function toggleWishlist(productId) {
  const index = wishlist.findIndex(id => id === productId);
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  
  localStorage.setItem('toyorakids_wishlist', JSON.stringify(wishlist));
  updateWishlistBadge();

  // If we are on wishlist page, re-render
  if (window.location.pathname.endsWith('wishlist.html')) {
    renderWishlistPage();
  }

  // Update detail heart button if exists
  updateHeartButtons();
}

function updateWishlistBadge() {
  const totalItems = wishlist.length;
  const badges = document.querySelectorAll('.wishlist-badge');
  badges.forEach(badge => {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
  });
}

function updateHeartButtons() {
  const heartBtns = document.querySelectorAll('.wishlist-toggle');
  heartBtns.forEach(btn => {
    const id = btn.dataset.productId;
    const icon = btn.querySelector('i');
    if (wishlist.includes(id)) {
      icon.className = 'fas fa-heart';
      icon.style.color = '#E74C3C';
    } else {
      icon.className = 'far fa-heart';
      icon.style.color = '';
    }
  });
}

// --- HOME PAGE INITIALIZATION ---
function initHomePage() {
  const gridContainer = document.getElementById('featured-grid');
  if (!gridContainer) return;

  // Take the first 5 products to feature on homepage (matches 5-col wide grid)
  const featured = products.slice(0, 5);
  let html = '';

  featured.forEach(product => {
    html += `
      <div class="spotlight-card product-card">
        <div class="product-card-img-wrapper">
          <span class="product-card-badge">${product.category}</span>
          <img src="${product.image_url}" alt="${product.name}" class="product-card-img">
        </div>
        <div class="product-card-info">
          <div class="product-card-category">${product.category === 'garment' ? 'Garment' : 'Developmental Toy'}</div>
          <a href="product-detail.html?id=${product.id}" class="product-card-title">${product.name}</a>
          
          <div class="rating-stars">
            ${Array(Math.floor(product.rating)).fill('<i class="fas fa-star"></i>').join('')}
            ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
            <span class="rating-count">(${product.reviews_count || 0})</span>
          </div>

          <div class="product-card-bottom">
            <span class="product-card-price">Rs. ${product.price.toLocaleString()}</span>
            <div style="display: flex; gap: 0.5rem;">
              <button class="icon-btn wishlist-toggle" data-product-id="${product.id}" onclick="toggleWishlist('${product.id}')">
                <i class="far fa-heart"></i>
              </button>
              <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}', '${product.sizes.split(',')[0]}', 1)">
                <i class="fas fa-shopping-cart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  gridContainer.innerHTML = html;
  updateHeartButtons();
}

// --- SHOP PAGE INITIALIZATION ---
let currentCategoryFilter = 'all';
let currentSort = 'default';
let currentSearch = '';

function initShopPage() {
  // Category tabs
  const tabButtons = document.querySelectorAll('.shop-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.dataset.category;
      renderShopProducts();
    });
  });

  // Search input
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase();
      renderShopProducts();
    });
  }

  // Sorting
  const sortSelect = document.querySelector('.sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderShopProducts();
    });
  }

  renderShopProducts();
}

function renderShopProducts() {
  const container = document.getElementById('shop-grid');
  if (!container) return;

  // Filter
  let filtered = products.filter(p => {
    const matchesCategory = currentCategoryFilter === 'all' || p.category === currentCategoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(currentSearch) || p.description.toLowerCase().includes(currentSearch);
    return matchesCategory && matchesSearch;
  });

  // Sort
  if (currentSort === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--foreground-muted);">
        <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 1.5rem; color: var(--foreground-subtle);"></i>
        <p>No products found matching your active filters.</p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach((product) => {
    html += `
      <div class="spotlight-card product-card">
        <div class="product-card-img-wrapper">
          <span class="product-card-badge">${product.category}</span>
          <img src="${product.image_url}" alt="${product.name}" class="product-card-img">
        </div>
        <div class="product-card-info">
          <div class="product-card-category">${product.category === 'garment' ? 'Garment' : 'Developmental Toy'}</div>
          <a href="product-detail.html?id=${product.id}" class="product-card-title">${product.name}</a>
          
          <div class="rating-stars">
            ${Array(Math.floor(product.rating)).fill('<i class="fas fa-star"></i>').join('')}
            ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
            <span class="rating-count">(${product.reviews_count || 0})</span>
          </div>

          <div class="product-card-bottom">
            <span class="product-card-price">Rs. ${product.price.toLocaleString()}</span>
            <div style="display: flex; gap: 0.5rem;">
              <button class="icon-btn wishlist-toggle" data-product-id="${product.id}" onclick="toggleWishlist('${product.id}')">
                <i class="far fa-heart"></i>
              </button>
              <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}', '${product.sizes.split(',')[0]}', 1)">
                <i class="fas fa-shopping-cart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateHeartButtons();
}

// --- PRODUCT DETAIL PAGE INITIALIZATION ---
let detailQuantity = 1;
let detailSelectedSize = '';

function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  const product = products.find(p => p.id === id);
  if (!product) {
    document.getElementById('detail-page-container').innerHTML = `
      <div style="text-align: center; padding: 6rem 2rem;">
        <h2 class="section-title">Product Not Found</h2>
        <p class="text-muted" style="margin-bottom: 2rem;">The product you are looking for does not exist or has been removed.</p>
        <a href="shop.html" class="btn btn-primary">Return to Shop</a>
      </div>
    `;
    return;
  }

  // Main gallery image
  document.getElementById('detail-gallery-main').innerHTML = `
    <img src="${product.image_url}" alt="${product.name}" id="main-product-image">
  `;

  // Info details
  document.getElementById('detail-category').textContent = product.category === 'garment' ? 'Garment' : 'Developmental Toy';
  document.getElementById('detail-title').textContent = product.name;
  document.getElementById('detail-price').textContent = `Rs. ${product.price.toLocaleString()}`;
  document.getElementById('detail-desc').textContent = product.description;

  // Rating
  document.getElementById('detail-rating').innerHTML = `
    ${Array(Math.floor(product.rating)).fill('<i class="fas fa-star"></i>').join('')}
    ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
    <span class="rating-count">${product.rating} Stars (${product.reviews_count || 0} customer reviews)</span>
  `;

  // Sizing display
  const sizeWrapper = document.getElementById('detail-sizes-wrapper');
  const sizeGrid = document.getElementById('detail-sizes-grid');
  
  if (product.category === 'garment') {
    sizeWrapper.style.display = 'block';
    const sizeList = product.sizes.split(',').map(s => s.trim());
    detailSelectedSize = sizeList[0];
    
    let sizeHtml = '';
    sizeList.forEach(size => {
      sizeHtml += `
        <div class="size-pill ${size === detailSelectedSize ? 'selected' : ''}" data-size="${size}" onclick="selectDetailSize('${size}')">${size}</div>
      `;
    });
    sizeGrid.innerHTML = sizeHtml;
  } else {
    sizeWrapper.style.display = 'none';
    detailSelectedSize = 'One Size';
  }

  // Age specification details
  document.getElementById('spec-age').textContent = product.age_recommendation || 'All Ages';
  document.getElementById('spec-category').textContent = product.category === 'garment' ? 'Clothing & Apparel' : 'Montessori Toy';
  document.getElementById('spec-details').textContent = product.details || '100% kid-safe and premium materials';

  // Heart button set attributes
  const detailWishlistBtn = document.getElementById('detail-wishlist-btn');
  if (detailWishlistBtn) {
    detailWishlistBtn.dataset.productId = product.id;
    detailWishlistBtn.onclick = () => toggleWishlist(product.id);
  }

  // Add to Cart click
  const detailAddToCartBtn = document.getElementById('detail-add-to-cart-btn');
  if (detailAddToCartBtn) {
    detailAddToCartBtn.onclick = () => {
      addToCart(product.id, detailSelectedSize, detailQuantity);
    };
  }

  // Single Direct Order via WhatsApp
  const directOrderBtn = document.getElementById('detail-direct-order-btn');
  if (directOrderBtn) {
    directOrderBtn.onclick = () => {
      triggerDirectWhatsAppOrder(product);
    };
  }

  // Tabs toggle
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      tabLinks.forEach(l => l.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      link.classList.add('active');
      document.getElementById(link.dataset.tab).classList.add('active');
    });
  });

  updateHeartButtons();
}

function selectDetailSize(size) {
  detailSelectedSize = size;
  const pills = document.querySelectorAll('.size-pill');
  pills.forEach(p => {
    if (p.dataset.size === size) {
      p.classList.add('selected');
    } else {
      p.classList.remove('selected');
    }
  });
}

function adjustDetailQty(change) {
  const input = document.getElementById('detail-qty-input');
  if (!input) return;
  detailQuantity = parseInt(input.value) + change;
  if (detailQuantity < 1) detailQuantity = 1;
  input.value = detailQuantity;
}

function triggerDirectWhatsAppOrder(product) {
  const absoluteProductUrl = window.location.href;
  const totalAmount = product.price * detailQuantity;

  let text = `*New Direct Order from ToyOraKids!* 🛍️\n`;
  text += `-------------------------------------\n`;
  text += `*Item:* ${product.name}\n`;
  text += `*Product ID:* \`${product.id}\`\n`;
  text += `*Size:* ${detailSelectedSize}\n`;
  text += `*Quantity:* ${detailQuantity}\n`;
  text += `*Price per item:* Rs. ${product.price.toLocaleString()}\n`;
  text += `*Product Image Link:* ${window.location.origin}/${product.image_url}\n`;
  text += `*Page URL:* ${absoluteProductUrl}\n`;
  text += `-------------------------------------\n`;
  text += `*Grand Total:* Rs. ${totalAmount.toLocaleString()}\n\n`;
  text += `Please confirm availability and share payment details for shipping.`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
}

// --- WISHLIST PAGE INITIALIZATION ---
function initWishlistPage() {
  renderWishlistPage();
}

function renderWishlistPage() {
  const container = document.getElementById('wishlist-grid');
  const emptyEl = document.getElementById('wishlist-empty');
  if (!container) return;

  const savedProducts = products.filter(p => wishlist.includes(p.id));

  if (savedProducts.length === 0) {
    container.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  container.style.display = 'grid';
  emptyEl.style.display = 'none';

  let html = '';
  savedProducts.forEach(product => {
    html += `
      <div class="spotlight-card product-card">
        <div class="product-card-img-wrapper">
          <span class="product-card-badge">${product.category}</span>
          <img src="${product.image_url}" alt="${product.name}" class="product-card-img">
        </div>
        <div class="product-card-info">
          <div class="product-card-category">${product.category === 'garment' ? 'Garment' : 'Developmental Toy'}</div>
          <a href="product-detail.html?id=${product.id}" class="product-card-title">${product.name}</a>
          
          <div class="rating-stars">
            ${Array(Math.floor(product.rating)).fill('<i class="fas fa-star"></i>').join('')}
            ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
            <span class="rating-count">(${product.reviews_count || 0})</span>
          </div>

          <div class="product-card-bottom">
            <span class="product-card-price">Rs. ${product.price.toLocaleString()}</span>
            <div style="display: flex; gap: 0.5rem;">
              <button class="icon-btn wishlist-toggle" data-product-id="${product.id}" onclick="toggleWishlist('${product.id}')">
                <i class="fas fa-heart" style="color: #E74C3C;"></i>
              </button>
              <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}', '${product.sizes.split(',')[0]}', 1)">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// --- CHECKOUT PAGE INITIALIZATION ---
function initCheckoutPage() {
  renderCheckoutSummary();

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      processWhatsAppCheckout();
    });
  }
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary-items');
  const totalVal = document.getElementById('checkout-summary-total');
  
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p class="text-muted">No items selected in cart.</p>`;
    totalVal.textContent = 'Rs. 0';
    return;
  }

  let html = '';
  let subtotal = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    html += `
      <div class="summary-item">
        <div class="summary-item-info">
          <img src="${item.image_url}" alt="${item.name}" class="summary-item-img">
          <div>
            <div style="font-weight:600;">${item.name}</div>
            <div class="text-muted" style="font-size:0.75rem;">Size: ${item.selectedSize} × ${item.quantity}</div>
          </div>
        </div>
        <div style="font-weight:600;">Rs. ${itemTotal.toLocaleString()}</div>
      </div>
    `;
  });

  container.innerHTML = html;
  totalVal.textContent = `Rs. ${subtotal.toLocaleString()}`;
}

function processWhatsAppCheckout() {
  const name = document.getElementById('cust-name').value;
  const address = document.getElementById('cust-address').value;
  const city = document.getElementById('cust-city').value;
  const phone = document.getElementById('cust-phone').value;
  const notes = document.getElementById('cust-notes').value || 'None';

  if (!name || !address || !city || !phone) {
    alert('Please fill out all required shipping fields.');
    return;
  }

  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }

  let text = `*New Order from ToyOraKids!* 🛍️\n`;
  text += `-------------------------------------\n`;
  text += `*Customer:* ${name}\n`;
  text += `*Phone:* ${phone}\n`;
  text += `*City:* ${city}\n`;
  text += `*Shipping Address:* ${address}\n`;
  text += `*Order Notes:* ${notes}\n`;
  text += `-------------------------------------\n`;
  text += `*Items Ordered:*\n`;

  let subtotal = 0;
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    text += `${index + 1}. *${item.name}*\n`;
    text += `   - ID: \`${item.id}\`\n`;
    text += `   - Size: ${item.selectedSize}\n`;
    text += `   - Qty: ${item.quantity}\n`;
    text += `   - Price: Rs. ${item.price.toLocaleString()}\n`;
    text += `   - Image Link: ${window.location.origin}/${item.image_url}\n`;
  });

  text += `-------------------------------------\n`;
  text += `*Grand Total:* *Rs. ${subtotal.toLocaleString()}*\n\n`;
  text += `Please confirm receipt of this order and coordinate shipping detail terms. Thank you!`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;

  // Clear Cart State on Success Confirmation
  cart = [];
  saveCart();
  updateCartBadge();
  renderCartDrawer();

  // Redirect to success screen or show overlay
  document.getElementById('success-order-id').textContent = 'TOK-' + Math.floor(100000 + Math.random() * 900000);
  const successOverlay = document.getElementById('success-overlay');
  if (successOverlay) {
    successOverlay.style.display = 'flex';
  }

  // Open WhatsApp Link
  setTimeout(() => {
    window.open(whatsappUrl, '_blank');
  }, 1000);
}

// --- ADMIN PANEL INITIALIZATION ---
function initAdminPage() {
  // NOTE: Admin login/session is now handled by the secure JWT system
  // in the <script> block inside admin.html (calls /api/auth/login & /api/auth/session).
  // The old hardcoded 'admin123' passcode has been permanently removed.

  const addProductForm = document.getElementById('admin-add-product-form');
  const uploadArea = document.getElementById('admin-upload-area');
  const imageFileInput = document.getElementById('admin-image-file');
  const previewImg = document.getElementById('admin-preview-img');

  // Image Upload Handling (Local File -> Base64 data URL)
  let base64Image = '';
  
  if (uploadArea && imageFileInput) {
    uploadArea.addEventListener('click', () => imageFileInput.click());
    
    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          base64Image = event.target.result;
          previewImg.src = base64Image;
          previewImg.style.display = 'block';
          uploadArea.querySelector('p').textContent = `File loaded: ${file.name}`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Add Product Form Submit
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newProduct = {
        id: document.getElementById('prod-id').value.trim(),
        name: document.getElementById('prod-name').value.trim(),
        price: parseFloat(document.getElementById('prod-price').value),
        category: document.getElementById('prod-category').value,
        description: document.getElementById('prod-desc').value.trim(),
        sizes: document.getElementById('prod-sizes').value.trim() || 'One Size',
        age_recommendation: document.getElementById('prod-age').value.trim() || 'All Ages',
        image_url: base64Image || 'images/products/denim_dungaree.png', // Fallback image if none uploaded
        rating: 5.0,
        reviews_count: 0
      };

      if (!newProduct.id || !newProduct.name || isNaN(newProduct.price) || !newProduct.category) {
        alert('Please fill out all required fields correctly.');
        return;
      }

      // Save: Call Serverless API (if configured), otherwise save to LocalStorage
      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        });
        const result = await response.json();
        
        if (result.success) {
          alert('Product saved successfully in cloud database!');
        } else {
          // Cloud save failed (not configured), save locally
          saveAdminProductLocally(newProduct);
        }
      } catch (err) {
        // Fetch failed, save locally
        saveAdminProductLocally(newProduct);
      }

      // Reset form
      addProductForm.reset();
      base64Image = '';
      if (previewImg) previewImg.style.display = 'none';
      if (uploadArea) uploadArea.querySelector('p').textContent = 'Click to select product image';
      
      // Reload products list
      await initProducts();
      renderAdminProductsList();
    });
  }

  // Handle Admin Tabs
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  renderAdminProductsList();
  initAdminAboutEditor();
  initAdminBlogManager();
  initAdminVisitsAndStats();
}

function initAdminAboutEditor() {
  const form = document.getElementById('admin-about-form');
  if (!form) return;

  // Load existing data
  const existingDataStr = localStorage.getItem('toyorakids_about_data');
  if (existingDataStr) {
    const data = JSON.parse(existingDataStr);
    if (data.heroTitle) document.getElementById('about-hero-title').value = data.heroTitle;
    if (data.heroDesc) document.getElementById('about-hero-desc').value = data.heroDesc;
    if (data.heroImg) {
      const img = document.getElementById('about-hero-preview');
      img.src = data.heroImg;
      img.style.display = 'block';
      img.dataset.b64 = data.heroImg;
    }

    if (data.missionTitle) document.getElementById('about-mission-title').value = data.missionTitle;
    if (data.missionDesc1) document.getElementById('about-mission-desc1').value = data.missionDesc1;
    if (data.missionDesc2) document.getElementById('about-mission-desc2').value = data.missionDesc2;
    if (data.missionImg) {
      const img = document.getElementById('about-mission-preview');
      img.src = data.missionImg;
      img.style.display = 'block';
      img.dataset.b64 = data.missionImg;
    }

    if (data.storeName) document.getElementById('about-store-name').value = data.storeName;
    if (data.storeAddress) document.getElementById('about-store-address').value = data.storeAddress;
    if (data.storePhone) document.getElementById('about-store-phone').value = data.storePhone;
    if (data.locationImg) {
      const img = document.getElementById('about-location-preview');
      img.src = data.locationImg;
      img.style.display = 'block';
      img.dataset.b64 = data.locationImg;
    }
  }

  // Handle Image Uploads
  const setups = [
    { slot: 'about-hero-upload', preview: 'about-hero-preview' },
    { slot: 'about-mission-upload', preview: 'about-mission-preview' },
    { slot: 'about-location-upload', preview: 'about-location-preview' }
  ];

  setups.forEach(setup => {
    const slot = document.getElementById(setup.slot);
    const preview = document.getElementById(setup.preview);
    if (!slot || !preview) return;

    const fileInput = slot.querySelector('input[type="file"]');
    slot.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          preview.src = event.target.result;
          preview.style.display = 'block';
          preview.dataset.b64 = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // Save changes
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const aboutData = {
      heroTitle: document.getElementById('about-hero-title').value,
      heroDesc: document.getElementById('about-hero-desc').value,
      heroImg: document.getElementById('about-hero-preview')?.dataset?.b64 || '',
      
      missionTitle: document.getElementById('about-mission-title').value,
      missionDesc1: document.getElementById('about-mission-desc1').value,
      missionDesc2: document.getElementById('about-mission-desc2').value,
      missionImg: document.getElementById('about-mission-preview')?.dataset?.b64 || '',
      
      storeName: document.getElementById('about-store-name').value,
      storeAddress: document.getElementById('about-store-address').value,
      storePhone: document.getElementById('about-store-phone').value,
      locationImg: document.getElementById('about-location-preview')?.dataset?.b64 || ''
    };

    localStorage.setItem('toyorakids_about_data', JSON.stringify(aboutData));
    alert('About page updated successfully!');
  });
}

function initAdminBlogManager() {
  const form = document.getElementById('admin-add-blog-form');
  const uploadArea = document.getElementById('blog-upload-area');
  const imageInput = document.getElementById('blog-image-file');
  const previewImg = document.getElementById('blog-preview-img');
  
  if (!form) return;

  let blogBase64Image = '';

  if (uploadArea && imageInput) {
    uploadArea.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          blogBase64Image = event.target.result;
          previewImg.src = blogBase64Image;
          previewImg.style.display = 'block';
          uploadArea.querySelector('p').textContent = `Loaded: ${file.name}`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('blog-title').value.trim();
    const category = document.getElementById('blog-category').value.trim();
    const author = document.getElementById('blog-author').value.trim() || 'Admin';
    const excerpt = document.getElementById('blog-excerpt').value.trim();
    const content = document.getElementById('blog-content').value.trim();

    if (!title || !category || !excerpt || !content) {
      alert('Please fill out all required blog fields.');
      return;
    }

    const newPost = {
      id: 'post-' + Date.now(),
      title,
      category,
      author,
      excerpt,
      content,
      img: blogBase64Image,
      date: new Date().toISOString()
    };

    const postsStr = localStorage.getItem('toyorakids_blog_posts');
    let posts = postsStr ? JSON.parse(postsStr) : [];
    posts.push(newPost);
    localStorage.setItem('toyorakids_blog_posts', JSON.stringify(posts));

    form.reset();
    blogBase64Image = '';
    if (previewImg) previewImg.style.display = 'none';
    if (uploadArea) uploadArea.querySelector('p').textContent = 'Select cover image';

    alert('Blog post published!');
    renderAdminBlogList();
  });

  renderAdminBlogList();
}

function renderAdminBlogList() {
  const container = document.getElementById('admin-blog-list-container');
  if (!container) return;

  const postsStr = localStorage.getItem('toyorakids_blog_posts');
  let posts = postsStr ? JSON.parse(postsStr) : [];

  if (posts.length === 0) {
    container.innerHTML = '<p class="text-muted">No posts published yet.</p>';
    return;
  }

  let html = '';
  posts.reverse().forEach(post => {
    const dateStr = new Date(post.date).toLocaleDateString();
    const imgHtml = post.img 
      ? `<img src="${post.img}" class="blog-post-row-img">` 
      : `<div class="blog-post-row-img" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:var(--accent);"><i class="fas fa-image"></i></div>`;

    html += `
      <div class="blog-post-row">
        ${imgHtml}
        <div class="blog-post-row-info">
          <div class="blog-post-row-title">${post.title}</div>
          <div class="blog-post-row-meta">${post.category} • ${dateStr}</div>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" onclick="deleteBlogPost('${post.id}')" style="background:#C0392B; border-color:#962D22; color:white;"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

window.deleteBlogPost = function(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  
  const postsStr = localStorage.getItem('toyorakids_blog_posts');
  if (postsStr) {
    let posts = JSON.parse(postsStr);
    posts = posts.filter(p => p.id !== id);
    localStorage.setItem('toyorakids_blog_posts', JSON.stringify(posts));
    renderAdminBlogList();
  }
};

function initAdminVisitsAndStats() {
  const visitsStr = localStorage.getItem('toyorakids_visits') || '[]';
  const visits = JSON.parse(visitsStr);
  
  // 1. Fill Visit History Table
  const tbody = document.getElementById('admin-visits-tbody');
  if (tbody) {
    if (visits.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No visit data recorded yet.</td></tr>';
    } else {
      let html = '';
      const displayVisits = [...visits].reverse().slice(0, 50); // Show last 50
      
      displayVisits.forEach(v => {
        const timeStr = new Date(v.timestamp).toLocaleString();
        html += `
          <tr>
            <td>${timeStr}</td>
            <td>
              <div style="font-weight:600;">${v.name}</div>
              <div style="font-size:0.75rem; color:var(--foreground-subtle);">${v.userId.startsWith('anon') ? 'Anonymous' : 'Registered User'}</div>
            </td>
            <td><span class="badge-page">${v.page}</span></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }
  }

  // 2. Calculate Stats
  if (document.getElementById('stat-total-views')) {
    // Total Views
    document.getElementById('stat-total-views').textContent = visits.length;

    // Unique Visitors
    const uniqueUsers = new Set(visits.map(v => v.userId)).size;
    document.getElementById('stat-unique-users').textContent = uniqueUsers;

    // Active Products
    document.getElementById('stat-products-count').textContent = products.length;

    // Check registered profiles count (mocking by analyzing unique names not Anonymous)
    const registeredCount = new Set(visits.filter(v => v.name !== 'Anonymous').map(v => v.userId)).size;
    document.getElementById('stat-registered').textContent = registeredCount;

    // Top Pages
    const pageCounts = {};
    visits.forEach(v => {
      pageCounts[v.page] = (pageCounts[v.page] || 0) + 1;
    });
    
    const sortedPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxViews = sortedPages.length > 0 ? sortedPages[0][1] : 1;
    
    const topPagesContainer = document.getElementById('stat-top-pages');
    if (sortedPages.length === 0) {
      topPagesContainer.innerHTML = '<p class="text-muted">No data.</p>';
    } else {
      let html = '';
      sortedPages.forEach(([page, count]) => {
        const percent = Math.max(5, (count / maxViews) * 100);
        html += `
          <div class="top-page-row">
            <div class="top-page-label" title="${page}">${page}</div>
            <div class="top-page-bar-wrap">
              <div class="top-page-bar" style="width: ${percent}%;"></div>
            </div>
            <div class="top-page-count">${count}</div>
          </div>
        `;
      });
      topPagesContainer.innerHTML = html;
    }

    // Recent Logins
    const loginsContainer = document.getElementById('stat-recent-logins');
    const registeredVisits = visits.filter(v => v.name !== 'Anonymous');
    
    // Group to get unique recent users
    const seenUsers = new Set();
    const recentUsers = [];
    [...registeredVisits].reverse().forEach(v => {
      if (!seenUsers.has(v.userId)) {
        seenUsers.add(v.userId);
        recentUsers.push(v);
      }
    });

    const displayRecent = recentUsers.slice(0, 5);
    
    if (displayRecent.length === 0) {
      loginsContainer.innerHTML = '<p class="text-muted">No registered users have visited yet.</p>';
    } else {
      let html = '';
      displayRecent.forEach(v => {
        const timeStr = new Date(v.timestamp).toLocaleDateString();
        html += `
          <div style="display:flex; align-items:center; gap: 1rem; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #8b5cf6); display:flex; align-items:center; justify-content:center; font-weight: bold;">
              ${v.name.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 0.9rem;">${v.name}</div>
              <div style="font-size: 0.75rem; color: var(--foreground-muted);">${v.email}</div>
            </div>
            <div style="font-size: 0.75rem; color: var(--foreground-subtle);">${timeStr}</div>
          </div>
        `;
      });
      loginsContainer.innerHTML = html;
    }
  }
}

function saveAdminProductLocally(newProduct) {
  const localAdminList = JSON.parse(localStorage.getItem('toyorakids_admin_products')) || [];
  
  // Upsert local list
  const idx = localAdminList.findIndex(p => p.id === newProduct.id);
  if (idx > -1) {
    localAdminList[idx] = newProduct;
  } else {
    localAdminList.push(newProduct);
  }
  
  localStorage.setItem('toyorakids_admin_products', JSON.stringify(localAdminList));
  alert('Connected to local storage fallback. Product saved successfully on your browser.');
}

function renderAdminProductsList() {
  const container = document.getElementById('admin-product-list-container');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<p class="text-muted">No products available in catalog.</p>';
    return;
  }

  let html = '';
  products.forEach(p => {
    html += `
      <div class="admin-product-row">
        <div class="admin-product-row-info">
          <img src="${p.image_url}" alt="${p.name}" class="admin-product-row-img">
          <div>
            <div style="font-weight:600;">${p.name}</div>
            <div class="text-muted" style="font-size:0.75rem;">ID: ${p.id} | Rs. ${p.price.toLocaleString()}</div>
          </div>
        </div>
        <div class="admin-product-actions">
          <button class="btn btn-secondary btn-sm" onclick="deleteProductFromAdmin('${p.id}')" style="background:#C0392B; border-color:#962D22; color:white;">Delete</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

window.deleteProductFromAdmin = async (id) => {
  if (!confirm(`Are you sure you want to delete product "${id}"?`)) return;

  try {
    const response = await fetch(`/api/products?id=${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();
    
    if (result.success) {
      alert('Product deleted successfully from cloud database!');
    } else {
      deleteAdminProductLocally(id);
    }
  } catch (err) {
    deleteAdminProductLocally(id);
  }

  // Refresh
  await initProducts();
  renderAdminProductsList();
  if (window.location.pathname.endsWith('admin.html')) {
    initAdminPage();
  }
};

function deleteAdminProductLocally(id) {
  let localAdminList = JSON.parse(localStorage.getItem('toyorakids_admin_products')) || [];
  localAdminList = localAdminList.filter(p => p.id !== id);
  localStorage.setItem('toyorakids_admin_products', JSON.stringify(localAdminList));
  
  alert('Deleted from local storage database.');
}
