const API_BASE = 'http://localhost:8000/api/v1';
const authToken = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user'));

if (!authToken || !currentUser) {
    window.location.href = 'index.html';
}

document.getElementById('dashUserInfo').innerHTML = `<i class="fa-regular fa-circle-user"></i> ${currentUser.full_name || currentUser.email.split('@')[0]}`;

function switchTab(tabId) {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`sec-${tabId}`).classList.add('active');
}

// --------------------------------
// CHATS & REQUESTS
// --------------------------------
async function loadChats() {
    const container = document.getElementById('chatsListContainer');
    try {
        const role = currentUser.role;
        const endpoint = role === 'provider' ? '/hiring/provider/incoming-requests' : '/hiring/customer/my-requests';
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load chats');
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
        } catch (e) {}

        // Update Badge (count pending requests + unread messages)
        const activeRequestsCount = requests.filter(r => r.status === 'pending').length;
        const totalNotifications = activeRequestsCount + unreadCount;
        
        const dashBadge = document.getElementById('dashBadge');
        if (dashBadge) {
            if (totalNotifications > 0) {
                dashBadge.textContent = totalNotifications;
                dashBadge.classList.remove('hidden');
            } else {
                dashBadge.classList.add('hidden');
            }
        }

        if (requests.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light); text-align:center; padding: 2rem;">No chats or requests yet.</p>';
            return;
        }
        
        container.innerHTML = requests.map(req => {
            const customerName = req.customer ? (req.customer.full_name || req.customer.email) : 'Unknown';
            const providerName = req.provider ? (req.provider.full_name || req.provider.email) : 'Unknown';
            const roleDetails = role === 'provider' 
                ? `<strong>Customer:</strong> ${customerName}<br><strong>Date Needed:</strong> ${req.date_needed}` 
                : `<strong>Worker:</strong> ${providerName}<br><strong>Job:</strong> ${req.job_description}`;
            
            let actions = '';
            if (role === 'provider' && req.status === 'pending') {
                actions = `
                    <div class="request-actions" style="display:flex; gap:0.5rem;">
                        <button class="btn btn-primary btn-sm" onclick="updateReqStatus(${req.id}, 'accepted')">Accept</button>
                        <button class="btn btn-secondary btn-sm" onclick="updateReqStatus(${req.id}, 'declined')">Decline</button>
                    </div>
                `;
            } else if (req.status === 'accepted') {
                actions = `
                    <div class="request-actions">
                        <button class="btn btn-primary btn-sm" onclick="window.location.href='chat.html?id=${req.id}'">
                            <i class="fa-solid fa-message"></i> Open Chat
                        </button>
                    </div>
                `;
            } else {
                actions = `<span class="request-status status-${req.status}" style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size:0.8rem; text-transform:uppercase; font-weight:bold; background: #f1f5f9; color: var(--text-light);">${req.status}</span>`;
            }

            return `
                <div class="chat-list-card">
                    <div class="chat-list-details">
                        <h3>Request #${req.id} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-light); margin-left:0.5rem;">${new Date(req.created_at).toLocaleDateString()}</span></h3>
                        <p>${roleDetails}</p>
                        <p><strong>Wage:</strong> ₹${req.proposed_wage}/day</p>
                    </div>
                    ${actions}
                </div>
            `;
        }).join('');
        
    } catch(err) {
        container.innerHTML = `<p style="color: #ef4444;">${err.message}</p>`;
    }
}

