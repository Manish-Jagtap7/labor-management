const API_BASE = 'http://localhost:8000/api/v1';
const authToken = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user'));

if (!authToken || !currentUser) {
    window.location.href = 'index.html';
}

const urlParams = new URLSearchParams(window.location.search);
const requestId = urlParams.get('id');

if (!requestId) {
    window.location.href = 'index.html';
}

let chatSocket = null;
const msgContainer = document.getElementById('chatMessages');

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

async function loadChatRequestDetails() {
    try {
        const role = currentUser.role;
        const endpoint = (role === 'provider') ? '/hiring/provider/incoming-requests' : '/hiring/customer/my-requests';
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) return;
        const requests = await res.json();
        const req = requests.find(r => r.id === parseInt(requestId));
        if (!req) return;

        const isLabour = (role === 'provider');
        const otherPartyName = isLabour
            ? (req.customer ? (req.customer.full_name || req.customer.email) : 'Customer')
            : (req.provider ? (req.provider.full_name || req.provider.email) : 'Skilled worker');

        const otherPartyRole = isLabour
            ? 'Customer'
            : (req.profile ? req.profile.industry : 'Skilled trade');

        // Update name and subtitle
        const nameEl = document.getElementById('chatParticipantName');
        const roleEl = document.getElementById('chatParticipantRole');
        if (nameEl) nameEl.textContent = otherPartyName;
        if (roleEl) roleEl.textContent = isLabour ? `Customer • Request #${req.id}` : `${otherPartyRole} • ₹${req.proposed_wage}/day`;

        // Participant avatar
        const avatarEl = document.getElementById('chatParticipantAvatar');
        if (avatarEl) {
            if (!isLabour && req.profile && req.profile.image_url) {
                avatarEl.innerHTML = `<img src="${formatImageUrl(req.profile.image_url)}" alt="${otherPartyName}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                const initial = otherPartyName.charAt(0).toUpperCase();
                avatarEl.innerHTML = `<span style="font-weight:700; font-size:0.95rem;">${initial}</span>`;
            }
        }

        // Location & Maps link
        const targetLocation = isLabour ? (req.customer_location || '') : (req.profile?.location || '');
        const locBtn = document.getElementById('chatLocationBtn');
        if (locBtn) {
            if (targetLocation) {
                locBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetLocation)}`;
                locBtn.title = isLabour ? 'Open customer work location on Google Maps' : 'Open worker location on Google Maps';
                locBtn.style.display = 'inline-flex';
            } else {
                locBtn.style.display = 'none';
            }
        }

        // Pinned job banner
        const bannerEl = document.getElementById('chatJobBanner');
        if (bannerEl) {
            bannerEl.innerHTML = `
                <div class="chat-job-banner-inner">
                    <span class="chat-job-meta"><strong>Job:</strong> ${req.job_description}</span>
                    <span class="chat-job-meta"><strong>Date needed:</strong> ${req.date_needed}</span>
                    <span class="chat-job-meta"><strong>Rate:</strong> ₹${req.proposed_wage}/day</span>
                    ${targetLocation ? `<span class="chat-job-meta"><i class="fa-solid fa-location-dot"></i> ${targetLocation}</span>` : ''}
                    <span class="status-tag approved" style="margin-left:auto;"><i class="fa-solid fa-check"></i> ${req.status}</span>
                </div>
            `;
            bannerEl.style.display = 'block';
        }
    } catch (e) {
        console.warn('Could not load chat details:', e);
    }
}

async function initChat() {
    try {
        await loadChatRequestDetails();

        // Fetch history
        const res = await fetch(`${API_BASE}/chat/history/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load chat history');
        const chatCt = res.headers.get('content-type') || '';
        if (!chatCt.includes('application/json')) throw new Error('Server returned invalid response');
        const history = await res.json();
        
        // Mark as read
        try {
            await fetch(`${API_BASE}/chat/history/${requestId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        } catch(e) { console.error('Failed to mark read', e); }
        
        msgContainer.innerHTML = '';
        if (history.length === 0) {
            msgContainer.innerHTML = '<p style="text-align:center; color: var(--muted-foreground); margin: auto; font-size:0.9rem;">Say hello to coordinate work details!</p>';
        } else {
            history.forEach(msg => appendMessage(msg));
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        // Connect WebSocket directly to the backend API host
        if (chatSocket) {
            try { chatSocket.close(1000); } catch(e) {}
            chatSocket = null;
        }

        const apiUrl = new URL(API_BASE, window.location.href);
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = apiUrl.host;
        const wsBasePath = apiUrl.pathname.replace(/\/+$/, '');
        const wsUrl = `${wsProtocol}//${wsHost}${wsBasePath}/chat/ws/${requestId}?token=${encodeURIComponent(authToken)}`;

        chatSocket = new WebSocket(wsUrl);

        chatSocket.onopen = function() {
            console.log('Connected to chat server');
        };
        
        chatSocket.onmessage = function(event) {
            // Remove empty state message if it exists
            const emptyMsg = msgContainer.querySelector('p');
            if (emptyMsg) emptyMsg.remove();

            const data = JSON.parse(event.data);
            appendMessage(data);
            msgContainer.scrollTop = msgContainer.scrollHeight;
            
            // Mark as read immediately if it's from the other person
            if (data.sender_id !== currentUser.id) {
                try {
                    fetch(`${API_BASE}/chat/history/${requestId}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                } catch(e) {}
            }
        };

        chatSocket.onerror = function(err) {
            console.error('WebSocket Error:', err);
        };
        
        chatSocket.onclose = function(event) {
            console.warn('Chat WebSocket closed:', event.code);
            if (event.code === 1008) {
                showToast('Authentication failed. Please log in again.', 'error');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                return;
            }
            if (event.code !== 1000) {
                showToast('Chat disconnected. Reconnecting...', 'warning');
                setTimeout(() => {
                    if (window.location.pathname.includes('chat.html')) {
                        initChat();
                    }
                }, 3000);
            }
        };

    } catch (err) {
        msgContainer.innerHTML = `<p style="color: var(--status-danger); text-align:center; margin: auto;">${err.message}</p>`;
    }
}

function appendMessage(msg) {
    const amIMe = (msg.sender_id && currentUser && currentUser.id)
        ? (msg.sender_id === currentUser.id)
        : (msg.sender_name === (currentUser?.full_name || currentUser?.email?.split('@')[0]));
    
    const div = document.createElement('div');
    div.className = `chat-bubble ${amIMe ? 'sent' : 'received'}`;
    
    const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const displayName = amIMe ? 'You' : (msg.sender_name || 'Participant');
    
    div.innerHTML = `
        <div style="font-weight:600; font-size:0.75rem; margin-bottom:0.25rem; opacity:0.8;">${displayName}</div>
        <div>${msg.content}</div>
        <div class="chat-bubble-time">${time}</div>
    `;
    msgContainer.appendChild(div);
}

document.getElementById('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;

    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(msg);
        input.value = '';
    } else {
        showToast('Connecting to chat... please try again in a moment.', 'warning');
    }
});

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-visible`;
    setTimeout(() => { toast.classList.remove('toast-visible'); }, 3500);
}

// Start if authenticated and valid request
if (authToken && currentUser && requestId) {
    initChat();
}
