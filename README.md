# Task Tracker Pro

Task Tracker Pro is a clean, minimal, and responsive full-stack task scheduling web application with design aesthetics inspired by Notion, Linear, and Apple. It helps users manage daily activities using strict deadlines, automated evaluations, visual progress graphs, and native browser alerts.

---

## Features

- **Authentication System:** Secure registration, login, and token-based password reset (featuring a dev bypass code returned in the API response for testing).
- **Special Day Schedules:** Custom task lists mapped to single dates. Includes a custom React 19 HTML5 drag-and-drop to reorder tasks instantly.
- **Weekly Schedule Routine:** Configurable weekly routine templates that auto-generate checklists for Monday through Sunday.
- **Strict Time Evaluation:** Automatic task deadline monitoring. Checked after end-time but before the grace period = Completed (✔ Green Tick). Unchecked after the grace period = Missed (❌ Red Cross, locked from modifications).
- **Performance Analytics:** Daily streaks, monthly calendars, and detailed weekly dashboards powered by Chart.js (interactive bar and pie charts).
- **End of Day Summaries:** Aggregated performance popup with motivational messages saved in history.
- **Custom Notifications:** HTML5 browser push alerts scheduled at 10m, 5m, start time, and missed deadlines.
- **Glassmorphism Theme:** Custom dark and light modes styled with premium Outfit & Inter typography.

---

## Tech Stack

- **Frontend:** React (Vite, React 19), Tailwind CSS v4, Framer Motion, Chart.js / React-Chartjs-2
- **Backend:** Node.js (Express), MongoDB (Mongoose), JWT, BcryptJS

---

## Installation & Setup

### Prerequisites

- **Node.js:** Ensure Node.js (v18+) is installed.
- **MongoDB:** A running local instance of MongoDB (default: `mongodb://127.0.0.1:27017/tasktrackerpro`).

### Steps

1. **Clone or navigate to the workspace directory:**
   ```bash
   cd Task-scheduler
   ```

2. **Install Root & Workspaces dependencies:**
   This command installs concurrently at the root level, and runs installs in both the `/server` and `/client` directories:
   ```bash
   npm run install:all
   ```

3. **Verify Environment Variables:**
   The backend environment variables are located in `/server/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/tasktrackerpro
   JWT_SECRET=a_very_secure_and_long_jwt_secret_key_1298471894
   NODE_ENV=development
   ```

---

## Running in Development

To start both the Node.js backend server (port 5000) and the React/Vite development server (port 5173 with proxy configuration) concurrently:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing Features

1. **Password Reset:**
   - On the login screen, click "Forgot Password?".
   - Enter your registered email.
   - Click "Request Reset Code". In development, a purple box will appear displaying a 6-digit code. Copy and enter it with your new password to verify.

2. **Automatic Time-Monitoring & Missed Tasks:**
   - Navigate to **Special Day Schedule**.
   - Create a task scheduled to end 1 minute from now.
   - Wait 1 minute plus your profile's grace period (default: 5 minutes, editable in Profile Settings).
   - The checklist box will transition to a **Red Cross ❌** automatically, disable itself, and adjust the streak metrics.

3. **Browser Notifications:**
   - Toggling browser notifications in your profile settings prompts a browser permission request.
   - Scheduled notifications will trigger native OS alerts when the app is active in the background.
