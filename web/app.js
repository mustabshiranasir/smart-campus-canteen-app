// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBz690Dmj0bopIONwpr9tL7GoWiWgn_gKM",
  authDomain: "smartcanteenapp-1a1b2.firebaseapp.com",
  projectId: "smartcanteenapp-1a1b2",
  storageBucket: "smartcanteenapp-1a1b2.firebasestorage.app",
  messagingSenderId: "788175552104",
  appId: "1:788175552104:web:4a0248682762a86fea85dd",
  measurementId: "G-BNW299935C"
};

/**
 * Smart Canteen Client Application Logic
 * Implements high-end interactive Canvas animations and auth state management
 */

// API Configuration
const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

/* ==========================================================================
   CANVAS FOOD PARTICLE SYSTEM
   ========================================================================== */
const canvas = document.getElementById('food-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouse = { x: null, y: null, radius: 100 };

// Auto resize canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
}
window.addEventListener('resize', resizeCanvas);

// Mouse events for hover interactions
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Procedural vector outlines for foods
const FOOD_SHAPES = {
  // PIZZA SLICE
  pizza(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Wedge
    ctx.beginPath();
    ctx.moveTo(0, -size/2);
    ctx.lineTo(-size/2, size/2);
    ctx.arcTo(0, size/2 + size/10, size/2, size/2, size/3);
    ctx.closePath();
    ctx.stroke();
    
    // Crust details
    ctx.beginPath();
    ctx.arc(0, size/2 + 2, size/5, Math.PI, 0, true);
    
    // Pepperonis (Toppings)
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(-size/6, size/10, size/12, 0, Math.PI * 2);
    ctx.arc(size/6, size/6, size/12, 0, Math.PI * 2);
    ctx.arc(0, -size/12, size/12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  },

  // BURGER
  burger(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const w = size;
    const h = size * 0.7;
    
    // Top Bun
    ctx.beginPath();
    ctx.arc(0, -h/6, w/2, Math.PI, 0);
    ctx.lineTo(-w/2, -h/6);
    ctx.stroke();
    
    // Patty
    ctx.beginPath();
    ctx.roundRect(-w/2 - 4, -h/12, w + 8, h/6, 4);
    ctx.stroke();
    
    // Bottom Bun
    ctx.beginPath();
    ctx.roundRect(-w/2, h/10, w, h/4, [0, 0, 8, 8]);
    ctx.stroke();
    
    // Sesame Seeds
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(-w/4, -h/3, 1.5, 0, Math.PI * 2);
    ctx.arc(0, -h/2.5, 1.5, 0, Math.PI * 2);
    ctx.arc(w/4, -h/3.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  },

  // COFFEE/DRINK CUP
  drink(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const w = size * 0.8;
    const h = size;
    
    // Cup body
    ctx.beginPath();
    ctx.moveTo(-w/2, -h/3);
    ctx.lineTo(-w/3, h/2);
    ctx.lineTo(w/3, h/2);
    ctx.lineTo(w/2, -h/3);
    ctx.closePath();
    ctx.stroke();
    
    // Lid
    ctx.beginPath();
    ctx.roundRect(-w/2 - 2, -h/3 - 4, w + 4, 6, 2);
    ctx.stroke();
    
    // Straw
    ctx.beginPath();
    ctx.moveTo(w/10, -h/3 - 4);
    ctx.lineTo(w/5, -h/2 - 6);
    ctx.lineTo(w/5 + 10, -h/2 - 6);
    ctx.stroke();
    
    // Sleeve/Label
    ctx.beginPath();
    ctx.moveTo(-w/2.3, -h/8);
    ctx.lineTo(-w/2.6, h/8);
    ctx.lineTo(w/2.6, h/8);
    ctx.lineTo(w/2.3, -h/8);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  },

  // DONUT
  donut(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    // Inner circle (cutout)
    ctx.arc(0, 0, size/5, 0, Math.PI * 2, true);
    ctx.stroke();
    
    // Sprinkles (dots)
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(-size/3, -size/12, 1.5, 0, Math.PI*2);
    ctx.arc(size/3, size/12, 1.5, 0, Math.PI*2);
    ctx.arc(-size/12, size/3, 1.5, 0, Math.PI*2);
    ctx.arc(size/12, -size/3, 1.5, 0, Math.PI*2);
    ctx.arc(size/4, -size/4, 1.5, 0, Math.PI*2);
    ctx.arc(-size/4, size/4, 1.5, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
  },

  // APPLE
  apple(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const r = size/2;
    
    // Apple contours (left and right lobes)
    ctx.beginPath();
    ctx.moveTo(0, -r/3);
    ctx.bezierCurveTo(-r/2, -r - 4, -r - 4, -r/2, -r, 0);
    ctx.bezierCurveTo(-r - 4, r/2, -r/2, r + 4, 0, r - 2);
    ctx.bezierCurveTo(r/2, r + 4, r + 4, r/2, r, 0);
    ctx.bezierCurveTo(r + 4, -r/2, r/2, -r - 4, 0, -r/3);
    ctx.closePath();
    ctx.stroke();
    
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, -r/3);
    ctx.quadraticCurveTo(r/4, -r - 2, r/3, -r - 8);
    ctx.stroke();
    
    // Leaf
    ctx.beginPath();
    ctx.moveTo(r/8, -r - 3);
    ctx.quadraticCurveTo(r/2, -r - 10, r - 2, -r - 4);
    ctx.quadraticCurveTo(r/2, -r, r/8, -r - 3);
    ctx.stroke();
    
    ctx.restore();
  },

  // TACO
  taco(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const r = size * 0.55;
    
    // Taco shell (semi-circle folded)
    ctx.beginPath();
    ctx.arc(0, r/4, r, Math.PI, 0);
    ctx.closePath();
    ctx.stroke();
    
    // Fillings sticking out
    ctx.beginPath();
    // Lettuce ruffles
    ctx.moveTo(-r + 4, r/4);
    ctx.quadraticCurveTo(-r + 10, -6, -r + 16, r/4);
    ctx.quadraticCurveTo(-r + 22, -10, -r + 30, r/4);
    ctx.quadraticCurveTo(0, -12, r - 30, r/4);
    ctx.quadraticCurveTo(r - 16, -6, r - 4, r/4);
    ctx.stroke();
    
    ctx.restore();
  }
};

const shapeKeys = Object.keys(FOOD_SHAPES);

// Particle Blueprint
class FoodParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.size = Math.random() * 20 + 26; // Size between 26px and 46px
    this.speedX = (Math.random() * 0.4 - 0.2); // Slow drift
    this.speedY = (Math.random() * 0.4 - 0.2);
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() * 0.005 - 0.0025);
    this.shape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
    
    // Opacity pulse
    this.opacity = Math.random() * 0.25 + 0.15;
    this.opacityDirection = Math.random() > 0.5 ? 0.002 : -0.002;
  }

  draw() {
    // Determine active colors based on CSS
    const computedStyle = getComputedStyle(document.body);
    const accentColor = computedStyle.getPropertyValue('--accent').trim();
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = this.opacity;
    
    FOOD_SHAPES[this.shape](ctx, this.x, this.y, this.size, this.angle);
  }

  update() {
    // Float movement
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.spin;
    
    // Bounce off screen boundaries
    if (this.x < -50) this.x = canvas.width + 50;
    if (this.x > canvas.width + 50) this.x = -50;
    if (this.y < -50) this.y = canvas.height + 50;
    if (this.y > canvas.height + 50) this.y = -50;

    // Opacity pulse
    this.opacity += this.opacityDirection;
    if (this.opacity > 0.4 || this.opacity < 0.1) {
      this.opacityDirection = -this.opacityDirection;
    }

    // Mouse Interaction (Push force away from cursor)
    if (mouse.x !== null && mouse.y !== null) {
      let dx = this.x - mouse.x;
      let dy = this.y - mouse.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        let force = (mouse.radius - distance) / mouse.radius;
        let directionX = dx / distance;
        let directionY = dy / distance;
        
        // Push particle away
        this.x += directionX * force * 4;
        this.y += directionY * force * 4;
      }
    }
  }
}

