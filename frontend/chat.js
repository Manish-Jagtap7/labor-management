const API_BASE = '/api/v1';
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

async function initChat() {
    try {
        // Fetch history
        const res = await fetch(`${API_BASE}/chat/history/${requestId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to load chat history');
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
            msgContainer.innerHTML = '<p style="text-align:center; color: var(--text-light); margin: auto;">Say hi to start the conversation!</p>';
        } else {
            history.forEach(msg => appendMessage(msg));
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }

        // Connect WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        chatSocket = new WebSocket(`${wsProtocol}//${window.location.host}/api/v1/chat/ws/${requestId}?token=${authToken}`);
        
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
            showToast('Disconnected from chat.', 'error');
        };
        
        chatSocket.onclose = function() {
            showToast('Chat closed.', 'warning');
        }

    } catch (err) {
        msgContainer.innerHTML = `<p style="color: #ef4444; text-align:center; margin: auto;">${err.message}</p>`;
    }
}

function appendMessage(msg) {
    const amIMe = msg.sender_name === (currentUser.full_name || currentUser.email.split('@')[0]);
    
    const div = document.createElement('div');
    div.className = `chat-message ${amIMe ? 'sent' : 'received'}`;
    
    const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    
    div.innerHTML = `
        <span class="meta">${msg.sender_name} • ${time}</span>
        ${msg.content}
    `;
    msgContainer.appendChild(div);
}

document.getElementById('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (msg && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(msg);
        input.value = '';
    }
});

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} toast-visible`;
    setTimeout(() => { toast.classList.remove('toast-visible'); }, 3500);
}

// Start
initChat();
