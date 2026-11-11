# LabourGram - Project Documentation

Welcome to the comprehensive documentation for **LabourGram**, a full-stack platform designed to bridge the gap between people who need labour and the skilled workers who provide it. 

This document is written in a simple, easy-to-understand way so that anyone—whether you are a programmer or just a curious friend—can understand exactly what this project does, how it works behind the scenes, and what tools were used to build it.

---

## 1. The Problem
Finding reliable, daily-wage workers (like masons, electricians, farmers, or cleaners) is traditionally a chaotic and unorganized process. Usually, people have to rely on word-of-mouth, physically go to a "labour square" (naka) in the morning, or go through expensive middlemen.
On the other side, the workers themselves struggle to find consistent work and often lose out on fair wages because they don't have a platform to showcase their skills, experience, and past work.

## 2. Our Solution
**LabourGram** is a digital marketplace specifically built for the unorganized labour sector. 
It acts as a direct bridge between **Customers** (people who need work done) and **Labours** (individual workers looking for work).
- **For Customers:** They can search for workers by industry, location, and skills, view their portfolios/past work, see their expected daily wages, view their location on Google Maps, and send them a direct "Hiring Request."
- **For Labours (Workers):** They can create a digital profile, set their expected wage, pinpoint their precise location using State/City/Address autocomplete or device GPS, upload photos of their past work, and receive job requests directly on their phone.

Once a customer sends a hiring request and the labour accepts it, a **Live Chat** opens up so they can finalize the details, location, and timings.

---

## 3. Tech Stack and Libraries
To build this, we used modern, fast, and scalable technologies. Here is the list, explained simply:

### Frontend (What the user sees)
- **HTML5 & CSS3:** The structural bones and the styling of the website. We used standard HTML and pure Vanilla CSS (no bloated frameworks) to keep the website extremely fast and easy to maintain. We used modern CSS techniques like CSS Grid, Flexbox, and Glassmorphism for a premium, mobile-first design.
- **JavaScript (Vanilla):** The logic that runs inside the user's browser. It handles button clicks, fetching data from the backend, uploading images, and dynamically updating the screen without reloading the page.
- **Address Autocomplete & Geocoding Engine (`address-autocomplete.js`):** A custom, client-side engine supporting all 28 Indian States and Union Territories. It allows users to pick their State and City first, narrowing down OpenStreetMap Nominatim / Photon address autocomplete suggestions strictly to that specific city, with built-in 450ms debouncing, 1 req/sec throttling, in-memory query caching, and GPS auto-detection (`navigator.geolocation`).
- **FontAwesome:** A library used to display the beautiful, scalable icons you see all over the website (like the search icon, briefcases, and location pins).

### Backend (The brain behind the scenes)
- **Python:** The core programming language used to write the backend server logic.
- **FastAPI:** A lightning-fast modern Python framework used to build the API (Application Programming Interface). Think of the API as the "waiter" in a restaurant—it takes requests from the frontend (the customer), gives them to the database (the kitchen), and brings the data back to the frontend.
- **SQLite:** A lightweight, self-contained database where we store all the information (users, profiles, messages, etc.).
- **SQLAlchemy:** A tool that allows our Python code to talk to the database using Python objects instead of raw SQL queries.
- **Alembic:** A database migration tool. If we ever add a new feature (like adding "Bio" to a user), Alembic safely upgrades the database without losing any old data.
- **WebSockets:** A technology that keeps a permanent, open connection between the user's browser and the server. We use this for the Live Chat so that messages appear instantly on the screen without the user having to refresh the page.
- **Passlib & PyJWT:** Security libraries used to encrypt user passwords and generate secure "Tokens" (digital ID cards) so that users stay safely logged in.

---

## 4. The Workflow: How It Actually Works Behind the Scenes

This platform serves two core user profiles: **Customers** and **Labours**. Let's walk through how each user interacts with the system and what happens in the code.

### Workflow 1: The Customer's Journey (Hiring Someone)
1. **Registration & Location Selection:** The customer signs up, selecting State (e.g., Maharashtra) and City (e.g., Nashik), and enters or detects their address via GPS.
   - *Behind the Scenes:* The frontend bundles the customer's credentials and precise composite location and creates a user and Customer Profile in the database (`/auth/register` and `/profiles/customer`).
