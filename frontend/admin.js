const API_BASE = 'http://localhost:8000/api/v1';
const authToken = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user'));

// Route Guard: Ensure user is logged in as an admin
if (!authToken || !currentUser || currentUser.role !== 'admin') {
    sessionStorage.setItem('pendingToast', 'Access Denied: Admin authorization required.');
    sessionStorage.setItem('pendingToastType', 'error');
    window.location.href = 'index.html';
}

if (currentUser && document.getElementById('adminNameDisplay')) {
    document.getElementById('adminNameDisplay').textContent = currentUser.full_name || currentUser.email;
}

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

// Global cached state
let allLaboursData = [];
let allCustomersData = [];

// Tab switching
function switchAdminTab(tabKey) {
    document.querySelectorAll('.segmented-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });

    const activeTab = document.getElementById(`tabBtn${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
    if (activeTab) activeTab.classList.add('active');

    const targetSec = document.getElementById(`sec-${tabKey}`);
    if (targetSec) {
        targetSec.classList.add('active');
        targetSec.style.display = 'block';
    }
}

// Data fetching
async function loadAdminData() {
    try {
        await Promise.all([
            fetchStats(),
            fetchLabours(),
            fetchCustomers()
        ]);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load platform stats');
        const stats = await res.json();

        document.getElementById('statPendingCount').textContent = stats.pending_labours;
        document.getElementById('statApprovedCount').textContent = stats.approved_labours;
        document.getElementById('statCustomerCount').textContent = stats.total_customers;
        document.getElementById('statTotalUsers').textContent = stats.total_users;
        document.getElementById('statTotalLaboursSub').textContent = `${stats.total_labours} total registered workers`;

        document.getElementById('tabCounterPending').textContent = stats.pending_labours;
        document.getElementById('tabCounterLabours').textContent = stats.total_labours;
        document.getElementById('tabCounterCustomers').textContent = stats.total_customers;
    } catch (err) {
        console.error('Stats error:', err);
    }
}

async function fetchLabours() {
    const pendingContainer = document.getElementById('pendingLaboursList');
    pendingContainer.innerHTML = '<p style="color:#94a3b8; text-align:center; grid-column: 1/-1; padding: 2rem;">Loading labours data...</p>';

    try {
        const res = await fetch(`${API_BASE}/admin/labours`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load labours');
        const labours = await res.json();
        allLaboursData = labours;

        renderPendingLabours(labours.filter(l => (l.approval_status || 'pending').toLowerCase() === 'pending'));
        renderAllLaboursTable(labours);
    } catch (err) {
        pendingContainer.innerHTML = `<p style="color:#ef4444; grid-column: 1/-1; text-align:center;">Error: ${err.message}</p>`;
    }
}

function renderPendingLabours(pendingLabours) {
    const container = document.getElementById('pendingLaboursList');
    if (!container) return;

    if (pendingLabours.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-circle-check" style="color:#10b981;"></i>
                <h3>All Caught Up!</h3>
                <p>There are no labour profiles awaiting approval right now. New submissions will appear here automatically.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingLabours.map(labour => {
        const pfpUrl = labour.image_url ? formatImageUrl(labour.image_url) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';
        
        let portfolioHtml = '<span class="no-portfolio-text">No portfolio photos uploaded</span>';
        if (labour.portfolio_urls) {
            const urls = labour.portfolio_urls.split(',').map(u => u.trim()).filter(Boolean);
            if (urls.length > 0) {
                portfolioHtml = `
                    <div class="admin-portfolio-strip">
                        ${urls.map(u => {
                            const full = formatImageUrl(u);
                            return `<img src="${full}" class="admin-portfolio-thumb" onclick="openLightbox('${full}')" title="Click to view full image" onerror="this.style.display='none'">`;
                        }).join('')}
                    </div>
                `;
            }
        }

        const mapsQuery = encodeURIComponent(labour.location || 'India');
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

        return `
            <div class="card-chai labour-review-card" id="labourCard_${labour.id}">
                <div class="labour-card-top">
                    <img src="${pfpUrl}" class="labour-avatar" alt="${labour.full_name}" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'">
                    <div class="labour-info" style="flex:1; min-width:0;">
                        <h3>${labour.full_name}</h3>
                        <p class="labour-email"><i class="fa-regular fa-envelope"></i> ${labour.email}</p>
                        <span class="status-tag pending"><i class="fa-solid fa-clock"></i> Pending review</span>
                    </div>
                </div>

                <div class="labour-details-table">
                    <div class="detail-item">
                        <div class="label">Trade</div>
                        <div class="value">${labour.industry}</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Skills</div>
                        <div class="value" title="${labour.skills}">${labour.skills}</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Daily rate</div>
                        <div class="value">₹${labour.expected_wage}</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Experience</div>
                        <div class="value">${labour.experience_years} yrs</div>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <div class="label">Location</div>
                        <div class="value" style="font-size:0.82rem;">
                            <i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>
                            ${labour.location}
                            <a href="${mapsLink}" target="_blank" style="margin-left:6px; color:var(--brand); text-decoration:none; font-size:0.75rem;">
                                [Maps <i class="fa-solid fa-arrow-up-right-from-square"></i>]
                            </a>
                        </div>
                    </div>
                </div>

                ${labour.bio ? `<div style="font-size:0.82rem; color:var(--muted-foreground);"><strong>Bio:</strong> ${labour.bio}</div>` : ''}

                <!-- Compulsory Verification Documents -->
                ${(() => {
                    const aadhaarFull = labour.aadhaar_card_url ? formatImageUrl(labour.aadhaar_card_url) : null;
                    const panFull = labour.pan_card_url ? formatImageUrl(labour.pan_card_url) : null;
                    return `
                        <div class="admin-docs-container">
                            <div class="admin-docs-title">
                                <i class="fa-solid fa-shield-halved"></i>
                                <span>Compulsory verification documents</span>
                            </div>
                            <div class="admin-docs-grid">
                                <div class="admin-doc-card" ${aadhaarFull ? `onclick="openLightbox('${aadhaarFull}')"` : ''} title="${aadhaarFull ? 'Click to inspect Aadhaar Card full size' : 'Not uploaded'}">
                                    <div class="admin-doc-header">
                                        <span><i class="fa-solid fa-id-card"></i> Aadhaar card</span>
                                        <span class="status-tag ${aadhaarFull ? 'approved' : 'rejected'}" style="font-size:0.65rem; padding:0.1rem 0.35rem;">${aadhaarFull ? 'Uploaded' : 'Missing'}</span>
                                    </div>
                                    ${aadhaarFull ? `
                                        <img src="${aadhaarFull}" class="admin-doc-thumb" alt="Aadhaar Card" onerror="this.onerror=null; this.src='https://placehold.co/300x180?text=Aadhaar+Error';">
                                    ` : `
                                        <div class="admin-doc-missing">
                                            <i class="fa-solid fa-circle-exclamation"></i>
                                            <span>No Aadhaar</span>
                                        </div>
                                    `}
                                </div>

                                <div class="admin-doc-card" ${panFull ? `onclick="openLightbox('${panFull}')"` : ''} title="${panFull ? 'Click to inspect PAN Card full size' : 'Not uploaded'}">
                                    <div class="admin-doc-header">
                                        <span><i class="fa-solid fa-address-card"></i> PAN card</span>
                                        <span class="status-tag ${panFull ? 'approved' : 'rejected'}" style="font-size:0.65rem; padding:0.1rem 0.35rem;">${panFull ? 'Uploaded' : 'Missing'}</span>
                                    </div>
                                    ${panFull ? `
                                        <img src="${panFull}" class="admin-doc-thumb" alt="PAN Card" onerror="this.onerror=null; this.src='https://placehold.co/300x180?text=PAN+Error';">
                                    ` : `
                                        <div class="admin-doc-missing">
                                            <i class="fa-solid fa-circle-exclamation"></i>
                                            <span>No PAN card</span>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                })()}

                <div>
                    <div style="font-size:0.75rem; font-weight:600; color:var(--muted-foreground); margin-bottom:0.35rem; display:flex; justify-content:space-between;">
                        <span>Portfolio photos</span>
                        <small style="opacity:0.8;">(Click photo to zoom)</small>
                    </div>
                    ${portfolioHtml}
                </div>

                <div class="labour-card-actions">
                    <button type="button" class="btn-approve" onclick="approveLabour(${labour.id})">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                    <button type="button" class="btn-reject" onclick="openRejectionModal(${labour.id}, '${labour.full_name.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-xmark"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAllLaboursTable(labours) {
    const tbody = document.getElementById('allLaboursTableBody');
    if (!tbody) return;

    if (labours.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--muted-foreground);">No workers registered yet.</td></tr>';
        return;
    }

    tbody.innerHTML = labours.map(l => {
        const pfpUrl = l.image_url ? formatImageUrl(l.image_url) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200';
        const st = (l.approval_status || 'pending').toLowerCase();
        let statusBadge = `<span class="status-tag pending"><i class="fa-solid fa-clock"></i> Pending</span>`;
        if (st === 'approved') statusBadge = `<span class="status-tag approved"><i class="fa-solid fa-check"></i> Approved</span>`;
        if (st === 'rejected') statusBadge = `<span class="status-tag rejected"><i class="fa-solid fa-xmark"></i> Rejected</span>`;

        const photoCount = l.portfolio_urls ? l.portfolio_urls.split(',').filter(Boolean).length : 0;
        const aadhaarUrl = l.aadhaar_card_url ? formatImageUrl(l.aadhaar_card_url) : null;
        const panUrl = l.pan_card_url ? formatImageUrl(l.pan_card_url) : null;

        const kycDocsHtml = `
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${aadhaarUrl ? `
                    <button type="button" class="doc-badge-table" onclick="openLightbox('${aadhaarUrl}')" title="Inspect Aadhaar card">
                        <i class="fa-solid fa-id-card"></i> Aadhaar [View]
                    </button>
                ` : `
                    <span class="doc-badge-table missing"><i class="fa-solid fa-xmark"></i> No Aadhaar</span>
                `}
                ${panUrl ? `
                    <button type="button" class="doc-badge-table" onclick="openLightbox('${panUrl}')" title="Inspect PAN card">
                        <i class="fa-solid fa-address-card"></i> PAN [View]
                    </button>
                ` : `
                    <span class="doc-badge-table missing"><i class="fa-solid fa-xmark"></i> No PAN</span>
                `}
            </div>
        `;

        let actions = '';
        if (st === 'approved') {
            actions = `
                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--status-danger);" onclick="openRejectionModal(${l.id}, '${l.full_name.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-ban"></i> Revoke
                </button>
            `;
        } else {
            actions = `
                <button type="button" class="btn btn-ghost btn-sm" style="color:var(--status-success);" onclick="approveLabour(${l.id})">
                    <i class="fa-solid fa-check"></i> Approve
                </button>
            `;
        }

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <img src="${pfpUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--border);" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200'">
                        <div>
                            <div style="font-weight:600; color:var(--foreground);">${l.full_name}</div>
                            <div style="font-size:0.75rem; color:var(--muted-foreground);">${l.email}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <strong style="color:var(--foreground);">${l.industry}</strong><br>
                    <small style="color:var(--muted-foreground);">${l.skills}</small>
                </td>
                <td>
                    <small style="color:var(--muted-foreground);"><i class="fa-solid fa-location-dot"></i> ${l.location}</small>
                </td>
                <td>
                    <strong>₹${l.expected_wage}</strong>/day<br>
                    <small style="color:var(--muted-foreground);">${l.experience_years} yrs exp</small>
                </td>
                <td>${statusBadge}</td>
                <td>${kycDocsHtml}</td>
                <td>
                    ${photoCount > 0 ? `<span style="color:var(--brand); font-weight:600;"><i class="fa-regular fa-images"></i> ${photoCount} photos</span>` : '<span style="color:var(--muted-foreground);">None</span>'}
                </td>
                <td style="text-align:right;">${actions}</td>
            </tr>
        `;
    }).join('');
}

function filterLabourDirectory() {
    const searchVal = document.getElementById('labourSearchInput').value.toLowerCase().trim();
    const statusVal = document.getElementById('labourStatusFilter').value.toLowerCase();

    const filtered = allLaboursData.filter(l => {
        const matchesStatus = statusVal === 'all' || (l.approval_status || 'pending').toLowerCase() === statusVal;
        const matchesSearch = !searchVal || 
            l.full_name.toLowerCase().includes(searchVal) ||
            l.industry.toLowerCase().includes(searchVal) ||
            l.skills.toLowerCase().includes(searchVal) ||
            l.location.toLowerCase().includes(searchVal) ||
            l.email.toLowerCase().includes(searchVal);
        return matchesStatus && matchesSearch;
    });

    renderAllLaboursTable(filtered);
}

// Customers fetching & display
async function fetchCustomers() {
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">Loading customers...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/admin/customers`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load customers');
        const customers = await res.json();
        allCustomersData = customers;
        renderCustomersTable(customers);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444; text-align:center;">Error: ${err.message}</td></tr>`;
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#64748b;">No customers registered yet.</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => {
        const userActive = c.is_active;
        const statusPill = userActive 
            ? `<span class="status-tag approved"><i class="fa-solid fa-circle-check"></i> Active</span>`
            : `<span class="status-tag rejected"><i class="fa-solid fa-ban"></i> Suspended</span>`;

        const toggleBtnText = userActive ? 'Suspend' : 'Activate';
        const toggleColor = userActive ? '#f87171' : '#34d399';

        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:0.75rem;">
                        <div style="width:36px; height:36px; border-radius:50%; background:var(--muted); border:1px solid var(--border); color:var(--foreground); display:flex; align-items:center; justify-content:center; font-weight:700;">
                            ${(c.full_name || 'C')[0].toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:600; color:var(--foreground);">${c.full_name}</div>
                            <div style="font-size:0.75rem; color:var(--muted-foreground);">${c.email}</div>
                        </div>
                    </div>
                </td>
                <td>${c.company_name || '<span style="color:var(--muted-foreground);">Individual</span>'}</td>
                <td>${c.contact_phone || '<span style="color:var(--muted-foreground);">Not provided</span>'}</td>
                <td>${c.location ? `<small style="color:var(--muted-foreground);"><i class="fa-solid fa-location-dot"></i> ${c.location}</small>` : '<span style="color:var(--muted-foreground);">Not specified</span>'}</td>
                <td>${statusPill}</td>
                <td style="text-align:right;">
                    <button type="button" class="btn btn-ghost btn-sm" style="color:${toggleColor};" onclick="toggleUserStatus(${c.id})">
                        ${toggleBtnText}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterCustomerDirectory() {
    const searchVal = document.getElementById('customerSearchInput').value.toLowerCase().trim();
    const filtered = allCustomersData.filter(c => {
        if (!searchVal) return true;
        return c.full_name.toLowerCase().includes(searchVal) ||
               c.email.toLowerCase().includes(searchVal) ||
               (c.company_name && c.company_name.toLowerCase().includes(searchVal)) ||
               (c.location && c.location.toLowerCase().includes(searchVal));
    });
    renderCustomersTable(filtered);
}

// User active toggle
async function toggleUserStatus(userId) {
    try {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to update user status');
        }
        const data = await res.json();
        showToast(data.message, 'success');
        fetchCustomers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Approval action
async function approveLabour(profileId) {
    try {
        const res = await fetch(`${API_BASE}/admin/labours/${profileId}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to approve profile');
        }
        const data = await res.json();
        showToast(data.message, 'success');

        // Refresh stats and lists
        loadAdminData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Rejection Modal
function openRejectionModal(profileId, labourName) {
    document.getElementById('rejectProfileId').value = profileId;
    document.getElementById('rejectionReasonInput').value = '';
    document.getElementById('rejectionModal').classList.add('active');
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').classList.remove('active');
    document.getElementById('rejectionReasonInput').value = '';
    document.getElementById('rejectProfileId').value = '';
}

function setPresetReason(text) {
    document.getElementById('rejectionReasonInput').value = text;
}

async function submitRejection() {
    const profileId = document.getElementById('rejectProfileId').value;
    const reason = document.getElementById('rejectionReasonInput').value.trim();

    if (!reason) {
        showToast('Please provide a reason for rejection.', 'warning');
        return;
    }

    const btn = document.getElementById('confirmRejectBtn');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/admin/labours/${profileId}/reject`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ rejection_reason: reason })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to reject profile');
        }

        const data = await res.json();
        showToast('Profile rejected and feedback recorded.', 'info');
        closeRejectionModal();
        loadAdminData();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = 'Confirm Rejection';
        btn.disabled = false;
    }
}

// Lightbox for full size photo review
function openLightbox(url) {
    document.getElementById('lightboxImage').src = url;
    document.getElementById('lightboxModal').classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightboxModal').classList.remove('active');
    document.getElementById('lightboxImage').src = '';
}

// Toast helper
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-visible`;
    setTimeout(() => { toast.classList.remove('toast-visible'); }, 3500);
}

// Logout
function logoutAdmin() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    sessionStorage.setItem('pendingToast', 'Admin signed out successfully.');
    sessionStorage.setItem('pendingToastType', 'info');
    window.location.href = 'index.html';
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    // Show pending toast if set
    const pendingToast = sessionStorage.getItem('pendingToast');
    if (pendingToast) {
        const type = sessionStorage.getItem('pendingToastType') || 'info';
        showToast(pendingToast, type);
        sessionStorage.removeItem('pendingToast');
        sessionStorage.removeItem('pendingToastType');
    }

    loadAdminData();
});
