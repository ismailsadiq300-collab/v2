// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnD0Ar1JLLt2L218kbrkfBtyDjBVoLnJY",
  authDomain: "quick-menu-8e1ab.firebaseapp.com",
  projectId: "quick-menu-8e1ab",
  storageBucket: "quick-menu-8e1ab.firebasestorage.app",
  messagingSenderId: "412457421950",
  appId: "1:412457421950:web:6b185f4049fb1d82871c2f",
  measurementId: "G-E69JQ0ZT36"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Sample Menu Data (fallback if Firestore is empty)
const sampleMenuItems = [
  {
    id: '1',
    name: 'Burger',
    description: 'Juicy beef patty with fresh vegetables and special sauce',
    price: 15,
    category: 'Main',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    addOns: [
      { id: 'cheese', name: 'Extra Cheese', price: 3 },
      { id: 'bacon', name: 'Bacon', price: 5 }
    ]
  },
  {
    id: '2',
    name: 'Pizza',
    description: 'Wood-fired pizza with mozzarella and fresh toppings',
    price: 20,
    category: 'Main',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    addOns: [
      { id: 'pepperoni', name: 'Extra Pepperoni', price: 4 },
      { id: 'mushrooms', name: 'Mushrooms', price: 3 }
    ]
  },
  {
    id: '3',
    name: 'Fries',
    description: 'Crispy golden fries with seasoning',
    price: 8,
    category: 'Side',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    addOns: [
      { id: 'cheese-sauce', name: 'Cheese Sauce', price: 2 }
    ]
  },
  {
    id: '4',
    name: 'Chicken Wrap',
    description: 'Grilled chicken with fresh veggies in a soft tortilla',
    price: 12,
    category: 'Main',
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
    addOns: [
      { id: 'guac', name: 'Guacamole', price: 3 },
      { id: 'jalapenos', name: 'Jalapeños', price: 1 }
    ]
  },
  {
    id: '5',
    name: 'Cola',
    description: 'Refreshing ice-cold cola',
    price: 5,
    category: 'Drink',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
    addOns: []
  },
  {
    id: '6',
    name: 'Water',
    description: 'Pure mineral water',
    price: 3,
    category: 'Drink',
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    addOns: []
  }
];

// Admin Password - CHANGE THIS TO YOUR DESIRED PASSWORD
const ADMIN_PASSWORD = "admin123";

// App State
let menuItems = [];
let cart = [];
let tableNumber = 1;
let currentCategory = 'all';
let isAdminAuthenticated = false;
let knownOrderIds = new Set();
let isFirstLoad = true;

// Notification Sound (Web Audio API)
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a pleasant notification sound
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Two-tone notification
    oscillator1.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator1.frequency.setValueAtTime(1108, audioContext.currentTime + 0.15); // C#6
    oscillator2.frequency.setValueAtTime(1318, audioContext.currentTime + 0.15); // E6
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime + 0.15);
    oscillator1.stop(audioContext.currentTime + 0.4);
    oscillator2.stop(audioContext.currentTime + 0.4);
    
    console.log('🔔 New order notification sound played');
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
}

// DOM Elements
const menuPage = document.getElementById('menu-page');
const cartPage = document.getElementById('cart-page');
const successPage = document.getElementById('success-page');
const adminLoginPage = document.getElementById('admin-login-page');
const adminPage = document.getElementById('admin-page');
const qrPage = document.getElementById('qr-page');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.has('admin')) {
    // Check if already authenticated in this session
    if (sessionStorage.getItem('adminAuth') === 'true') {
      isAdminAuthenticated = true;
      showAdminPage();
    } else {
      showAdminLoginPage();
    }
  } else if (params.has('qr')) {
    showQRPage();
  } else {
    tableNumber = parseInt(params.get('table')) || 1;
    document.getElementById('table-info').textContent = `Table #${tableNumber}`;
    loadMenuItems();
    setupMenuEventListeners();
  }
});

// Load Menu Items from Firestore
async function loadMenuItems() {
  try {
    const snapshot = await db.collection('menuItems').get();
    if (!snapshot.empty) {
      menuItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      menuItems = sampleMenuItems;
    }
  } catch (error) {
    console.log('Using sample menu data');
    menuItems = sampleMenuItems;
  }
  renderMenuItems();
}