// Sparkle Particle Blueprint (Twinkling 4-point stars in background canvas)
class Sparkle {
  constructor(x, y) {
    this.x = x || Math.random() * canvas.width;
    this.y = y || Math.random() * canvas.height;
    this.size = Math.random() * 5 + 3; // 3px to 8px size
    this.speedY = -(Math.random() * 0.4 + 0.2); // Slowly rise upwards
    this.speedX = (Math.random() * 0.2 - 0.1);
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() * 0.02 - 0.01);
    this.alpha = Math.random() * 0.6 + 0.4;
    this.pulseSpeed = Math.random() * 0.04 + 0.02;
    this.pulseTime = Math.random() * 100;
  }

  draw() {
    const computedStyle = getComputedStyle(document.body);
    const accentColor = computedStyle.getPropertyValue('--accent').trim();
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = accentColor;
    ctx.fillStyle = '#FFFFFF';
    
    // Twinkling opacity
    ctx.globalAlpha = (Math.sin(this.pulseTime) * 0.5 + 0.5) * this.alpha * 0.75;
    
    // Draw 4-point star sparkle
    ctx.beginPath();
    ctx.moveTo(0, -this.size);
    ctx.quadraticCurveTo(0, 0, this.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, this.size);
    ctx.quadraticCurveTo(0, 0, -this.size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -this.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.spin;
    this.pulseTime += this.pulseSpeed;
    
    // If it floats off-screen top, reset to bottom
    if (this.y < -20) {
      this.y = canvas.height + 20;
      this.x = Math.random() * canvas.width;
    }
    if (this.x < -20 || this.x > canvas.width + 20) {
      this.x = Math.random() * canvas.width;
    }
  }
}

