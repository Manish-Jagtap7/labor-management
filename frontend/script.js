// ================================
// API CONFIGURATION
// ================================
const API_BASE = 'http://localhost:8000/api/v1';

function formatImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const backendOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');
    if (url.includes(':5500/uploads/')) {
        return url.replace(/http:\/\/[^/]+:5500/, backendOrigin);
    }
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

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
    if (greeting) {
        if (currentUser.role === 'admin') {
            greeting.innerHTML = `<span class="badge" style="border: 1px solid var(--border); font-size:0.72rem; margin-right:0.35rem;"><i class="fa-solid fa-shield-halved"></i> Admin</span> Hi, ${currentUser.full_name || currentUser.email.split('@')[0]}`;
        } else {
            greeting.textContent = `Hi, ${currentUser.full_name || currentUser.email.split('@')[0]}`;
        }
    }

    // If admin, show Admin Panel button in navbar
    if (currentUser.role === 'admin' && userMenu && !document.getElementById('navAdminBtn')) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'navAdminBtn';
        adminBtn.className = 'btn btn-secondary btn-sm';
        adminBtn.style.marginRight = '0.5rem';
        adminBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin panel';
        adminBtn.onclick = () => window.location.href = 'admin.html';
        userMenu.insertBefore(adminBtn, userMenu.firstChild.nextSibling);
    }
}