// Render Menu Items
function renderMenuItems() {
  const container = document.getElementById('menu-items');
  const filteredItems = currentCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === currentCategory);
  
  container.innerHTML = filteredItems.map(item => `
    <div class="menu-card" data-id="${item.id}">
      <img src="${item.image}" alt="${item.name}" class="menu-card-image" onerror="this.src='https://via.placeholder.com/400x200?text=${item.name}'">
      <div class="menu-card-content">
        <div class="menu-card-header">
          <span class="menu-card-name">${item.name}</span>
          <span class="menu-card-category">${item.category}</span>
        </div>
        <p class="menu-card-description">${item.description}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">${item.price} QAR</span>
          ${item.addOns && item.addOns.length > 0 ? `
            <button class="btn btn-secondary btn-small addons-toggle-btn">Add extras</button>
          ` : ''}
        </div>
        ${item.addOns && item.addOns.length > 0 ? `
          <div class="addons-section hidden" data-item-id="${item.id}">
            <div class="addons-list">
              ${item.addOns.map(addon => `
                <label class="addon-item">
                  <input type="checkbox" value="${addon.id}" data-price="${addon.price}" data-name="${addon.name}">
                  <span>${addon.name}</span>
                  <span class="addon-price">+${addon.price} QAR</span>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <button class="btn btn-primary add-to-cart-btn" style="width: 100%; margin-top: 1rem;">Add to Cart</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to cards
  container.querySelectorAll('.menu-card').forEach(card => {
    const itemId = card.dataset.id;
    const item = menuItems.find(i => i.id === itemId);
    
    // Toggle addons
    const toggleBtn = card.querySelector('.addons-toggle-btn');
    const addonsSection = card.querySelector('.addons-section');
    if (toggleBtn && addonsSection) {
      toggleBtn.addEventListener('click', () => {
        addonsSection.classList.toggle('hidden');
        toggleBtn.textContent = addonsSection.classList.contains('hidden') ? 'Add extras' : 'Hide extras';
      });
    }
    
    // Add to cart
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      const selectedAddOns = [];
      if (addonsSection) {
        addonsSection.querySelectorAll('input:checked').forEach(input => {
          selectedAddOns.push({
            id: input.value,
            name: input.dataset.name,
            price: parseFloat(input.dataset.price)
          });
        });
      }
      addToCart(item, selectedAddOns);
      
      // Reset checkboxes
      if (addonsSection) {
        addonsSection.querySelectorAll('input').forEach(input => input.checked = false);
        addonsSection.classList.add('hidden');
        if (toggleBtn) toggleBtn.textContent = 'Add extras';
      }
    });
  });
}

// Cart Functions
function getCartItemKey(item, addOns) {
  const addOnIds = addOns.map(a => a.id).sort().join(',');
  return `${item.id}-${addOnIds}`;
}

function addToCart(item, selectedAddOns = []) {
  const key = getCartItemKey(item, selectedAddOns);
  const existingIndex = cart.findIndex(cartItem => 
    getCartItemKey(cartItem, cartItem.selectedAddOns || []) === key
  );
  
  if (existingIndex > -1) {
    cart[existingIndex].quantity++;
  } else {
    cart.push({
      ...item,
      quantity: 1,
      selectedAddOns
    });
  }
  
  updateCartSummary();
  showNotification(`${item.name} added to cart!`);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartSummary();
  renderCartItems();
}

function updateQuantity(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) {
    removeFromCart(index);
  } else {
    updateCartSummary();
    renderCartItems();
  }
}

function getItemTotal(item) {
  let total = item.price;
  if (item.selectedAddOns) {
    total += item.selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
  }
  return total * item.quantity;
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function updateCartSummary() {
  const summary = document.getElementById('cart-summary');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = getCartTotal();
  
  if (count > 0) {
    summary.classList.remove('hidden');
    document.getElementById('cart-count').textContent = `${count} item${count > 1 ? 's' : ''}`;
    document.getElementById('cart-total').textContent = `${total} QAR`;
  } else {
    summary.classList.add('hidden');
  }
}

function renderCartItems() {
  const container = document.getElementById('cart-items');
  const emptyState = document.getElementById('cart-empty');
  const footer = document.getElementById('cart-footer');
  
  if (cart.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    footer.classList.add('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  footer.classList.remove('hidden');
  document.getElementById('total-price').textContent = `${getCartTotal()} QAR`;
  
  container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80?text=${item.name}'">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        ${item.selectedAddOns && item.selectedAddOns.length > 0 ? `
          <div class="cart-item-addons">+ ${item.selectedAddOns.map(a => a.name).join(', ')}</div>
        ` : ''}
        <div class="cart-item-price">${getItemTotal(item)} QAR</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">−</button>
        <span class="cart-item-qty">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
      </div>
    </div>
  `).join('');
}

// Place Order
async function placeOrder() {
  if (cart.length === 0) return;
  
  const order = {
    tableNumber,
    items: cart.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: getItemTotal(item),
      addOns: item.selectedAddOns ? item.selectedAddOns.map(a => a.name) : []
    })),
    totalPrice: getCartTotal(),
    status: 'new',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    await db.collection('orders').add(order);
    cart = [];
    updateCartSummary();
    showSuccessPage();
  } catch (error) {
    console.error('Error placing order:', error);
    showNotification('Error placing order. Please try again.');
  }
}

