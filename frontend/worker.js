document.addEventListener('DOMContentLoaded', async () => {
    // Extract ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const workerId = urlParams.get('id');

    if (!workerId) {
        showToast('Invalid worker ID.', 'error');
        window.location.href = 'index.html';
        return;
    }

    try {
        await fetchActiveRequests(); // Ensure we have the user's active requests before rendering buttons
        
        const headers = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        
        const response = await fetch(`${API_BASE}/profiles/provider/profile/${workerId}`, {
            headers
        });
        
        if (!response.ok) {
            throw new Error('Failed to load worker profile.');
        }

        // Safety check: ensure we got JSON back, not HTML
        const ct = response.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            throw new Error('Server returned an invalid response. Please try again.');
        }

        const worker = await response.json();
        renderWorkerProfile(worker);
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('loading').innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
});

function renderWorkerProfile(worker) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';

    const workerName = (worker.user && worker.user.full_name) ? worker.user.full_name : (worker.full_name || worker.skills.split(',')[0].trim() + ' Worker');
    const image = worker.image_url || `https://source.unsplash.com/150x150/?${worker.industry},worker`;

    document.getElementById('wpImage').src = image;
    document.getElementById('wpName').textContent = workerName;
    document.getElementById('wpRole').textContent = worker.skills;
    
    document.getElementById('wpIndustry').textContent = worker.industry;
    document.getElementById('wpExp').textContent = `${worker.experience_years} yrs exp`;
    document.getElementById('wpLoc').textContent = worker.location;
    document.getElementById('wpWage').textContent = worker.expected_wage;

    const statusBadge = document.getElementById('wpStatus');
    if (worker.is_available) {
        statusBadge.textContent = 'Available Now';
        statusBadge.style.background = '#dcfce7';
        statusBadge.style.color = '#16a34a';
    } else {
        statusBadge.textContent = 'Busy / Unavailable';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#d97706';
    }

    document.getElementById('wpBio').textContent = worker.bio || "This worker hasn't added a bio yet.";

    const portfolioContainer = document.getElementById('wpPortfolio');
    const portfolioSection = document.getElementById('portfolioSection');
    
    if (worker.portfolio_urls) {
        const urls = worker.portfolio_urls.split(',').map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length > 0) {
            portfolioContainer.innerHTML = urls.map(u => 
                `<img src="${u}" class="portfolio-item" onclick="openFullscreen('${u}')" onerror="this.style.display='none'">`
            ).join('');
            portfolioSection.style.display = 'block';
        }
    }

    const actionContainer = document.getElementById('wpAction');
    actionContainer.innerHTML = getWorkerActionHtml(worker, workerName);
}

// Fullscreen functionality
function openFullscreen(src) {
    document.getElementById('fsImage').src = src;
    document.getElementById('fsViewer').classList.add('active');
}

function closeFullscreen() {
    document.getElementById('fsViewer').classList.remove('active');
}