// Populate background particles (Mixed foods and sparkles)
function initParticles() {
  particles = [];
  const foodCount = Math.floor((canvas.width * canvas.height) / 45000) + 8;
  const sparkleCount = Math.floor((canvas.width * canvas.height) / 18000) + 20;
  
  for (let i = 0; i < foodCount; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    particles.push(new FoodParticle(rx, ry));
  }

  for (let i = 0; i < sparkleCount; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    particles.push(new Sparkle(rx, ry));
  }
}

// Game loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  requestAnimationFrame(animate);
}

// Boot canvas background
resizeCanvas();
initParticles();
animate();

/* ==========================================================================
   CARD SPARKLING OVERLAYS GENERATOR
   ========================================================================== */
const cardSparklesContainer = document.getElementById('card-sparkles');

function spawnCardSparkle() {
  if (!cardSparklesContainer) return;
  
  // Max 12 active sparkles to avoid DOM inflation
  if (cardSparklesContainer.children.length > 12) return;
  
  const sparkle = document.createElement('div');
  sparkle.className = 'card-sparkle';
  
  // Random position inside the card (leaving margins)
  const left = Math.random() * 92 + 4; // percentage
  const top = Math.random() * 92 + 4; // percentage
  
  // Random scale
  const scale = Math.random() * 0.6 + 0.7; // 0.7 to 1.3
  
  sparkle.style.left = `${left}%`;
  sparkle.style.top = `${top}%`;
  sparkle.style.transform = `scale(${scale})`;
  
  cardSparklesContainer.appendChild(sparkle);
  
  // Remove element after animation finishes
  sparkle.addEventListener('animationend', () => {
    sparkle.remove();
  });
}

// Spawn a sparkle every 300ms for a lively sparkling effect
setInterval(spawnCardSparkle, 300);


/* ==========================================================================
   ROLE SELECTOR & FORMS INTERACTION
   ========================================================================== */
const roleTabs = document.querySelectorAll('.role-tab');
let currentRole = 'student';

const loginIdentifierLabel = document.getElementById('lbl-login-identifier');
const loginIdentifierInput = document.getElementById('login-identifier');
const registerRollLabel = document.getElementById('lbl-register-roll');
const registerRollInput = document.getElementById('register-roll');
const registerRollGroup = document.getElementById('group-roll-number');
const registerAdminGroup = document.getElementById('group-admin-code');
const registerAdminInput = document.getElementById('register-admin-code');

// Toggle roles
roleTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    roleTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    currentRole = tab.getAttribute('data-role');
    
    // Update body class to apply role-specific CSS colors
    document.body.className = `role-${currentRole}`;
    
    // Dynamic Form adjustments
    if (currentRole === 'admin') {
      loginIdentifierLabel.textContent = 'Admin Email';
      loginIdentifierInput.placeholder = 'admin@canteen.com';
      
      registerRollGroup.classList.add('hidden');
      registerRollInput.required = false;
      
      registerAdminGroup.classList.remove('hidden');
      registerAdminInput.required = true;
    } else if (currentRole === 'faculty') {
      loginIdentifierLabel.textContent = 'Email or Faculty ID';
      loginIdentifierInput.placeholder = 'Enter email or Faculty ID';
      
      registerRollLabel.textContent = 'Faculty ID';
      registerRollInput.placeholder = 'FAC-12345';
      registerRollGroup.classList.remove('hidden');
      registerRollInput.required = true;
      
      registerAdminGroup.classList.add('hidden');
      registerAdminInput.required = false;
    } else {
      // Student
      loginIdentifierLabel.textContent = 'Email or Roll Number';
      loginIdentifierInput.placeholder = 'Enter email or roll number';
      
      registerRollLabel.textContent = 'Roll Number';
      registerRollInput.placeholder = 'BS-CS-21-001';
      registerRollGroup.classList.remove('hidden');
      registerRollInput.required = true;
      
      registerAdminGroup.classList.add('hidden');
      registerAdminInput.required = false;
    }
  });
});