// Page Navigation
function showMenuPage() {
  menuPage.classList.remove('hidden');
  cartPage.classList.add('hidden');
  successPage.classList.add('hidden');
  adminPage.classList.add('hidden');
  qrPage.classList.add('hidden');
}

function showCartPage() {
  menuPage.classList.add('hidden');
  cartPage.classList.remove('hidden');
  successPage.classList.add('hidden');
  renderCartItems();
}

function showSuccessPage() {
  menuPage.classList.add('hidden');
  cartPage.classList.add('hidden');
  successPage.classList.remove('hidden');
  document.getElementById('order-table-info').textContent = `Table #${tableNumber}`;
}

function showAdminLoginPage() {
  menuPage.classList.add('hidden');
  cartPage.classList.add('hidden');
  successPage.classList.add('hidden');
  qrPage.classList.add('hidden');
  adminPage.classList.add('hidden');
  adminLoginPage.classList.remove('hidden');
  setupAdminLogin();
}

function showAdminPage() {
  menuPage.classList.add('hidden');
  cartPage.classList.add('hidden');
  successPage.classList.add('hidden');
  qrPage.classList.add('hidden');
  adminLoginPage.classList.add('hidden');
  adminPage.classList.remove('hidden');
  loadOrders();
  setupAdminEventListeners();
}

function showQRPage() {
  menuPage.classList.add('hidden');
  cartPage.classList.add('hidden');
  successPage.classList.add('hidden');
  adminPage.classList.add('hidden');
  adminLoginPage.classList.add('hidden');
  qrPage.classList.remove('hidden');
  generateQRCodes();
}

// Admin Login
function setupAdminLogin() {
  const loginBtn = document.getElementById('admin-login-btn');
  const passwordInput = document.getElementById('admin-password');
  const errorMsg = document.getElementById('login-error');
  
  const attemptLogin = () => {
    const password = passwordInput.value;
    
    if (password === ADMIN_PASSWORD) {
      isAdminAuthenticated = true;
      sessionStorage.setItem('adminAuth', 'true');
      errorMsg.textContent = '';
      showAdminPage();
    } else {
      errorMsg.textContent = 'Incorrect password. Please try again.';
      passwordInput.value = '';
    }
  };
  
  // Remove old listeners by cloning
  const newLoginBtn = loginBtn.cloneNode(true);
  loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
  newLoginBtn.addEventListener('click', attemptLogin);
  
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptLogin();
  });
  
  // Setup logout
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.addEventListener('click', () => {
      isAdminAuthenticated = false;
      sessionStorage.removeItem('adminAuth');
      showAdminLoginPage();
      document.getElementById('admin-password').value = '';
    });
  }
}

// Menu Event Listeners
function setupMenuEventListeners() {
  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderMenuItems();
    });
  });
  
  // View cart
  document.getElementById('view-cart-btn').addEventListener('click', showCartPage);
  
  // Back to menu
  document.getElementById('back-to-menu').addEventListener('click', showMenuPage);
  document.getElementById('browse-menu-btn').addEventListener('click', showMenuPage);
  
  // Place order
  document.getElementById('place-order-btn').addEventListener('click', placeOrder);
  
  // New order
  document.getElementById('new-order-btn').addEventListener('click', showMenuPage);
}

// Admin Functions
let ordersUnsubscribe = null;