2. **Searching for Workers:** The customer goes to the main page and types their city or area in the location filter.
   - *Behind the Scenes:* The frontend asks the Backend (`/search/providers?location=Nashik`) for a list of workers. The Backend searches the database for all workers in that area and sends back a list of their names, wages, and photos. The frontend dynamically creates HTML "Worker Cards" with direct Google Maps links and displays them.
3. **Sending a Hiring Request:** The customer clicks "Request to Hire" on a worker's card, fills out the date and job description, and hits send.
   - *Behind the Scenes:* The frontend sends this request to the Backend (`/hiring/request`). The Backend saves a new "Hiring Request" into the database with a status of `pending`.
4. **Chatting:** Once the worker accepts, the customer clicks "Start Chat" and sends a message.
   - *Behind the Scenes:* The frontend opens a **WebSocket** connection to the Backend. When the customer types a message, it travels through the open WebSocket to the Backend, which saves it in the database and instantly pushes it to the worker's screen.

### Workflow 2: The Labour's Journey (Getting Hired)
1. **Registration & Profile Creation:** An individual labour signs up, selecting the "Labour (Looking for work)" role, chooses their State, City, and Area address (or clicks Auto-Detect via GPS), and fills out their skills, industry, experience, and expected daily wage.
   - *Behind the Scenes:* The frontend bundles this data and sends it to the Backend (`/auth/register`). The Backend saves the user and automatically creates a corresponding "Provider Profile" in the database linked to that user.
2. **Updating the Profile & Portfolio:** The labour logs in, goes to their Dashboard, updates their bio, availability, and uploads photos of past work (e.g., a painted wall, construction work).
   - *Behind the Scenes:* The frontend sends the image files to the Backend (`/upload/image`). The Backend saves the files securely on the server's hard drive and saves the file URLs to the labour's profile in the database.
3. **Accepting Jobs & Live Negotiation:** The labour checks their Dashboard and sees a new `pending` hiring request from a customer. They click "Accept".
   - *Behind the Scenes:* The frontend tells the Backend to update the request (`/hiring/request/{id}/status`). The Backend changes the database status to `accepted` and unlocks a unique Chat Room ID so the labour and customer can discuss details in real-time.

### Workflow 3: The Administrator's Journey (Quality Control & Verification)
1. **Admin Login & Auto-Routing:** The platform administrator logs in through the standard login modal using admin credentials (`admin@labourgram.com` / `admin123`).
   - *Behind the Scenes:* The frontend inspects the user profile returned by `/auth/me`. Upon detecting `user.role === 'admin'`, it automatically routes the administrator to the executive **Admin Dashboard** (`admin.html`) and adds an "Admin Panel" button to the main navigation bar.
2. **Reviewing New Labour Profiles:** When a new worker signs up, their profile enters the `pending` approval status and does not appear on the homepage search results. The admin sees these profiles in the "Pending Approvals" tab with full details, daily wage, skills, precise location map link, and uploaded portfolio photos (with a click-to-zoom lightbox).
   - *Behind the Scenes:* The admin panel calls `GET /admin/labours?status=pending` to retrieve all unverified profiles.
3. **Approving or Rejecting with Feedback:**
   - **If Approved:** The admin clicks "Approve". The backend sets `approval_status = 'approved'` via `PUT /admin/labours/{id}/approve`. The worker immediately becomes visible on the homepage search results, and their dashboard updates to show a green "Approved & Active" badge.
   - **If Rejected:** The admin clicks "Reject", selects or types a reason (e.g., "Photo clarity needs improvement"), and submits. The backend updates `approval_status = 'rejected'` and stores the `rejection_reason`. The worker's dashboard immediately presents an action-required notice with the admin's exact feedback, and prompts them with an "Update & Re-apply" button to fix their profile and resubmit for review.

---

## 5. Codebase Directory (What Each File Does)

This project is split into two main folders: `frontend` (the UI) and `backend` (the server). Here is a breakdown of every important file.

