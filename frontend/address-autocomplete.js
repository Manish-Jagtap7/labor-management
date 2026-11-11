// =========================================================================
// LabourGram - Indian State, City & Address Autocomplete Engine
// Implements client-side debouncing, rate limiting (1 req/sec), caching,
// and bounds address search strictly to the selected City and State.
// =========================================================================

const INDIAN_STATES_CITIES = {
    "Maharashtra": [
        "Nashik", "Mumbai", "Pune", "Nagpur", "Thane", "Chhatrapati Sambhajinagar", 
        "Solapur", "Kolhapur", "Amravati", "Navi Mumbai", "Jalgaon", "Akola", 
        "Latur", "Dhule", "Ahmednagar", "Chandrapur", "Parbhani", "Nanded", 
        "Ratnagiri", "Satara", "Sangli", "Wardha", "Yavatmal", "Beed", "Gondia", 
        "Raigad", "Sindhudurg", "Palghar", "Bhandara", "Gadchiroli", "Nandurbar", "Washim", "Hingoli"
    ],
    "Gujarat": [
        "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", 
        "Gandhinagar", "Junagadh", "Anand", "Navsari", "Morbi", "Bharuch", "Mehsana", "Porbandar"
    ],
    "Karnataka": [
        "Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", 
        "Kalaburagi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Udupi"
    ],
    "Delhi": [
        "New Delhi", "Central Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini"
    ],
    "Uttar Pradesh": [
        "Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Ghaziabad", 
        "Noida", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Gorakhpur", "Mathura", "Ayodhya"
    ],
    "Rajasthan": [
        "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Sikar", "Bharatpur"
    ],
    "Madhya Pradesh": [
        "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"
    ],
    "Punjab": [
        "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"
    ],
    "Haryana": [
        "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"
    ],
    "Tamil Nadu": [
        "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thanjavur"
    ],
    "Telangana": [
        "Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam", "Mahbubnagar"
    ],
    "Andhra Pradesh": [
        "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kakinada", "Anantapur"
    ],
    "West Bengal": [
        "Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Kharagpur", "Haldia"
    ],
    "Kerala": [
        "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur", "Alappuzha", "Palakkad", "Malappuram"
    ],
    "Bihar": [
        "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai"
    ],
    "Odisha": [
        "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"
    ],
    "Assam": [
        "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"
    ],
    "Jharkhand": [
        "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"
    ],
    "Chhattisgarh": [
        "Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon"
    ],
    "Uttarakhand": [
        "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Rishikesh", "Nainital"
    ],
    "Himachal Pradesh": [
        "Shimla", "Dharamshala", "Solan", "Mandi", "Kullu", "Manali", "Baddi"
    ],
    "Goa": [
        "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"
    ],
    "Jammu & Kashmir": [
        "Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur"
    ],
    "Chandigarh": [
        "Chandigarh"
    ],
    "Other States / UTs": [
        "Port Blair", "Itanagar", "Daman", "Diu", "Silvassa", "Leh", "Kargil", "Kavaratti", "Imphal", "Shillong", "Aizawl", "Kohima", "Puducherry", "Gangtok", "Agartala"
    ]
};

// Rate limiting & Caching storage
const addressSearchCache = new Map();
let lastNominatimCallTime = 0;
const MIN_INTERVAL_MS = 1000; // Nominatim strictly requires max 1 req/sec
const DEBOUNCE_DELAY_MS = 450;

/**
 * Parse an existing location string (e.g., "Ram Nagar, Nashik, Maharashtra" or "Nashik, MH")
 * into { state, city, address }.
 */