function loadOrders(statusFilter = 'all') {
  const container = document.getElementById('orders-list');
  const noOrders = document.getElementById('no-orders');
  
  // Unsubscribe from previous listener if exists
  if (ordersUnsubscribe) {
    ordersUnsubscribe();
  }
  
  // Use real-time listener for orders
  ordersUnsubscribe = db.collection('orders')
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Check for new orders (not on first load)
      if (!isFirstLoad) {
        const currentOrderIds = new Set(orders.map(o => o.id));
        const newOrders = orders.filter(o => !knownOrderIds.has(o.id) && o.status === 'new');
        
        if (newOrders.length > 0) {
          console.log(`🆕 ${newOrders.length} new order(s) detected!`);
          playNotificationSound();
          
          // Flash the page title
          flashTitle(newOrders.length);
        }
      }
      
      // Update known order IDs
      knownOrderIds = new Set(orders.map(o => o.id));
      isFirstLoad = false;
      
      // Apply filter
      if (statusFilter !== 'all') {
        orders = orders.filter(order => order.status === statusFilter);
      }
      
      if (orders.length === 0) {
        container.innerHTML = '';
        noOrders.classList.remove('hidden');
        return;
      }
      
      noOrders.classList.add('hidden');
      container.innerHTML = orders.map(order => `
        <div class="order-card">
          <div class="order-header">
            <div>
              <span class="order-table">Table #${order.tableNumber}</span>
              <span class="order-time">${formatTime(order.timestamp)}</span>
            </div>
            <span class="order-status status-${order.status}">${order.status}</span>
          </div>
          <div class="order-items">
            ${order.items.map(item => `
              <div class="order-item">
                <div>
                  <span>${item.quantity}x ${item.name}</span>
                  ${item.addOns && item.addOns.length > 0 ? `
                    <div class="order-item-addons">+ ${item.addOns.join(', ')}</div>
                  ` : ''}
                </div>
                <span>${item.price} QAR</span>
              </div>
            `).join('')}
          </div>
          <div class="order-footer">
            <span class="order-total">Total: ${order.totalPrice} QAR</span>
            <div class="status-buttons">
              ${order.status === 'new' ? `
                <button class="status-btn" style="background: var(--warning);" onclick="updateOrderStatus('${order.id}', 'preparing')">Start</button>
              ` : ''}
              ${order.status === 'preparing' ? `
                <button class="status-btn" style="background: var(--success); color: white;" onclick="updateOrderStatus('${order.id}', 'ready')">Ready</button>
              ` : ''}
              ${order.status === 'ready' ? `
                <button class="status-btn" style="background: var(--muted-foreground); color: white;" onclick="updateOrderStatus('${order.id}', 'served')">Served</button>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }, (error) => {
      console.error('Error loading orders:', error);
      container.innerHTML = '<p>Error loading orders</p>';
    });
}

// Flash browser title for new orders
let titleFlashInterval = null;
function flashTitle(count) {
  const originalTitle = document.title;
  const alertTitle = `🔔 ${count} New Order${count > 1 ? 's' : ''}!`;
  
  // Clear any existing flash
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
  }
  
  let isOriginal = false;
  titleFlashInterval = setInterval(() => {
    document.title = isOriginal ? alertTitle : originalTitle;
    isOriginal = !isOriginal;
  }, 1000);
  
  // Stop flashing after 10 seconds
  setTimeout(() => {
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
      document.title = originalTitle;
    }
  }, 10000);
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await db.collection('orders').doc(orderId).update({ status: newStatus });
    // No need to reload - real-time listener will update automatically
  } catch (error) {
    console.error('Error updating order:', error);
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function setupAdminEventListeners() {
  document.getElementById('status-filter').addEventListener('change', (e) => {
    loadOrders(e.target.value);
  });
}

// QR Code Generation
function generateQRCodes() {
  const container = document.getElementById('qr-codes');
  const baseUrl = window.location.origin + window.location.pathname;
  
  container.innerHTML = '';
  
  for (let i = 1; i <= 6; i++) {
    const qrCard = document.createElement('div');
    qrCard.className = 'qr-card';
    qrCard.innerHTML = `
      <h3>Table ${i}</h3>
      <canvas id="qr-${i}"></canvas>
      <button class="btn btn-secondary btn-small" onclick="downloadQR(${i})">Download</button>
    `;
    container.appendChild(qrCard);
    
    const url = `${baseUrl}?table=${i}`;
    QRCode.toCanvas(document.getElementById(`qr-${i}`), url, {
      width: 150,
      margin: 2,
      color: { dark: '#422006', light: '#ffffff' }
    });
  }
}

function downloadQR(tableNum) {
  const canvas = document.getElementById(`qr-${tableNum}`);
  const link = document.createElement('a');
  link.download = `table-${tableNum}-qr.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--foreground);
    color: var(--background);
    padding: 0.75rem 1.5rem;
    border-radius: 2rem;
    font-weight: 500;
    z-index: 1000;
    animation: fadeInOut 2s ease-in-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 2000);
}

// Add fadeInOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    15%, 85% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);
