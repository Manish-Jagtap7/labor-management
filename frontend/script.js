// ================================
// API CONFIGURATION
// ================================
const API_BASE = '/api/v1';

// ================================
// AUTH STATE MANAGEMENT
// ================================
let currentUser = null;
let authToken = null;

function loadAuth() {
    authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    }
}

function saveAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('pendingToast', 'Welcome back! 🎉');
    sessionStorage.setItem('pendingToastType', 'success');
    window.location.reload();
}

function logoutUser() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    sessionStorage.setItem('pendingToast', 'Logged out successfully');
    sessionStorage.setItem('pendingToastType', 'info');
    window.location.reload();
}

function updateUIForLoggedInUser() {
    const authBtn = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const greeting = document.getElementById('userGreeting');
    
    if (authBtn) authBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (greeting) greeting.textContent = `Hi, ${currentUser.full_name || currentUser.email}`;
}

// ================================
// API HELPERS
// ================================
async function apiPost(endpoint, body, useAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiGet(endpoint, useAuth = false) {
    const headers = {};
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiPut(endpoint, body, useAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiFormPost(endpoint, formData) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

// ================================
// MODAL MANAGEMENT
// ================================
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showLoginModal() {
    closeAllModals();
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginForm').reset();
    document.getElementById('loginModal').classList.add('active');
}

function showRegisterModal(role = 'customer') {
    closeAllModals();
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerForm').reset();
    document.getElementById('regRole').value = role;
    toggleProviderFields();
    document.getElementById('registerModal').classList.add('active');
}

// Show/hide provider-specific fields based on role selection
function toggleProviderFields() {
    const role = document.getElementById('regRole').value;
    document.getElementById('providerFields').style.display = role === 'provider' ? 'block' : 'none';
}

// ================================
// AUTH HANDLERS
// ================================
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
        const formData = new URLSearchParams();
        formData.append('username', document.getElementById('loginEmail').value);
        formData.append('password', document.getElementById('loginPassword').value);

        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        // Fetch full user details from /me to get actual role
        const meRes = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const user = await meRes.json();
        
        // Save correct role for UI logic
        localStorage.setItem('user_role', user.role);

        saveAuth(data.access_token, user);
        closeAllModals();
        showToast('Welcome back! 🎉', 'success');
    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        btn.textContent = 'Log In';
        btn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const role = document.getElementById('regRole').value;
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        // 1. Register the user
        await apiPost('/auth/register', {
            email: email,
            full_name: fullName,
            password: password,
            role: role
        });

        // 2. Login to get token
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error('Registered but failed to auto-login');

        // Save user name for future logins
        localStorage.setItem('user_name_' + email, fullName);
        localStorage.setItem('user_role', role);

        saveAuth(loginData.access_token, { email, full_name: fullName, role });

        // 3. If provider, create their profile
        if (role === 'provider') {
            const industry = document.getElementById('regIndustry').value;
            const skills = document.getElementById('regSkills').value || 'General Labour';
            const location = document.getElementById('regLocation').value || 'Not specified';
            const wage = parseFloat(document.getElementById('regWage').value) || 500;
            const experience = parseInt(document.getElementById('regExperience').value) || 0;
            
            // Read image if provided
            let imageUrl = null;
            const fileInput = document.getElementById('regImage');
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const reader = new FileReader();
                imageUrl = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
            }

            await apiPost('/profiles/provider', {
                industry,
                skills,
                location,
                expected_wage: wage,
                experience_years: experience,
                is_available: true,
                image_url: imageUrl
            }, true);

            showToast('Worker profile created! You are now visible to customers.', 'success');
        } else {
            // Create customer profile
            await apiPost('/profiles/customer', {
                company_name: fullName,
                location: ''
            }, true);
            showToast('Account created! Start searching for workers.', 'success');
        }

        closeAllModals();
        // Refresh worker listings if a new provider was added
        if (role === 'provider') searchWorkers();

    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}

// ================================
// WORKER SEARCH & DISPLAY
// ================================

// Placeholder images for workers based on industry
const industryImages = {
    'Construction': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop',
    'Agriculture':  'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=800&auto=format&fit=crop',
    'Electrical':   'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800&auto=format&fit=crop',
    'Cleaning':     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop',
};
const defaultImage = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800&auto=format&fit=crop';

// Dummy fallback workers for when backend has no data
const dummyWorkers = [
    { id: 'dummy-1', user_id: -1, industry: 'Construction', skills: 'Senior Mason', experience_years: 8, location: 'Mumbai, MH', expected_wage: 800, is_available: true, _name: 'Rajesh Kumar' },
    { id: 'dummy-2', user_id: -2, industry: 'Agriculture', skills: 'Tractor Operator', experience_years: 5, location: 'Pune, MH', expected_wage: 650, is_available: true, _name: 'Suresh Singh' },
    { id: 'dummy-3', user_id: -3, industry: 'Electrical', skills: 'Industrial Electrician', experience_years: 12, location: 'Delhi, DL', expected_wage: 1000, is_available: true, _name: 'Amit Patel' },
    { id: 'dummy-4', user_id: -4, industry: 'Construction', skills: 'General Helper', experience_years: 2, location: 'Navi Mumbai, MH', expected_wage: 500, is_available: true, _name: 'Ramesh Yadav' },
    { id: 'dummy-5', user_id: -5, industry: 'Electrical', skills: 'HVAC Technician', experience_years: 7, location: 'Bengaluru, KA', expected_wage: 1200, is_available: true, _name: 'Vikas Sharma' },
    { id: 'dummy-6', user_id: -6, industry: 'Cleaning', skills: 'Industrial Cleaner', experience_years: 3, location: 'Gurgaon, HR', expected_wage: 450, is_available: true, _name: 'Sanjay Gupta' },
];

// ================================
// ACTIVE REQUESTS & UI
// ================================
let userActiveRequests = {};

async function fetchActiveRequests() {
    if(!authToken || !currentUser) return;
    try {
        const role = currentUser.role;
        const endpoint = role === 'provider' ? '/hiring/provider/incoming-requests' : '/hiring/customer/my-requests';
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if(!res.ok) return;
        const requests = await res.json();
        
        // Fetch unread messages count
        let unreadCount = 0;
        try {
            const unreadRes = await fetch(`${API_BASE}/chat/unread-count`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (unreadRes.ok) {
                const unreadData = await unreadRes.json();
                unreadCount = unreadData.unread_count || 0;
            }
        } catch (e) { console.error("Failed to fetch unread count", e); }
        
        const activeRequestsCount = requests.filter(r => r.status === 'pending').length;
        const totalNotifications = activeRequestsCount + unreadCount;
        
        const navBadge = document.getElementById('navBadge');
        if(navBadge) {
            if(totalNotifications > 0) {
                navBadge.textContent = totalNotifications;
                navBadge.classList.remove('hidden');
            } else {
                navBadge.classList.add('hidden');
            }
        }
        
        userActiveRequests = {};
        if (role === 'customer') {
            requests.forEach(r => {
                if(r.status === 'pending' || r.status === 'accepted') {
                    userActiveRequests[r.provider_id] = r;
                }
            });
        }
    } catch (e) {}
}

async function searchWorkers() {
    const industry = document.getElementById('industryFilter').value;
    const location = document.getElementById('locationFilter').value;

    let workers = [];

    try {
        let url = `/search/providers?`;
        if (industry) url += `&industry=${encodeURIComponent(industry)}`;
        if (location) url += `&location=${encodeURIComponent(location)}`;
        workers = await apiGet(url);
    } catch (err) {
        console.warn('Backend not reachable, using dummy data:', err.message);
        workers = [...dummyWorkers];
        // Apply client-side filters to dummy data
        if (industry) workers = workers.filter(w => w.industry.toLowerCase() === industry.toLowerCase());
        if (location) workers = workers.filter(w => w.location.toLowerCase().includes(location.toLowerCase()));
    }

    renderWorkers(workers);
    // Scroll to worker section
    document.getElementById('workers-section').scrollIntoView({ behavior: 'smooth' });
}

function renderWorkers(workers) {
    const grid = document.getElementById('workerGrid');
    const noMsg = document.getElementById('noWorkersMsg');

    if (!workers || workers.length === 0) {
        grid.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    grid.innerHTML = '';

    workers.forEach((worker, index) => {
        const workerName = (worker.user && worker.user.full_name) ? worker.user.full_name : (worker._name || worker.skills.split(',')[0].trim() + ' Worker');
        const image = worker.image_url || industryImages[worker.industry] || defaultImage;

        const card = document.createElement('div');
        card.className = 'worker-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="worker-image-container">
                <div class="status-badge">${worker.is_available ? 'Available Now' : 'Unavailable'}</div>
                <img src="${image}" alt="${workerName}" class="worker-image" loading="lazy">
            </div>
            <div class="worker-info">
                <div class="worker-header">
                    <div class="worker-name">${workerName}</div>
                </div>
                <div class="worker-role">${worker.skills}</div>
                <div class="worker-meta">
                    <span class="worker-tag"><i class="fa-solid fa-industry"></i> ${worker.industry}</span>
                    <span class="worker-tag"><i class="fa-solid fa-briefcase"></i> ${worker.experience_years} yrs exp</span>
                </div>
                <div class="worker-details">
                    <div><i class="fa-solid fa-location-dot"></i> ${worker.location}</div>
                    <div class="wage"><i class="fa-solid fa-indian-rupee-sign"></i> ${worker.expected_wage}/day</div>
                </div>
                ${getWorkerActionHtml(worker, workerName)}
            </div>
        `;
        // Make entire card clickable for viewing profile
        card.addEventListener('click', (e) => {
            // Prevent navigating if user clicked the hire button
            if(e.target.closest('button')) return;
            window.location.href = `worker.html?id=${worker.user_id}`;
        });
        card.style.cursor = 'pointer';
        grid.appendChild(card);
    });

    setupIntersectionObserver();
}

function getWorkerActionHtml(worker, workerName) {
    if(!currentUser || currentUser.role !== 'customer') {
        return ``; // Providers shouldn't see hire buttons at all
    }
    const req = userActiveRequests[worker.user_id];
    if(!req) {
        return `<button class="btn btn-primary hire-btn" onclick="openHireModal(${worker.user_id}, '${workerName.replace(/'/g, "\\'")}', ${worker.expected_wage})">Request to Hire</button>`;
    } else if (req.status === 'pending') {
        return `<button class="btn btn-secondary hire-btn" style="background:#e2e8f0; color:var(--text-light); border:none; pointer-events:none;">Request Sent</button>`;
    } else if (req.status === 'accepted') {
        return `<button class="btn btn-primary hire-btn" style="background:#22c55e;" onclick="window.location.href='chat.html?id=${req.id}'"><i class="fa-solid fa-message"></i> Start Chat</button>`;
    }
    return `<button class="btn btn-primary hire-btn" onclick="openHireModal(${worker.user_id}, '${workerName.replace(/'/g, "\\'")}', ${worker.expected_wage})">Request to Hire</button>`;
}

// ================================
// FILTERS
// ================================
function filterByIndustry(industry) {
    document.getElementById('industryFilter').value = industry;
    searchWorkers();
}

// ================================
// HIRING REQUEST
// ================================
function openHireModal(providerId, workerName, suggestedWage) {
    if (!currentUser) {
        showToast('Please log in first to send a hiring request.', 'warning');
        showLoginModal();
        return;
    }
    const role = localStorage.getItem('user_role');
    if (role === 'provider') {
        showToast('Only customers can send hiring requests.', 'warning');
        return;
    }

    document.getElementById('hireProviderId').value = providerId;
    document.getElementById('hireWorkerName').textContent = workerName;
    document.getElementById('hireWage').value = suggestedWage;
    document.getElementById('hireError').textContent = '';
    document.getElementById('hireJobDesc').value = '';
    // Set minimum date to today
    document.getElementById('hireDateNeeded').min = new Date().toISOString().split('T')[0];
    document.getElementById('hireModal').classList.add('active');
}

async function handleHireRequest(e) {
    e.preventDefault();
    const btn = document.getElementById('hireBtn');
    const errEl = document.getElementById('hireError');
    errEl.textContent = '';
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
        const providerId = parseInt(document.getElementById('hireProviderId').value);
        if (providerId < 0) {
            // Dummy worker — just simulate success
            closeAllModals();
            showToast('Request sent successfully! (Demo mode)', 'success');
            return;
        }

        await apiPost('/hiring/request', {
            provider_id: providerId,
            job_description: document.getElementById('hireJobDesc').value,
            date_needed: document.getElementById('hireDateNeeded').value,
            proposed_wage: parseFloat(document.getElementById('hireWage').value)
        }, true);

        closeAllModals();
        showToast('Hiring request sent successfully! 🎉', 'success');
        
        // Refresh UI state
        await fetchActiveRequests();
        
        if (document.getElementById('workerGrid')) {
            searchWorkers();
        } else if (typeof renderWorkerProfile !== 'undefined') {
            window.location.reload();
        }
    } catch (err) {
        errEl.textContent = err.message;
    } finally {
        btn.textContent = 'Send Request';
        btn.disabled = false;
    }
}

// ================================
// MY REQUESTS VIEW
// ================================
async function showMyRequests() {
    const role = localStorage.getItem('user_role');
    const listEl = document.getElementById('requestsList');
    const titleEl = document.getElementById('requestsTitle');
    listEl.innerHTML = '<p style="text-align:center; color: var(--text-light);">Loading...</p>';
    document.getElementById('requestsModal').classList.add('active');

    try {
        let requests;
        if (role === 'provider') {
            titleEl.textContent = 'Incoming Job Requests';
            requests = await apiGet('/hiring/provider/incoming-requests', true);
        } else {
            titleEl.textContent = 'My Hiring Requests';
            requests = await apiGet('/hiring/customer/my-requests', true);
        }

        if (requests.length === 0) {
            listEl.innerHTML = '<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No requests yet.</p></div>';
            return;
        }

        listEl.innerHTML = requests.map(req => `
            <div class="request-card">
                <div class="request-header">
                    <span class="request-status status-${req.status}">${req.status.toUpperCase()}</span>
                    <span class="request-date">${new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                <p class="request-desc">${req.job_description}</p>
                <div class="request-details">
                    <span><i class="fa-solid fa-calendar"></i> ${req.date_needed}</span>
                    <span><i class="fa-solid fa-indian-rupee-sign"></i> ${req.proposed_wage}/day</span>
                </div>
                ${role === 'provider' && req.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="btn btn-primary btn-sm" onclick="updateRequestStatus(${req.id}, 'accepted')">
                            <i class="fa-solid fa-check"></i> Accept
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus(${req.id}, 'declined')">
                            <i class="fa-solid fa-xmark"></i> Decline
                        </button>
                    </div>
                ` : ''}
                ${req.status === 'accepted' ? `
                    <div class="request-actions" style="margin-top: 1rem;">
                        <button class="btn btn-primary btn-sm" onclick="window.location.href='chat.html?id=${req.id}'" style="width: 100%;">
                            <i class="fa-solid fa-message"></i> Start Chat
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');

    } catch (err) {
        listEl.innerHTML = `<p style="color: #ef4444; text-align:center;">${err.message}</p>`;
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        await apiPut(`/hiring/provider/requests/${requestId}/status`, { status }, true);
        showToast(`Request ${status}! ✅`, 'success');
        showMyRequests(); // Refresh the list
} catch (err) {
        showToast(err.message, 'error');
    }
}

// ================================
// TOAST NOTIFICATIONS
// ================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-visible`;
    setTimeout(() => { toast.classList.remove('toast-visible'); }, 3500);
}

// ================================
// INTERSECTION OBSERVER (ANIMATIONS)
// ================================
function setupIntersectionObserver() {
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.industry-card, .worker-card, .step, .section-header');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s`;
        observer.observe(el);
    });
}

// ================================
// EVENT LISTENERS
// ================================

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeAllModals();
});

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', async () => {
    loadAuth();
    await fetchActiveRequests();
    
    // Only call on index.html
    if (document.getElementById('workerGrid')) {
        searchWorkers();
    }
    
    // Only bind on index.html
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', toggleProviderFields);
    }
    
    // Show pending toasts after reload
    const pendingToast = sessionStorage.getItem('pendingToast');
    if (pendingToast) {
        showToast(pendingToast, sessionStorage.getItem('pendingToastType') || 'info');
        sessionStorage.removeItem('pendingToast');
        sessionStorage.removeItem('pendingToastType');
    }
});
