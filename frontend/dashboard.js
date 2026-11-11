const API_BASE = 'http://localhost:8000/api/v1';
const authToken = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user'));

if (!authToken || !currentUser) {
    window.location.href = 'index.html';
}

if (currentUser && document.getElementById('dashUserInfo')) {
    document.getElementById('dashUserInfo').innerHTML = `<i class="fa-regular fa-circle-user"></i> ${currentUser.full_name || currentUser.email.split('@')[0]}`;
}

if (currentUser && currentUser.role === 'admin') {
    const adminBtn = document.getElementById('dashAdminBtn');
    if (adminBtn) adminBtn.style.display = 'inline-flex';
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

function switchTab(tabId) {
    document.querySelectorAll('.dash-tab, .dash-tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dash-section, .dash-section-pane').forEach(s => s.classList.remove('active'));
    
    const tabEl = document.getElementById(`tab-${tabId}`);
    if (tabEl) tabEl.classList.add('active');
    const secEl = document.getElementById(`sec-${tabId}`);
    if (secEl) secEl.classList.add('active');
}

// --------------------------------
// CHATS & REQUESTS
// --------------------------------
async function loadChats() {
    const container = document.getElementById('chatsListContainer');
    try {
        const role = currentUser.role;
        if (role === 'admin') {
            container.innerHTML = `
                <div class="card-chai" style="padding:1.5rem; text-align:center; border-radius:var(--radius-lg);">
                    <p style="color:var(--muted-foreground); margin-bottom:0.75rem;">You are logged in as an administrator. To review labour applications and platform accounts, open the admin portal.</p>
                    <a href="admin.html" class="btn btn-asym" style="display:inline-flex;">Open admin portal</a>
                </div>
            `;
            return;
        }
        const endpoint = (role === 'provider') ? '/hiring/provider/incoming-requests' : '/hiring/customer/my-requests';
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load chats');
        const rct = res.headers.get('content-type') || '';
        if (!rct.includes('application/json')) throw new Error('Server returned invalid response');
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
            container.innerHTML = `
                <div class="card-chai" style="padding: 2.5rem; text-align: center; border-radius: var(--radius-lg);">
                    <i class="fa-regular fa-comments" style="font-size: 2rem; color: var(--muted-foreground); margin-bottom: 0.75rem;"></i>
                    <h3 style="font-size: 1.05rem; margin-bottom: 0.25rem;">No chats or requests yet</h3>
                    <p style="color: var(--muted-foreground); font-size: 0.85rem; max-width: 380px; margin: 0 auto;">
                        ${role === 'provider' 
                            ? 'Incoming job requests from customers will appear here once your profile is live.' 
                            : 'When you find a worker on the marketplace and send a hiring request, you can coordinate and chat here.'}
                    </p>
                    ${role === 'customer' ? '<a href="index.html" class="btn btn-asym btn-sm" style="display:inline-flex; margin-top:1rem;"><i class="fa-solid fa-magnifying-glass"></i> Explore workers</a>' : ''}
                </div>
            `;
            return;
        }
        
        container.innerHTML = requests.map(req => {
            const isLabour = (role === 'provider');
            const customerName = req.customer ? (req.customer.full_name || req.customer.email) : 'Customer';
            const providerName = req.provider ? (req.provider.full_name || req.provider.email) : 'Worker';
            const workerTrade = req.profile ? req.profile.industry : 'Skilled labour';
            const workerLocation = req.profile?.location || '';
            const customerLocation = req.customer_location || '';
            const displayLocation = isLabour ? customerLocation : workerLocation;
            const mapTitle = isLabour ? 'Open customer work location on Google Maps' : 'Open worker location on Google Maps';
            
            let statusBadge = '';
            if (req.status === 'accepted') {
                statusBadge = `<span class="status-tag approved"><i class="fa-solid fa-check"></i> Accepted</span>`;
            } else if (req.status === 'declined') {
                statusBadge = `<span class="status-tag rejected"><i class="fa-solid fa-xmark"></i> Declined</span>`;
            } else {
                statusBadge = `<span class="status-tag pending"><i class="fa-regular fa-clock"></i> Pending review</span>`;
            }

            let actions = '';
            if (isLabour && req.status === 'pending') {
                actions = `
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <button type="button" class="btn btn-asym btn-sm" onclick="updateReqStatus(${req.id}, 'accepted')">
                            <i class="fa-solid fa-check"></i> Accept
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="updateReqStatus(${req.id}, 'declined')">
                            <i class="fa-solid fa-xmark"></i> Decline
                        </button>
                    </div>
                `;
            } else if (req.status === 'accepted') {
                actions = `
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <button type="button" class="btn btn-asym btn-sm" onclick="window.location.href='chat.html?id=${req.id}'">
                            <i class="fa-regular fa-comments"></i> Open chat
                        </button>
                    </div>
                `;
            } else {
                actions = statusBadge;
            }

            // Direct Maps button
            let mapsLinkHtml = '';
            if (displayLocation) {
                mapsLinkHtml = `
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayLocation)}" target="_blank" rel="noopener" class="btn-map-link" title="${mapTitle}">
                        <i class="fa-solid fa-location-dot"></i> Maps
                    </a>
                `;
            }

            return `
                <div class="chat-list-card">
                    <div class="chat-list-details" style="flex:1;">
                        <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                            <h3 style="margin:0;">${isLabour ? customerName : `${providerName} (${workerTrade})`}</h3>
                            ${statusBadge}
                            <span style="font-size:0.75rem; color:var(--muted-foreground); margin-left:auto;">${new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style="margin-bottom:0.35rem;">
                            <strong>${isLabour ? 'Requested job:' : 'Job details:'}</strong> ${req.job_description}
                        </p>
                        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap; font-size:0.84rem; color:var(--muted-foreground); margin-top:0.4rem;">
                            <span><i class="fa-regular fa-calendar"></i> Needed: <strong style="color:var(--foreground);">${req.date_needed}</strong></span>
                            <span><i class="fa-solid fa-indian-rupee-sign"></i> Daily rate: <strong style="color:var(--foreground); font-family:var(--font-display);">₹${req.proposed_wage}</strong></span>
                            ${displayLocation ? `<span><i class="fa-solid fa-location-dot"></i> ${displayLocation}</span>` : ''}
                            ${mapsLinkHtml}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0;">
                        ${actions}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch(err) {
        container.innerHTML = `<p style="color: var(--status-danger); text-align:center; padding:1.5rem;">${err.message}</p>`;
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
        if (role === 'admin') {
            fields.innerHTML = `
                <div class="card-chai" style="padding:1.5rem; text-align:center; border-radius:var(--radius-lg);">
                    <p style="color:var(--muted-foreground); margin-bottom:0.75rem;">Administrator accounts do not require a worker or customer profile.</p>
                    <a href="admin.html" class="btn btn-asym" style="display:inline-flex;">Open admin portal</a>
                </div>
            `;
            return;
        }
        const res = await fetch(`${API_BASE}/profiles/${role}/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        let profile = {};
        if (res.ok) {
            const pct = res.headers.get('content-type') || '';
            if (pct.includes('application/json')) profile = await res.json();
            if (profile.image_url) {
                document.getElementById('pfpPreview').src = formatImageUrl(profile.image_url);
                document.getElementById('pfpPreview').style.display = 'block';
                document.getElementById('pfpPlaceholder').style.display = 'none';
            }
        }

        // Render approval status banner for labour profiles
        const bannerContainer = document.getElementById('profileApprovalBanner');
        if (bannerContainer) {
            if (role === 'provider') {
                const status = (profile.approval_status || 'pending').toLowerCase();
                if (status === 'pending') {
                    bannerContainer.innerHTML = `
                        <div class="approval-alert-banner alert-pending">
                            <div class="alert-icon"><i class="fa-solid fa-clock"></i></div>
                            <div class="alert-content">
                                <h4>Profile under review</h4>
                                <p>Your profile is currently waiting for admin approval. Once approved, you will appear on the homepage directory. You can update your details anytime below.</p>
                            </div>
                            <span class="status-tag pending"><i class="fa-solid fa-clock"></i> Pending review</span>
                        </div>
                    `;
                } else if (status === 'rejected') {
                    bannerContainer.innerHTML = `
                        <div class="approval-alert-banner alert-rejected">
                            <div class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                            <div class="alert-content">
                                <h4>Action required: Profile revision needed</h4>
                                <p>The administrator reviewed your documents and provided this feedback:</p>
                                <div class="rejection-reason-box">"${profile.rejection_reason || 'Please upload clear identity documents.'}"</div>
                                <p style="margin-top:0.4rem; font-size:0.82rem;">Update your details below and re-submit for review.</p>
                            </div>
                            <span class="status-tag rejected"><i class="fa-solid fa-xmark"></i> Revisions needed</span>
                        </div>
                    `;
                } else if (status === 'approved') {
                    bannerContainer.innerHTML = `
                        <div class="approval-alert-banner alert-approved">
                            <div class="alert-icon"><i class="fa-solid fa-circle-check"></i></div>
                            <div class="alert-content">
                                <h4>Profile approved & live</h4>
                                <p>Your account is verified. You are visible to all customers on the LabourGram public marketplace.</p>
                            </div>
                            <span class="status-tag approved"><i class="fa-solid fa-check"></i> Approved</span>
                        </div>
                    `;
                }
            } else if (role === 'customer') {
                bannerContainer.innerHTML = `
                    <div class="approval-alert-banner alert-approved">
                        <div class="alert-icon"><i class="fa-solid fa-circle-check"></i></div>
                        <div class="alert-content">
                            <h4>Customer profile active</h4>
                            <p>Your site location and contact details help workers calculate distance and coordinate timely arrival.</p>
                        </div>
                        <span class="status-tag approved"><i class="fa-solid fa-user-check"></i> Customer</span>
                    </div>
                `;
            } else {
                bannerContainer.innerHTML = '';
            }
        }

        if (role === 'customer') {
            fields.innerHTML = `
                <div class="form-group">
                    <label for="prof_company">Full name or company name</label>
                    <input type="text" id="prof_company" value="${profile.company_name || currentUser.full_name || ''}" placeholder="e.g. Suresh Kumar" autocomplete="name">
                </div>
                <div class="form-group">
                    <label for="prof_phone">Contact phone number</label>
                    <input type="tel" id="prof_phone" value="${profile.contact_phone || ''}" placeholder="e.g. +91 9876543210" autocomplete="tel">
                </div>
                <div class="form-group">
                    <label>Primary site location</label>
                    <div class="location-picker-group">
                        <div class="state-city-row">
                            <div>
                                <label class="sub-label" for="profState">State</label>
                                <select id="profState"></select>
                            </div>
                            <div>
                                <label class="sub-label" for="profCity">City</label>
                                <select id="profCity"></select>
                                <input type="text" id="profCustomCity" placeholder="Enter city name" style="display:none; margin-top:0.4rem;">
                            </div>
                        </div>
                        <div class="address-autocomplete-wrapper">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                                <label class="sub-label" for="profAddress">Area or street address</label>
                                <button type="button" class="btn-detect-gps" id="profDetectGpsBtn">
                                    <i class="fa-solid fa-location-crosshairs"></i> Auto-detect GPS
                                </button>
                            </div>
                            <div class="input-with-icon">
                                <i class="fa-solid fa-location-dot input-icon"></i>
                                <input type="text" id="profAddress" placeholder="e.g. Ram Nagar, College Road..." autocomplete="off">
                            </div>
                            <div class="address-dropdown" id="profAddressDropdown"></div>
                            <input type="hidden" id="prof_loc" value="${profile.location || ''}">
                        </div>
                    </div>
                </div>
            `;
            const submitBtn = document.getElementById('profSubmitBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save profile changes';
            }
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
                        <label>Expected Wage / Day (₹)</label>
                        <input type="number" id="prof_wage" value="${profile.expected_wage || 0}" required min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <div class="location-picker-group">
                        <div class="state-city-row">
                            <div>
                                <label class="sub-label">State</label>
                                <select id="profState"></select>
                            </div>
                            <div>
                                <label class="sub-label">City</label>
                                <select id="profCity"></select>
                                <input type="text" id="profCustomCity" placeholder="Enter city name" style="display:none; margin-top:0.4rem;">
                            </div>
                        </div>
                        <div class="address-autocomplete-wrapper">
                            <label class="sub-label" style="display:flex; justify-content:space-between; align-items:center;">
                                <span>Area / Street Address</span>
                                <button type="button" class="btn-detect-gps" id="profDetectGpsBtn">
                                    <i class="fa-solid fa-location-crosshairs"></i> Auto-Detect
                                </button>
                            </label>
                            <div class="input-with-icon">
                                <i class="fa-solid fa-location-dot input-icon"></i>
                                <input type="text" id="profAddress" placeholder="e.g. Ram Nagar, College Road..." autocomplete="off">
                            </div>
                            <div class="address-dropdown" id="profAddressDropdown"></div>
                            <input type="hidden" id="prof_loc" value="${profile.location || ''}">
                        </div>
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

                <!-- Compulsory Identity Verification Documents -->
                <div class="card-chai" style="padding:1.25rem; margin-top:1.25rem; border-radius:var(--radius-lg);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; flex-wrap:wrap; gap:0.4rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <i class="fa-solid fa-shield-halved" style="color:var(--brand); font-size:1rem;"></i>
                            <strong style="font-size:0.9rem;">Compulsory identity documents</strong>
                        </div>
                        <span style="font-size:0.75rem; color:var(--muted-foreground);"><i class="fa-solid fa-magnifying-glass-plus"></i> Click photo to zoom</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--muted-foreground); margin-bottom:0.85rem; line-height:1.4;">
                        Your Aadhaar card and PAN card are verified by administrators before your account appears on the marketplace.
                    </p>

                    <div class="kyc-docs-grid">
                        <!-- Aadhaar Card Box -->
                        <div class="kyc-doc-card">
                            <div class="kyc-doc-header">
                                <span><i class="fa-solid fa-id-card"></i> Aadhaar card</span>
                                <span class="status-tag ${profile.aadhaar_card_url ? 'approved' : 'rejected'}" style="font-size:0.68rem; padding:0.1rem 0.4rem;">
                                    ${profile.aadhaar_card_url ? 'Uploaded' : 'Missing'}
                                </span>
                            </div>
                            <div class="kyc-doc-preview-wrapper" onclick="${profile.aadhaar_card_url ? `openLightbox('${formatImageUrl(profile.aadhaar_card_url)}')` : `document.getElementById('profAadhaarInput').click()`}" title="${profile.aadhaar_card_url ? 'Click to inspect full size' : 'Click to select photo'}">
                                ${profile.aadhaar_card_url ? `
                                    <img id="profAadhaarPreview" src="${formatImageUrl(profile.aadhaar_card_url)}" alt="Aadhaar card" onerror="this.onerror=null; this.src='https://placehold.co/300x180?text=Aadhaar+Error';">
                                    <div class="kyc-doc-empty" id="profAadhaarPlaceholder" style="display:none;"></div>
                                ` : `
                                    <div class="kyc-doc-empty" id="profAadhaarPlaceholder">
                                        <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.5rem; color:var(--muted-foreground);"></i>
                                        <span>Click to upload Aadhaar</span>
                                    </div>
                                    <img id="profAadhaarPreview" src="" style="display:none;" alt="Aadhaar card">
                                `}
                            </div>
                            <input type="file" id="profAadhaarInput" style="display:none;" accept="image/png, image/jpeg, image/webp" onchange="previewDocFile(event, 'profAadhaarPreview', 'profAadhaarPlaceholder')">
                            <input type="hidden" id="profAadhaarUrl" value="${profile.aadhaar_card_url || ''}">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('profAadhaarInput').click()">
                                <i class="fa-solid fa-arrow-up-from-bracket"></i> ${profile.aadhaar_card_url ? 'Replace photo' : 'Upload photo'}
                            </button>
                        </div>

                        <!-- PAN Card Box -->
                        <div class="kyc-doc-card">
                            <div class="kyc-doc-header">
                                <span><i class="fa-solid fa-address-card"></i> PAN card</span>
                                <span class="status-tag ${profile.pan_card_url ? 'approved' : 'rejected'}" style="font-size:0.68rem; padding:0.1rem 0.4rem;">
                                    ${profile.pan_card_url ? 'Uploaded' : 'Missing'}
                                </span>
                            </div>
                            <div class="kyc-doc-preview-wrapper" onclick="${profile.pan_card_url ? `openLightbox('${formatImageUrl(profile.pan_card_url)}')` : `document.getElementById('profPanInput').click()`}" title="${profile.pan_card_url ? 'Click to inspect full size' : 'Click to select photo'}">
                                ${profile.pan_card_url ? `
                                    <img id="profPanPreview" src="${formatImageUrl(profile.pan_card_url)}" alt="PAN card" onerror="this.onerror=null; this.src='https://placehold.co/300x180?text=PAN+Error';">
                                    <div class="kyc-doc-empty" id="profPanPlaceholder" style="display:none;"></div>
                                ` : `
                                    <div class="kyc-doc-empty" id="profPanPlaceholder">
                                        <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.5rem; color:var(--muted-foreground);"></i>
                                        <span>Click to upload PAN card</span>
                                    </div>
                                    <img id="profPanPreview" src="" style="display:none;" alt="PAN card">
                                `}
                            </div>
                            <input type="file" id="profPanInput" style="display:none;" accept="image/png, image/jpeg, image/webp" onchange="previewDocFile(event, 'profPanPreview', 'profPanPlaceholder')">
                            <input type="hidden" id="profPanUrl" value="${profile.pan_card_url || ''}">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('profPanInput').click()">
                                <i class="fa-solid fa-arrow-up-from-bracket"></i> ${profile.pan_card_url ? 'Replace photo' : 'Upload photo'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => renderPortfolioGrid(profile.portfolio_urls), 0);

            // Adapt submit button according to approval status
            const submitBtn = document.getElementById('profSubmitBtn');
            if (submitBtn) {
                const st = (profile.approval_status || 'pending').toLowerCase();
                if (st === 'rejected') {
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Update & re-apply for approval';
                } else if (st === 'pending') {
                    submitBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Save details (under review)';
                } else {
                    submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save profile changes';
                }
            }
        }

        // Initialize address autocomplete for dashboard profile
        if (typeof setupAddressAutocomplete === 'function') {
            setupAddressAutocomplete({
                stateSelectId: 'profState',
                citySelectId: 'profCity',
                customCityInputId: 'profCustomCity',
                addressInputId: 'profAddress',
                dropdownId: 'profAddressDropdown',
                hiddenLocationId: 'prof_loc',
                detectBtnId: 'profDetectGpsBtn',
                initialLocation: profile.location || ''
            });
        }
    } catch(err) {
        fields.innerHTML = `<p style="color:red;">Error loading profile: ${err.message}</p>`;
    }
}

function previewDocFile(event, previewId, placeholderId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const previewImg = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);
    const reader = new FileReader();
    reader.onload = (e) => {
        if (previewImg) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            previewImg.onclick = () => openLightbox(e.target.result);
        }
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

function openLightbox(url) {
    if (!url) return;
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImg');
    if (modal && img) {
        img.src = url;
        modal.classList.add('active');
    }
}

function closeLightbox() {
    const modal = document.getElementById('lightboxModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function updateProfile(e) {
    e.preventDefault();
    const role = currentUser.role;
    const submitBtn = document.getElementById('profSubmitBtn') || e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Update Profile';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving changes...';
    }

    try {
        let payload = {};
        const pfpImg = document.getElementById('pfpPreview');
        const finalPfpUrl = (pfpImg && pfpImg.style.display !== 'none' && pfpImg.src) ? pfpImg.src : null;
        
        if (role === 'customer') {
            payload = {
                company_name: document.getElementById('prof_company').value || null,
                contact_phone: document.getElementById('prof_phone').value || null,
                location: document.getElementById('prof_loc').value || null,
                image_url: finalPfpUrl
            };
        } else {
            const expVal = parseInt(document.getElementById('prof_exp').value);
            const wageVal = parseFloat(document.getElementById('prof_wage').value);
            
            // Upload new Aadhaar Card if selected
            let aadhaarUrl = document.getElementById('profAadhaarUrl')?.value || null;
            const aadhaarInput = document.getElementById('profAadhaarInput');
            if (aadhaarInput && aadhaarInput.files && aadhaarInput.files[0]) {
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading Aadhaar Card...';
                aadhaarUrl = await uploadFileToBackend(aadhaarInput.files[0]);
            }

            // Upload new PAN Card if selected
            let panUrl = document.getElementById('profPanUrl')?.value || null;
            const panInput = document.getElementById('profPanInput');
            if (panInput && panInput.files && panInput.files[0]) {
                if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading PAN Card...';
                panUrl = await uploadFileToBackend(panInput.files[0]);
            }

            payload = {
                industry: document.getElementById('prof_ind').value || 'General',
                skills: document.getElementById('prof_skills').value || 'General Labour',
                experience_years: isNaN(expVal) ? 0 : Math.max(0, expVal),
                location: document.getElementById('prof_loc').value || 'India',
                expected_wage: (isNaN(wageVal) || wageVal <= 0) ? 500 : wageVal,
                bio: document.getElementById('prof_bio').value || null,
                is_available: document.getElementById('prof_avail').value === 'true',
                portfolio_urls: document.getElementById('prof_portfolio').value || null,
                aadhaar_card_url: aadhaarUrl,
                pan_card_url: panUrl,
                image_url: finalPfpUrl
            };
        }
        
        if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating profile...';

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
        
        showToast('Profile updated successfully! If re-applied, admin will review soon.', 'success');
        await loadProfile();
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
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
    if (!res.ok) {
        let errMsg = 'Upload failed';
        try {
            const errData = await res.json();
            errMsg = errData.detail || errMsg;
        } catch(e) {}
        throw new Error(errMsg);
    }
    const data = await res.json();
    return formatImageUrl(data.url);
}

async function handlePfpUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        showToast('Uploading profile picture...', 'info');
        const url = await uploadFileToBackend(file);
        document.getElementById('pfpPreview').src = formatImageUrl(url);
        document.getElementById('pfpPreview').style.display = 'block';
        document.getElementById('pfpPlaceholder').style.display = 'none';
        
        // Auto save profile image
        await updateProfile(new Event('submit'));
        showToast('Profile picture updated!', 'success');
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
            const imgUrl = formatImageUrl(currentPortfolioUrls[i]);
            html += `
                <div class="portfolio-slot">
                    <img src="${imgUrl}" alt="Work" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=300';">
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
        showToast('Uploading portfolio photo...', 'info');
        const url = await uploadFileToBackend(file);
        currentPortfolioUrls.push(url);
        renderPortfolioGrid(currentPortfolioUrls.join(','));
        // Automatically save profile so uploaded portfolio is immediately saved
        await updateProfile(new Event('submit'));
        showToast('Portfolio photo uploaded & saved!', 'success');
    } catch(err) {
        showToast(err.message, 'error');
    }
}

async function removePortfolioImage(index) {
    currentPortfolioUrls.splice(index, 1);
    renderPortfolioGrid(currentPortfolioUrls.join(','));
    await updateProfile(new Event('submit'));
    showToast('Photo removed.', 'info');
}

// Init
loadChats();
loadProfile();