function parseCompositeLocation(locationStr) {
    if (!locationStr || typeof locationStr !== 'string') {
        return { state: 'Maharashtra', city: '', address: '' };
    }
    const parts = locationStr.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return { state: 'Maharashtra', city: '', address: '' };

    let detectedState = '';
    let detectedCity = '';
    let addressParts = [];

    // Find state from the end
    const stateNames = Object.keys(INDIAN_STATES_CITIES);
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].toLowerCase();
        // check abbreviation or full name
        const match = stateNames.find(s => s.toLowerCase() === p || (p === 'mh' && s === 'Maharashtra') || (p === 'dl' && s === 'Delhi') || (p === 'ka' && s === 'Karnataka') || (p === 'gj' && s === 'Gujarat'));
        if (match) {
            detectedState = match;
            parts.splice(i, 1);
            break;
        }
    }

    if (!detectedState) detectedState = 'Maharashtra';

    // Find city from the remaining parts
    const cityList = INDIAN_STATES_CITIES[detectedState] || [];
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i].toLowerCase();
        const cityMatch = cityList.find(c => c.toLowerCase() === p);
        if (cityMatch) {
            detectedCity = cityMatch;
            parts.splice(i, 1);
            break;
        }
    }

    if (!detectedCity && parts.length > 0) {
        // If only 1 part left, assume it's city
        if (parts.length === 1) {
            detectedCity = parts[0];
            parts = [];
        } else {
            detectedCity = parts.pop();
        }
    }

    const address = parts.join(', ');
    return { state: detectedState, city: detectedCity, address: address };
}

/**
 * Initialize address autocomplete binding for a form
 */