async function updateReqStatus(id, status) {
    try {
        const res = await fetch(`${API_BASE}/hiring/provider/requests/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error(await res.text());
        showToast(`Request ${status}!`, 'success');
        loadChats();
    } catch(err) {
        showToast('Error updating status', 'error');
    }
}

// --------------------------------
// PROFILE
// --------------------------------
async function loadProfile() {
    const fields = document.getElementById('profileFormFields');
    try {
        const role = currentUser.role;
        const res = await fetch(`${API_BASE}/profiles/${role}/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        let profile = {};
        if (res.ok) {
            profile = await res.json();
            if (profile.image_url) {
                document.getElementById('pfpPreview').src = profile.image_url;
                document.getElementById('pfpPreview').style.display = 'block';
                document.getElementById('pfpPlaceholder').style.display = 'none';
            }
        }

        if (role === 'customer') {
            fields.innerHTML = `
                <div class="form-group">
                    <label>Company Name (Optional)</label>
                    <input type="text" id="prof_company" value="${profile.company_name || ''}">
                </div>
                <div class="form-group">
                    <label>Contact Phone</label>
                    <input type="text" id="prof_phone" value="${profile.contact_phone || ''}">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="prof_loc" value="${profile.location || ''}">
                </div>
            `;
        } else {
            fields.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Industry</label>
                        <input type="text" id="prof_ind" value="${profile.industry || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Skills</label>
                        <input type="text" id="prof_skills" value="${profile.skills || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Experience (Years)</label>
                        <input type="number" id="prof_exp" value="${profile.experience_years || 0}" required min="0">
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" id="prof_loc" value="${profile.location || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Expected Wage / Day</label>
                        <input type="number" id="prof_wage" value="${profile.expected_wage || 0}" required min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label>Bio (Tell customers about yourself)</label>
                    <textarea id="prof_bio" rows="3" placeholder="I have 5 years of experience in...">${profile.bio || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Availability</label>
                    <select id="prof_avail">
                        <option value="true" ${profile.is_available !== false ? 'selected' : ''}>Available Now</option>
                        <option value="false" ${profile.is_available === false ? 'selected' : ''}>Busy / Unavailable</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Portfolio Images (Up to 5)</label>
                    <div class="portfolio-grid" id="portfolioGrid">
                        <!-- Filled dynamically -->
                    </div>
                    <small style="color:var(--text-light);">Click a slot to upload a photo.</small>
                    <input type="hidden" id="prof_portfolio" value="${profile.portfolio_urls || ''}">
                </div>
            `;
            setTimeout(() => renderPortfolioGrid(profile.portfolio_urls), 0);
        }
    } catch(err) {
        fields.innerHTML = `<p style="color:red;">Error loading profile</p>`;
    }
}

async function updateProfile(e) {
    e.preventDefault();
    const role = currentUser.role;
    let payload = {};
    const pfpImg = document.getElementById('pfpPreview');
    const finalPfpUrl = (pfpImg.style.display !== 'none' && pfpImg.src) ? pfpImg.src : null;
    
    if (role === 'customer') {
        payload = {
            company_name: document.getElementById('prof_company').value || null,
            contact_phone: document.getElementById('prof_phone').value || null,
            location: document.getElementById('prof_loc').value || null,
            image_url: finalPfpUrl
        };
    } else {
        payload = {
            industry: document.getElementById('prof_ind').value,
            skills: document.getElementById('prof_skills').value,
            experience_years: parseInt(document.getElementById('prof_exp').value),
            location: document.getElementById('prof_loc').value,
            expected_wage: parseFloat(document.getElementById('prof_wage').value),
            bio: document.getElementById('prof_bio').value || null,
            is_available: document.getElementById('prof_avail').value === 'true',
            portfolio_urls: document.getElementById('prof_portfolio').value || null,
            image_url: finalPfpUrl
        };
    }
    
    try {
        const res = await fetch(`${API_BASE}/profiles/${role}/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            // Profile might not exist, so POST it instead
            const postRes = await fetch(`${API_BASE}/profiles/${role}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(payload)
            });
            if (!postRes.ok) throw new Error('Failed to create/update profile');
        }
        
        showToast('Profile updated successfully!', 'success');
    } catch(err) {
        showToast(err.message, 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-visible`;
    setTimeout(() => { toast.classList.remove('toast-visible'); }, 3500);
}

// ================================
// UPLOAD LOGIC
// ================================
async function uploadFileToBackend(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
}

async function handlePfpUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const url = await uploadFileToBackend(file);
        document.getElementById('pfpPreview').src = url;
        document.getElementById('pfpPreview').style.display = 'block';
        document.getElementById('pfpPlaceholder').style.display = 'none';
        
        // Auto save profile image
        await updateProfile(new Event('submit'));
    } catch(err) {
        showToast(err.message, 'error');
    }
}

let currentPortfolioUrls = [];

function renderPortfolioGrid(urlsStr) {
    const grid = document.getElementById('portfolioGrid');
    if (!grid) return;
    
    currentPortfolioUrls = urlsStr ? urlsStr.split(',').map(s=>s.trim()).filter(s=>s) : [];
    let html = '';
    
    for(let i = 0; i < 5; i++) {
        if (i < currentPortfolioUrls.length) {
            html += `
                <div class="portfolio-slot">
                    <img src="${currentPortfolioUrls[i]}" alt="Work">
                    <button type="button" class="delete-btn" onclick="removePortfolioImage(${i})"><i class="fa-solid fa-xmark" style="color:white; font-size:12px;"></i></button>
                </div>
            `;
        } else {
            html += `
                <div class="portfolio-slot" onclick="document.getElementById('portfolioInput_${i}').click()">
                    <i class="fa-solid fa-plus"></i>
                    <input type="file" id="portfolioInput_${i}" style="display:none;" accept="image/*" onchange="handlePortfolioUpload(event)">
                </div>
            `;
        }
    }
    grid.innerHTML = html;
    document.getElementById('prof_portfolio').value = currentPortfolioUrls.join(',');
}

async function handlePortfolioUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const url = await uploadFileToBackend(file);
        currentPortfolioUrls.push(url);
        renderPortfolioGrid(currentPortfolioUrls.join(','));
    } catch(err) {
        showToast(err.message, 'error');
    }
}

function removePortfolioImage(index) {
    currentPortfolioUrls.splice(index, 1);
    renderPortfolioGrid(currentPortfolioUrls.join(','));
}

// Init
loadChats();
loadProfile();