// ================================
// API HELPERS
// ================================
async function apiPost(endpoint, body, useAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(res.ok ? 'Server returned non-JSON response' : `Request failed (${res.status})`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiGet(endpoint, useAuth = false) {
    const headers = {};
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(res.ok ? 'Server returned non-JSON response' : `Request failed (${res.status})`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiPut(endpoint, body, useAuth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(res.ok ? 'Server returned non-JSON response' : `Request failed (${res.status})`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Something went wrong');
    return data;
}

async function apiFormPost(endpoint, formData) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error(res.ok ? 'Server returned non-JSON response' : `Request failed (${res.status})`);
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
        authToken = data.access_token;
        currentUser = user;
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(user));
        closeAllModals();

        if (user.role === 'admin') {
            sessionStorage.setItem('pendingToast', 'Welcome to Admin Panel 🛡️');
            sessionStorage.setItem('pendingToastType', 'success');
            window.location.href = 'admin.html';
            return;
        }

        sessionStorage.setItem('pendingToast', 'Welcome back! 🎉');
        sessionStorage.setItem('pendingToastType', 'success');
        window.location.reload();
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
        if (role === 'provider') {
            const aadhaarInput = document.getElementById('regAadhaar');
            const panInput = document.getElementById('regPan');
            if (!aadhaarInput.files || !aadhaarInput.files[0] || !panInput.files || !panInput.files[0]) {
                throw new Error('Both Aadhaar Card and PAN Card are compulsory verification documents for all labours.');
            }
        }

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

        // Temporarily set auth state to allow profile creation API calls
        authToken = loginData.access_token;
        currentUser = { email, full_name: fullName, role };
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));

        // Read chosen location from the address picker
        const locHidden = document.getElementById('regLocation');
        const locationVal = (locHidden && locHidden.value.trim()) ? locHidden.value.trim() : 'Maharashtra';

        // 3. Create profile based on selected role
        if (role === 'provider') {
            btn.textContent = 'Uploading documents...';
            const industry = document.getElementById('regIndustry').value;
            const skills = document.getElementById('regSkills').value || 'General Labour';
            const wage = parseFloat(document.getElementById('regWage').value) || 500;
            const experience = parseInt(document.getElementById('regExperience').value) || 0;
            
            // Upload Aadhaar Card
            const aadhaarInput = document.getElementById('regAadhaar');
            const aadhaarFormData = new FormData();
            aadhaarFormData.append('file', aadhaarInput.files[0]);
            const aadhaarRes = await fetch(`${API_BASE}/upload/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: aadhaarFormData
            });
            if (!aadhaarRes.ok) throw new Error('Failed to upload Aadhaar Card. Ensure file is an image.');
            const aadhaarData = await aadhaarRes.json();
            const aadhaarUrl = aadhaarData.url;

            // Upload PAN Card
            const panInput = document.getElementById('regPan');
            const panFormData = new FormData();
            panFormData.append('file', panInput.files[0]);
            const panRes = await fetch(`${API_BASE}/upload/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: panFormData
            });
            if (!panRes.ok) throw new Error('Failed to upload PAN Card. Ensure file is an image.');
            const panData = await panRes.json();
            const panUrl = panData.url;

            // Upload Profile Picture (if provided)
            let imageUrl = null;
            const fileInput = document.getElementById('regImage');
            if (fileInput.files && fileInput.files[0]) {
                const imgFormData = new FormData();
                imgFormData.append('file', fileInput.files[0]);
                const imgRes = await fetch(`${API_BASE}/upload/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: imgFormData
                });
                if (imgRes.ok) {
                    const imgData = await imgRes.json();
                    imageUrl = imgData.url;
                }
            }

            await apiPost('/profiles/provider', {
                industry,
                skills,
                location: locationVal,
                expected_wage: wage,
                experience_years: experience,
                is_available: true,
                image_url: imageUrl,
                aadhaar_card_url: aadhaarUrl,
                pan_card_url: panUrl,
                approval_status: 'pending'
            }, true);
        } else if (role === 'customer') {
            // Create customer profile with selected location
            await apiPost('/profiles/customer', {
                company_name: fullName,
                location: locationVal
            }, true);
        }

        closeAllModals();
        
        sessionStorage.setItem('pendingToast', role === 'provider' ? 'Labour profile registered! Waiting for admin approval before going live.' : 'Customer account created! Start searching.');
        sessionStorage.setItem('pendingToastType', 'success');
        window.location.reload();

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

// ================================
// ACTIVE REQUESTS & UI
// ================================
let userActiveRequests = {};

async function fetchActiveRequests() {
    if(!authToken || !currentUser) return;
    try {
        const role = currentUser.role;
        const endpoint = (role === 'provider') ? '/hiring/provider/incoming-requests' : '/hiring/customer/my-requests';
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if(!res.ok) return;
        const ct = res.headers.get('content-type') || '';
        if(!ct.includes('application/json')) return;
        const requests = await res.json();
        
        // Fetch unread messages count
        let unreadCount = 0;
        try {
            const unreadRes = await fetch(`${API_BASE}/chat/unread-count`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (unreadRes.ok) {
                const uct = unreadRes.headers.get('content-type') || '';
                if (uct.includes('application/json')) {
                    const unreadData = await unreadRes.json();
                    unreadCount = unreadData.unread_count || 0;
                }
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
                    // Use profile_id if available, otherwise provider_id
                    const key = r.profile_id ? r.profile_id : r.provider_id;
                    userActiveRequests[key] = r;
                }
            });
        }
    } catch (e) {}
}

async function searchWorkers(shouldScroll = false) {
    const industry = document.getElementById('industryFilter')?.value || '';
    const location = document.getElementById('locationFilter')?.value || '';

    let workers = [];

    try {
        let url = `/search/providers?`;
        if (industry) url += `&industry=${encodeURIComponent(industry)}`;
        if (location) url += `&location=${encodeURIComponent(location)}`;
        workers = await apiGet(url);
    } catch (err) {
        console.warn('Could not load workers:', err.message);
        workers = [];
    }

    renderWorkers(workers);
    if (shouldScroll) {
        const sec = document.getElementById('workers-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    }
}

function renderWorkers(workers) {
    const grid = document.getElementById('workerGrid');
    const noMsg = document.getElementById('noWorkersMsg');

    if (!workers || workers.length === 0) {
        grid.innerHTML = '';
        noMsg.style.display = 'flex';
        return;
    }

    noMsg.style.display = 'none';
    grid.innerHTML = '';

    workers.forEach((worker, index) => {
        const workerName = (worker.user && worker.user.full_name) ? worker.user.full_name : (worker.full_name || worker.skills.split(',')[0].trim() + ' Worker');
        const image = worker.image_url ? formatImageUrl(worker.image_url) : (industryImages[worker.industry] || defaultImage);

        const card = document.createElement('div');
        card.className = 'card-chai worker-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="worker-card-banner">
                <span class="worker-card-status status-tag ${worker.is_available ? 'approved' : 'busy'}">
                    ${worker.is_available ? 'Available' : 'Busy'}
                </span>
                <img src="${image}" alt="${workerName}" loading="lazy">
            </div>
            <div class="worker-card-body">
                <div class="worker-name-role">
                    <h3>${workerName}</h3>
                    <div class="skills-tag">${worker.skills}</div>
                </div>

                <div class="worker-meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Trade</span>
                        <span class="meta-value">${worker.industry}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Experience</span>
                        <span class="meta-value">${worker.experience_years} yrs</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Location</span>
                        <span class="meta-value location" title="${worker.location}">
                            <i class="fa-solid fa-location-dot" style="font-size:0.75rem; color:var(--muted-foreground);"></i> ${worker.location}
                        </span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Daily rate</span>
                        <span class="meta-value wage">₹${worker.expected_wage}</span>
                    </div>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-top:0.25rem;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(worker.location)}" target="_blank" rel="noopener" class="btn-map-link" onclick="event.stopPropagation();" title="View location on Google Maps">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Google Maps
                    </a>
                </div>

                ${getWorkerActionHtml(worker, workerName)}
            </div>
        `;
        // Make entire card clickable for viewing profile
        card.addEventListener('click', (e) => {
            // Prevent navigating if user clicked an action button or link
            if (e.target.closest('button') || e.target.closest('a')) return;
            window.location.href = `worker.html?id=${worker.id}`;
        });
        card.style.cursor = 'pointer';
        grid.appendChild(card);
    });

    setupIntersectionObserver();
}

function getWorkerActionHtml(worker, workerName) {
    if (!currentUser || currentUser.role !== 'customer') {
        return ``; // Providers do not see hiring request buttons
    }
    const ownerId = worker.user_id;
    const req = userActiveRequests[worker.id];
    
    if (!req) {
        return `<button type="button" class="btn btn-secondary btn-full" style="margin-top:0.5rem;" onclick="openHireModal(${ownerId}, ${worker.id}, '${workerName.replace(/'/g, "\\'")}', ${worker.expected_wage})">Request to hire</button>`;
    } else if (req.status === 'pending') {
        return `<button type="button" class="btn btn-ghost btn-full" style="margin-top:0.5rem; opacity:0.7; pointer-events:none;">Request pending</button>`;
    } else if (req.status === 'accepted') {
        return `<button type="button" class="btn btn-asym btn-full" style="margin-top:0.5rem;" onclick="window.location.href='chat.html?id=${req.id}'"><i class="fa-solid fa-message"></i> Start chat</button>`;
    }
    return `<button type="button" class="btn btn-secondary btn-full" style="margin-top:0.5rem;" onclick="openHireModal(${ownerId}, ${worker.id}, '${workerName.replace(/'/g, "\\'")}', ${worker.expected_wage})">Request to hire</button>`;
}

// ================================
// FILTERS
// ================================
function filterByIndustry(industry) {
    const filterEl = document.getElementById('industryFilter');
    if (filterEl) filterEl.value = industry;
    searchWorkers(true);
}

// ================================
// HIRING REQUEST
// ================================
function openHireModal(providerId, profileId, workerName, suggestedWage) {
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
    document.getElementById('hireProfileId').value = profileId;
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
            // Demo worker, just simulate success
            closeAllModals();
            showToast('Request sent successfully! (Demo mode)', 'success');
            return;
        }

        await apiPost('/hiring/request', {
            provider_id: providerId,
            profile_id: parseInt(document.getElementById('hireProfileId').value) || null,
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
    // Keep all cards and elements naturally visible
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
        searchWorkers(false);
    }
    
    // Only bind on index.html
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', toggleProviderFields);
    }

    // Initialize Address Autocomplete with State & City narrowing for Registration Modal
    if (typeof setupAddressAutocomplete === 'function' && document.getElementById('regState')) {
        setupAddressAutocomplete({
            stateSelectId: 'regState',
            citySelectId: 'regCity',
            customCityInputId: 'regCustomCity',
            addressInputId: 'regAddress',
            dropdownId: 'regAddressDropdown',
            hiddenLocationId: 'regLocation',
            detectBtnId: 'regDetectGpsBtn'
        });
    }
    
    // Show pending toasts after reload
    const pendingToast = sessionStorage.getItem('pendingToast');
    if (pendingToast) {
        showToast(pendingToast, sessionStorage.getItem('pendingToastType') || 'info');
        sessionStorage.removeItem('pendingToast');
        sessionStorage.removeItem('pendingToastType');
    }
});