/* ==========================================================================
   FORM VIEW TOGGLE (LOGIN VS REGISTER)
   ========================================================================== */
const btnLoginMode = document.getElementById('btn-login-mode');
const btnRegisterMode = document.getElementById('btn-register-mode');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleSlider = document.querySelector('.toggle-slider');

function showLoginForm() {
  btnLoginMode.classList.add('active');
  btnRegisterMode.classList.remove('active');
  toggleSlider.style.transform = 'translateX(0)';
  
  registerForm.classList.remove('active-form');
  setTimeout(() => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'flex';
    setTimeout(() => loginForm.classList.add('active-form'), 50);
  }, 350);
}

function showRegisterForm() {
  btnRegisterMode.classList.add('active');
  btnLoginMode.classList.remove('active');
  toggleSlider.style.transform = 'translateX(100%)';
  
  loginForm.classList.remove('active-form');
  setTimeout(() => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'grid';
    setTimeout(() => registerForm.classList.add('active-form'), 50);
  }, 350);
}

btnLoginMode.addEventListener('click', showLoginForm);
btnRegisterMode.addEventListener('click', showRegisterForm);


/* ==========================================================================
   PASSWORD VISIBILITY TOGGLE
   ========================================================================== */
const passwordEyeBtnList = document.querySelectorAll('.eye-toggle-btn');
passwordEyeBtnList.forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const icon = btn.querySelector('ion-icon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.name = 'eye-off-outline';
    } else {
      input.type = 'password';
      icon.name = 'eye-outline';
    }
  });
});


/* ==========================================================================
   TOAST FLOATING ALERTS
   ========================================================================== */