### Frontend Files (`/frontend`)
- **`index.html`**: The main homepage. It contains the navigation bar, the hero search section, the worker cards grid, and the unified registration modal with state/city address autocomplete.
- **`style.css`**: The central design file. It controls the colors, fonts, spacing, button styles, address dropdowns, and makes sure the website looks great on mobile phones (Responsive Design).
- **`address-autocomplete.js`**: Indian State & City dataset and address autocomplete engine. Provides client-side debouncing, 1 req/sec rate limiting, memory caching, and GPS reverse geocoding.
- **`script.js`**: The main logic for the homepage. It fetches the list of approved workers from the backend, renders worker cards with Google Maps links, and handles Login, Signup, and Admin auto-routing.
- **`dashboard.html`**: The UI for the user's private dashboard for viewing chats, managing requests, checking profile approval status, and editing profile details.
- **`dashboard.js`**: Controls the dashboard. It handles updating user profiles with State/City address autocomplete, uploading portfolio images, re-applying for approval, and accepting/declining hiring requests.
- **`admin.html`**: The dedicated executive Admin Dashboard interface. Features platform KPI stats cards, a review feed for pending labour approvals, directory tables for all labours and customers, a rejection feedback modal, and a fullscreen portfolio lightbox.
- **`admin.js`**: The controller for the Admin Dashboard. Manages authentication guards, fetching stats, approving/rejecting labour profiles, filtering directories, and toggling user account status.
- **`worker.html` & `worker.js`**: The UI and logic for the detailed profile page of a specific worker. It fetches their full bio, stats, direct Google Maps button, and displays their past work images in a grid.
- **`chat.html` & `chat.js`**: The interface and logic for the live messaging system. It connects to the backend WebSocket, listens for incoming messages, and displays them as chat bubbles.

### Backend Files (`/backend/app`)

#### API Endpoints (The routes the frontend talks to)
- **`api.py`**: The main router that connects all the individual API endpoints below into one cohesive system.
- **`endpoints/admin.py`**: Handles platform administrative operations: aggregated KPI metrics, reviewing and approving/rejecting labour profiles with reasons, viewing customer directories, and toggling user active/suspended state.
- **`endpoints/auth.py`**: Handles user Registration and Login, verifying passwords, and generating security Tokens.
- **`endpoints/profiles.py`**: Handles everything related to profiles—fetching profile data, letting workers update their bio, and letting agencies add new workers.
- **`endpoints/search.py`**: Contains the logic to search and filter the database for workers based on industry and location.
- **`endpoints/hiring.py`**: Handles the creation of hiring requests, fetching a user's pending requests, and letting workers accept or decline them.
- **`endpoints/chat.py`**: The powerhouse for messaging. It manages the live WebSocket connections and fetches chat history.
- **`endpoints/upload.py`**: Handles receiving image files from the frontend (like profile pictures and portfolio images) and saving them safely to the server's hard drive.

#### Core Config & Database
- **`main.py`**: The entry point of the backend application. It starts the FastAPI server, connects the database, and serves the static frontend files so the browser can see them.
- **`core/config.py`**: Holds important configuration variables like the secret keys used for security and the project name.
- **`core/database.py`**: Sets up the connection to the SQLite database so the rest of the app can talk to it.
- **`core/security.py`**: Contains the complex math functions used to securely hash passwords and generate JWT tokens.
- **`deps.py`**: Stands for "Dependencies". It contains helper functions used across the app, most importantly the function that reads a user's Token to figure out who is currently logged in.

#### Models (How data is structured in the Database)
- **`models/user.py`**: Defines what a "User" looks like in the database (ID, email, password, role).
- **`models/profile.py`**: Defines what a "Provider Profile" looks like (skills, location, wage, bio, agency ID).
- **`models/hiring.py`**: Defines the "Hiring Request" table (who requested who, job description, status).
- **`models/chat.py`**: Defines the "Chat Message" table (sender, receiver, text content, timestamp).

#### Schemas (How data is formatted when sending to/from Frontend)
- **`schemas/user.py`, `profile.py`, `hiring.py`, `chat.py`**: These files use a library called Pydantic. They act as strict bouncers, ensuring that any data coming in from the frontend is perfectly formatted, and controlling exactly what data gets sent back out (e.g., ensuring passwords are never accidentally sent back to the frontend).

#### CRUD (Create, Read, Update, Delete Database Operations)
- **`crud/crud_user.py`, `crud_profile.py`, `crud_hiring.py`**: Instead of writing messy database queries directly in the API endpoints, all database operations are neatly organized here. For example, `crud_user.get_user_by_email` is written here and used by the auth endpoint.