function setupAddressAutocomplete(config) {
    const {
        stateSelectId,
        citySelectId,
        customCityInputId,
        addressInputId,
        dropdownId,
        hiddenLocationId,
        detectBtnId,
        initialLocation,
        onLocationChanged
    } = config;

    const stateSelect = document.getElementById(stateSelectId);
    const citySelect = document.getElementById(citySelectId);
    const customCityInput = customCityInputId ? document.getElementById(customCityInputId) : null;
    const addressInput = document.getElementById(addressInputId);
    const dropdown = document.getElementById(dropdownId);
    const hiddenLocation = document.getElementById(hiddenLocationId);
    const detectBtn = detectBtnId ? document.getElementById(detectBtnId) : null;

    if (!stateSelect || !citySelect || !addressInput || !dropdown || !hiddenLocation) {
        console.warn('Address autocomplete missing required elements', config);
        return;
    }

    let debounceTimer = null;
    let currentAbortController = null;

    // 1. Populate State options
    stateSelect.innerHTML = '<option value="">-- Select State --</option>';
    Object.keys(INDIAN_STATES_CITIES).forEach(state => {
        const opt = document.createElement('option');
        opt.value = state;
        opt.textContent = state;
        stateSelect.appendChild(opt);
    });

    // Populate cities for a given state
    function updateCities(selectedState, preselectCity = '') {
        citySelect.innerHTML = '<option value="">-- Select City --</option>';
        if (!selectedState || !INDIAN_STATES_CITIES[selectedState]) {
            citySelect.disabled = true;
            addressInput.disabled = true;
            addressInput.placeholder = 'Select State & City first...';
            return;
        }

        citySelect.disabled = false;
        const cities = INDIAN_STATES_CITIES[selectedState];
        let found = false;

        cities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            if (preselectCity && city.toLowerCase() === preselectCity.toLowerCase()) {
                opt.selected = true;
                found = true;
            }
            citySelect.appendChild(opt);
        });

        // Add 'Other' option
        const otherOpt = document.createElement('option');
        otherOpt.value = '__other__';
        otherOpt.textContent = 'Other (Custom City)';
        if (preselectCity && !found) {
            otherOpt.selected = true;
            if (customCityInput) {
                customCityInput.style.display = 'block';
                customCityInput.value = preselectCity;
            }
        }
        citySelect.appendChild(otherOpt);

        onLocationInputUpdated();
    }

    function getSelectedCity() {
        if (citySelect.value === '__other__') {
            return customCityInput ? customCityInput.value.trim() : '';
        }
        return citySelect.value.trim();
    }

    function onLocationInputUpdated() {
        const state = stateSelect.value;
        const city = getSelectedCity();
        const address = addressInput.value.trim();

        if (state && city) {
            addressInput.disabled = false;
            addressInput.placeholder = `e.g. Ram Nagar, College Road in ${city}...`;
        } else {
            addressInput.disabled = true;
            addressInput.placeholder = 'Select State & City first...';
        }

        // Compute composite location
        let fullLoc = '';
        if (state && city) {
            fullLoc = address ? `${address}, ${city}, ${state}` : `${city}, ${state}`;
        } else if (state) {
            fullLoc = state;
        }
        hiddenLocation.value = fullLoc;

        if (typeof onLocationChanged === 'function') {
            onLocationChanged(fullLoc, { state, city, address });
        }
    }

    // State change event
    stateSelect.addEventListener('change', () => {
        if (customCityInput) {
            customCityInput.style.display = 'none';
            customCityInput.value = '';
        }
        updateCities(stateSelect.value);
    });

    // City change event
    citySelect.addEventListener('change', () => {
        if (citySelect.value === '__other__') {
            if (customCityInput) {
                customCityInput.style.display = 'block';
                customCityInput.focus();
            }
        } else {
            if (customCityInput) {
                customCityInput.style.display = 'none';
                customCityInput.value = '';
            }
        }
        onLocationInputUpdated();
    });

    if (customCityInput) {
        customCityInput.addEventListener('input', onLocationInputUpdated);
    }

    // Parse initial location if provided
    if (initialLocation) {
        const parsed = parseCompositeLocation(initialLocation);
        if (parsed.state) {
            stateSelect.value = parsed.state;
            updateCities(parsed.state, parsed.city);
        }
        if (parsed.address) {
            addressInput.value = parsed.address;
        }
        onLocationInputUpdated();
    } else {
        // Default to Maharashtra
        stateSelect.value = 'Maharashtra';
        updateCities('Maharashtra', 'Nashik');
    }

    // 2. Address autocomplete with proper rate limits
    addressInput.addEventListener('input', () => {
        onLocationInputUpdated();
        const query = addressInput.value.trim();
        const state = stateSelect.value;
        const city = getSelectedCity();

        clearTimeout(debounceTimer);

        if (!state || !city) {
            dropdown.innerHTML = `<div class="address-status-msg">Please select State and City first.</div>`;
            dropdown.style.display = 'block';
            return;
        }

        if (query.length < 3) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        // Show subtle loading state
        dropdown.innerHTML = `<div class="address-status-msg"><i class="fa-solid fa-spinner fa-spin"></i> Searching in ${city}...</div>`;
        dropdown.style.display = 'block';

        // 450ms Debounce
        debounceTimer = setTimeout(() => {
            fetchAddressSuggestions(query, city, state);
        }, DEBOUNCE_DELAY_MS);
    });

    async function fetchAddressSuggestions(query, city, state) {
        const cacheKey = `${query.toLowerCase()}|${city.toLowerCase()}|${state.toLowerCase()}`;

        // Return cached results if available
        if (addressSearchCache.has(cacheKey)) {
            renderSuggestions(addressSearchCache.get(cacheKey), query, city);
            return;
        }

        // Cancel previous pending request
        if (currentAbortController) {
            currentAbortController.abort();
        }
        currentAbortController = new AbortController();

        // Throttling: Ensure minimum 1 second between API calls to respect Nominatim limits
        const now = Date.now();
        const timeSinceLast = now - lastNominatimCallTime;
        if (timeSinceLast < MIN_INTERVAL_MS) {
            await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - timeSinceLast));
        }
        lastNominatimCallTime = Date.now();

        try {
            // Target the search strictly to the city and state
            const targetQuery = `${query}, ${city}, ${state}, India`;
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(targetQuery)}&addressdetails=1&countrycodes=in&limit=5`;

            const res = await fetch(url, {
                headers: { 'Accept-Language': 'en' },
                signal: currentAbortController.signal
            });

            if (res.status === 429) {
                // Rate limited - show polite fallback
                dropdown.innerHTML = `<div class="address-status-msg" style="color:var(--text-light);"><i class="fa-solid fa-circle-info"></i> Suggestions paused (Rate limit). You can enter your address directly.</div>`;
                return;
            }

            if (!res.ok) throw new Error('Search failed');

            const places = await res.json();
            const suggestions = formatPlaces(places, city, state);

            addressSearchCache.set(cacheKey, suggestions);
            renderSuggestions(suggestions, query, city);

        } catch (err) {
            if (err.name === 'AbortError') return;

            // Fallback to Photon geocoder if Nominatim encounters network/CORS issues
            try {
                const photonUrl = `https://photon.komoot.de/api/?q=${encodeURIComponent(query + ' ' + city + ' ' + state)}&limit=5`;
                const pres = await fetch(photonUrl);
                if (pres.ok) {
                    const pdata = await pres.json();
                    const pSuggestions = (pdata.features || []).map(f => {
                        const props = f.properties || {};
                        const name = props.name || props.street || query;
                        const sub = [props.district || props.suburb || props.locality, props.city || city, state].filter(Boolean).join(', ');
                        return { title: name, subtitle: sub, full: `${name}, ${sub}` };
                    });
                    addressSearchCache.set(cacheKey, pSuggestions);
                    renderSuggestions(pSuggestions, query, city);
                    return;
                }
            } catch (e2) {}

            dropdown.innerHTML = `<div class="address-status-msg">No suggestions found. You can keep typing your address.</div>`;
        }
    }

    function formatPlaces(places, city, state) {
        if (!places || places.length === 0) return [];
        return places.map(p => {
            const addr = p.address || {};
            const roadOrPlace = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || addr.residential || p.display_name.split(',')[0];
            const secondaryParts = [
                addr.suburb && addr.suburb !== roadOrPlace ? addr.suburb : null,
                addr.city || addr.town || addr.county || city,
                state
            ].filter(Boolean);

            const title = roadOrPlace.trim();
            const subtitle = secondaryParts.join(', ');
            return {
                title: title,
                subtitle: subtitle,
                full: `${title}, ${city}, ${state}`,
                lat: p.lat,
                lon: p.lon
            };
        });
    }

    function renderSuggestions(suggestions, query, city) {
        if (!suggestions || suggestions.length === 0) {
            dropdown.innerHTML = `<div class="address-status-msg">No specific locations matching "<strong>${query}</strong>" in ${city}. You can still use this address!</div>`;
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = suggestions.map((item, idx) => `
            <div class="address-item" data-idx="${idx}">
                <i class="fa-solid fa-location-dot"></i>
                <div style="flex:1;">
                    <div class="address-item-title">${escapeHtml(item.title)}</div>
                    <div class="address-item-sub">${escapeHtml(item.subtitle)}</div>
                </div>
            </div>
        `).join('');

        dropdown.style.display = 'block';

        // Add click handlers
        dropdown.querySelectorAll('.address-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-idx'));
                const sel = suggestions[idx];
                if (sel) {
                    addressInput.value = sel.title;
                    onLocationInputUpdated();
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                }
            });
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!addressInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // 3. GPS Auto-Detect
    if (detectBtn) {
        detectBtn.addEventListener('click', async () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }

            const origContent = detectBtn.innerHTML;
            detectBtn.disabled = true;
            detectBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Detecting...`;

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
                        const revRes = await fetch(revUrl, {
                            headers: { 'Accept-Language': 'en' }
                        });
                        if (!revRes.ok) throw new Error('Reverse geocoding failed');
                        const data = await revRes.json();
                        const addr = data.address || {};

                        // Detect state
                        const revState = addr.state;
                        const matchState = Object.keys(INDIAN_STATES_CITIES).find(s => 
                            revState && s.toLowerCase().includes(revState.toLowerCase())
                        ) || 'Maharashtra';

                        stateSelect.value = matchState;

                        // Detect city
                        const revCity = addr.city || addr.town || addr.county || addr.suburb || addr.city_district || 'Nashik';
                        updateCities(matchState, revCity);

                        // Detect local road/area
                        const localRoad = addr.road || addr.neighbourhood || addr.suburb || '';
                        if (localRoad) {
                            addressInput.value = localRoad;
                        }

                        onLocationInputUpdated();

                        if (typeof showToast === 'function') {
                            showToast(`Location detected: ${revCity}, ${matchState}`, 'success');
                        }
                    } catch (err) {
                        alert('Could not pinpoint address automatically. Please select State and City manually.');
                    } finally {
                        detectBtn.disabled = false;
                        detectBtn.innerHTML = origContent;
                    }
                },
                (err) => {
                    detectBtn.disabled = false;
                    detectBtn.innerHTML = origContent;
                    alert('Permission denied or GPS unavailable. Please choose State and City manually.');
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