const toastContainer = document.getElementById('toast-container');

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'information-circle-outline';
  if (type === 'success') iconName = 'checkmark-circle-outline';
  if (type === 'error') iconName = 'alert-circle-outline';
  
  toast.innerHTML = `
    <ion-icon name="${iconName}"></ion-icon>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Slide out and remove toast after 4s
  setTimeout(() => {
    toast.classList.add('toast-leave');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}


/* ==========================================================================
   FORM SUBMISSIONS (API INTEGRATION)
   ========================================================================== */

// Client Side Input Validations
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  // Validate that the phone number part is exactly 10 digits (as requested, same for each country)
  return /^[0-9]{10}$/.test(phone.replace(/\s/g, ''));
}

function validatePassword(pw) {
  // Min 6 characters, must contain letter and number (backend rules)
  if (pw.length < 6) return 'Password must be at least 6 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
}

// ─── LOGIN PROCESS ───
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = loginForm.querySelector('.submit-btn');
  
  if (!identifier) {
    showToast('Please enter your email or roll number', 'error');
    return;
  }
  
  // Set Loading UI
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password,
        role: currentRole
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`Welcome back, ${data.data.name}!`, 'success');
      
      // Store session details
      localStorage.setItem('userToken', data.data.token);
      localStorage.setItem('userData', JSON.stringify(data.data));
      
      // Redirect based on role or home dashboard
      setTimeout(() => {
        showToast('Login successful. Redirecting...', 'info');
      }, 1000);
    } else {
      showToast(data.message || 'Login failed. Please check credentials.', 'error');
    }
  } catch (error) {
    showToast('Failed to connect to backend server.', 'error');
    console.error('Login error:', error);
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});


// ─── REGISTRATION PROCESS WITH OTP FLOW ───
const registerSubmitBtn = document.getElementById('btn-register-submit');
const otpSection = document.getElementById('otp-section');
const otpInput = document.getElementById('register-otp');
let isOtpSent = false;
let verifiedPhone = '';

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const countryCode = document.getElementById('country-code').value;
  const phoneRaw = document.getElementById('register-phone').value.trim();
  const phone = countryCode + phoneRaw;
  const roll = document.getElementById('register-roll').value.trim();
  const password = document.getElementById('register-password').value;
  const adminCode = document.getElementById('register-admin-code').value.trim();
  
  // Client side validation
  if (!name || !email || !password || !phone) {
    showToast('Please fill in all standard fields', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    showToast('Invalid email address format', 'error');
    return;
  }
  
  if (!validatePhone(phoneRaw)) {
    showToast('Phone number must be exactly 10 digits', 'error');
    return;
  }
  
  const pwError = validatePassword(password);
  if (pwError) {
    showToast(pwError, 'error');
    return;
  }

  // Set Loading UI
  registerSubmitBtn.classList.add('loading');
  registerSubmitBtn.disabled = true;
  
  if (!isOtpSent) {
    // STEP 1: TRIGGER PHONE OTP SENDER
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role: currentRole })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Verification code sent to your phone!', 'success');
        isOtpSent = true;
        verifiedPhone = phone;
        
        // Show OTP section in the form
        otpSection.classList.remove('hidden');
        otpInput.required = true;
        
        // Change submit button description
        registerSubmitBtn.querySelector('.btn-text').textContent = 'Verify & Register';
      } else {
        showToast(data.message || 'Failed to send OTP code.', 'error');
      }
    } catch (error) {
      showToast('Connection to auth service failed.', 'error');
      console.error('Send OTP error:', error);
    } finally {
      registerSubmitBtn.classList.remove('loading');
      registerSubmitBtn.disabled = false;
    }
  } else {
    // STEP 2: FINALIZE REGISTRATION (POST with OTP)
    const otpCode = otpInput.value.trim();
    if (!otpCode || otpCode.length !== 6) {
      showToast('Please enter the 6-digit OTP code', 'error');
      registerSubmitBtn.classList.remove('loading');
      registerSubmitBtn.disabled = false;
      return;
    }
    
    // Assemble payload matching Zod registerSchema
    const payload = {
      name,
      email,
      password,
      phone: verifiedPhone,
      role: currentRole,
      otpCode
    };
    
    if (currentRole === 'student' || currentRole === 'faculty') {
      payload.rollNumber = roll;
    }
    if (currentRole === 'admin') {
      payload.adminCode = adminCode;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Registration successful! Redirecting to login...', 'success');
        setTimeout(() => {
          showLoginForm();
          
          // Clear registration inputs
          registerForm.reset();
          isOtpSent = false;
          otpSection.classList.add('hidden');
          otpInput.required = false;
          registerSubmitBtn.querySelector('.btn-text').textContent = 'Send Verification OTP';
        }, 1500);
      } else {
        showToast(data.message || 'Registration failed. Check details.', 'error');
      }
    } catch (error) {
      showToast('Could not complete registration request.', 'error');
      console.error('Register error:', error);
    } finally {
      registerSubmitBtn.classList.remove('loading');
      registerSubmitBtn.disabled = false;
    }
  }
});
/* ==========================================================================
   POPULATE COUNTRY CODES
   ========================================================================== */
const countrySelect = document.getElementById('country-code');
if (countrySelect) {
  const countries = [
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'Brazil', code: '+55', flag: '🇧🇷' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'China', code: '+86', flag: '🇨🇳' },
    { name: 'France', code: '+33', flag: '🇫🇷' },
    { name: 'Germany', code: '+49', flag: '🇩🇪' },
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
    { name: 'Italy', code: '+39', flag: '🇮🇹' },
    { name: 'Japan', code: '+81', flag: '🇯🇵' },
    { name: 'Mexico', code: '+52', flag: '🇲🇽' },
    { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
    { name: 'Russia', code: '+7', flag: '🇷🇺' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦' },
    { name: 'South Korea', code: '+82', flag: '🇰🇷' },
    { name: 'Spain', code: '+34', flag: '🇪🇸' },
    { name: 'Turkey', code: '+90', flag: '🇹🇷' },
    { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'United States', code: '+1', flag: '🇺🇸' },
  ];
  
  countrySelect.innerHTML = '';
  countries.forEach(c => {
    const option = document.createElement('option');
    option.value = c.code;
    option.textContent = `${c.flag} ${c.code} (${c.name})`;
    option.style.color = '#000';
    if (c.code === '+92') option.selected = true; // default Pakistan
    countrySelect.appendChild(option);
  });
}

/* ==========================================================================
   DYNAMIC THEME ASSETS (LOGO & FAVICON)
   ========================================================================== */
const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
const brandLogoImg = document.querySelector('.logo-icon-container img');

function updateThemeAssets(e) {
  const isDark = e.matches;
  
  // Update main logo
  if (brandLogoImg) {
    brandLogoImg.src = isDark ? 'logo-dark.jpg' : 'logo.png';
  }
  
  // Update Favicon
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = isDark ? 'logo-dark.jpg' : 'logo.png';
}

if (darkModeMediaQuery) {
  darkModeMediaQuery.addEventListener('change', updateThemeAssets);
  updateThemeAssets(darkModeMediaQuery); // Initial check
}
