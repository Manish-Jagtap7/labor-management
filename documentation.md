# LabourGram - Project Documentation

Welcome to the comprehensive documentation for **LabourGram**, a full-stack platform designed to bridge the gap between people who need labour and the skilled workers who provide it. 

This document is written in a simple, easy-to-understand way so that anyone—whether you are a programmer or just a curious friend—can understand exactly what this project does, how it works behind the scenes, and what tools were used to build it.

---

## 1. The Problem
Finding reliable, daily-wage workers (like masons, electricians, farmers, or cleaners) is traditionally a chaotic and unorganized process. Usually, people have to rely on word-of-mouth, physically go to a "labour square" (naka) in the morning, or go through expensive middlemen.
On the other side, the workers themselves struggle to find consistent work and often lose out on fair wages because they don't have a platform to showcase their skills, experience, and past work.

## 2. Our Solution
**LabourGram** is a digital marketplace specifically built for the unorganized labour sector. 
It acts as a direct bridge between **Customers** (people who need work done) and **Providers** (individual workers or labour agencies).
- **For Customers:** They can search for workers by industry, location, and skills, view their portfolios/past work, see their expected daily wages, and send them a direct "Hiring Request."
- **For Individual Workers:** They can create a digital profile, set their expected wage, upload photos of their past work, and receive job requests directly on their phone.
- **For Labour Agencies (Providers):** Contractors who manage multiple labourers can create a single agency account, add multiple worker profiles under their umbrella, and manage all their hiring requests and chats in one place.

Once a customer sends a hiring request and the worker (or agency) accepts it, a **Live Chat** opens up so they can finalize the details, location, and timings.

---

## 3. Tech Stack and Libraries
To build this, we used modern, fast, and scalable technologies. Here is the list, explained simply:

### Frontend (What the user sees)
- **HTML5 & CSS3:** The structural bones and the styling of the website. We used standard HTML and pure Vanilla CSS (no bloated frameworks) to keep the website extremely fast and easy to maintain. We used modern CSS techniques like CSS Grid, Flexbox, and Glassmorphism for a premium, mobile-first design.
- **JavaScript (Vanilla):** The logic that runs inside the user's browser. It handles button clicks, fetching data from the backend, uploading images, and dynamically updating the screen without reloading the page.
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

This platform serves three distinct types of users. Let's walk through how each user interacts with the system and what happens in the code.

### Workflow 1: The Customer's Journey (Hiring Someone)
1. **Searching for Workers:** The customer goes to the main page and types "Mumbai" in the location filter.
   - *Behind the Scenes:* The frontend asks the Backend (`/search/providers?location=Mumbai`) for a list of workers. The Backend searches the database for all workers in Mumbai and sends back a list of their names, wages, and photos. The frontend dynamically creates HTML "Worker Cards" and displays them.
2. **Sending a Hiring Request:** The customer clicks "Request to Hire" on a worker's card, fills out the date and job description, and hits send.
   - *Behind the Scenes:* The frontend sends this request to the Backend (`/hiring/request`). The Backend saves a new "Hiring Request" into the database with a status of `pending`.
3. **Chatting:** Once the worker accepts, the customer clicks "Start Chat" and sends a message.
   - *Behind the Scenes:* The frontend opens a **WebSocket** connection to the Backend. When the customer types a message, it travels through the open WebSocket to the Backend, which saves it in the database and instantly pushes it to the worker's screen.

### Workflow 2: The Individual Worker's Journey (Getting Hired)
1. **Registration & Profile Creation:** An individual worker signs up, selecting the "Individual Worker" role, and fills out their skills, location, and wage.
   - *Behind the Scenes:* The frontend bundles this data and sends it to the Backend (`/auth/register`). The Backend saves the user and automatically creates a corresponding "Provider Profile" in the database linked to that user.
2. **Updating the Portfolio:** The worker logs in, goes to their Dashboard, adds a "Bio", and uploads photos of their past work (e.g., a painted wall).
   - *Behind the Scenes:* The frontend sends the image files to the Backend (`/upload/image`). The Backend saves the files securely on the server's hard drive and saves the file URLs to the worker's profile in the database.
3. **Accepting Jobs:** The worker checks their Dashboard and sees a new `pending` hiring request from a customer. They click "Accept".
   - *Behind the Scenes:* The frontend tells the Backend to update the request (`/hiring/request/{id}/status`). The Backend changes the database status to `accepted` and unlocks a unique Chat Room ID so the worker and customer can talk.

### Workflow 3: The Labour Agency's Journey (Managing Multiple Workers)
1. **Agency Registration:** A contractor signs up as an "Agency" so they can list all the laborers who work under them.
   - *Behind the Scenes:* Just like individual workers, the Backend creates the user, but marks their role strictly as `agency`. 
2. **Adding Agency Workers:** The agency goes to their Dashboard and clicks "Add New Worker". They fill out a form for *Worker A* (e.g., Gaurav, a Mason) and upload his photos.
   - *Behind the Scenes:* Instead of updating their own profile, the frontend sends a request to a special endpoint (`/profiles/provider/agency/worker`). The Backend creates a *brand new* "Provider Profile" in the database, but instead of linking it to a new User, it links it directly to the Agency's ID. This allows one agency to own unlimited worker profiles.
3. **Managing Incoming Requests:** A customer sees *Worker A* on the main page and sends a hiring request. 
   - *Behind the Scenes:* The Backend realizes *Worker A* is managed by an agency. It links the hiring request to both *Worker A*'s specific profile ID and the *Agency*'s user ID. When the Agency logs into their dashboard, they see the request labeled specifically for *Worker A*, allowing the contractor to negotiate on behalf of their worker via the WebSocket chat.

---

## 5. Codebase Directory (What Each File Does)

This project is split into two main folders: `frontend` (the UI) and `backend` (the server). Here is a breakdown of every important file.

### Frontend Files (`/frontend`)
- **`index.html`**: The main homepage. It contains the navigation bar, the hero search section, and the grid where all the worker cards are displayed.
- **`style.css`**: The central design file. It controls the colors, fonts, spacing, button styles, and makes sure the website looks great on mobile phones (Responsive Design).
- **`script.js`**: The main logic for the homepage. It fetches the list of workers from the backend, renders the worker cards, and handles the Login/Signup popup windows.
- **`dashboard.html`**: The UI for the user's private dashboard. Depending on who logs in (Customer, Worker, or Agency), this page adapts to show their specific tools.
- **`dashboard.js`**: Controls the dashboard. It handles updating user profiles, managing agency workers, uploading portfolio images, and accepting/declining hiring requests.
- **`worker.html` & `worker.js`**: The UI and logic for the detailed profile page of a specific worker. It fetches their full bio, stats, and displays their past work images in a grid.
- **`chat.html` & `chat.js`**: The interface and logic for the live messaging system. It connects to the backend WebSocket, listens for incoming messages, and displays them as chat bubbles.

### Backend Files (`/backend/app`)

#### API Endpoints (The routes the frontend talks to)
- **`api.py`**: The main router that connects all the individual API endpoints below into one cohesive system.
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
