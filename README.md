# KPI Tracker - Hệ thống theo dõi KPI

KPI Tracker is a comprehensive key performance indicator tracking application built for a specific 24-user organizational unit. It features a complete dashboard, individual detail reports, real-time synchronization, and multi-format Excel exports.

## Table of Contents
- [Features](#features)
- [Local Development Setup](#local-development-setup)
- [Firebase Realtime Database Setup](#firebase-realtime-database-setup)
- [Deployment on Vercel](#deployment-on-vercel)

---

## Features
- **Daily Dashboard:** Track quantity, quality, and progress scores on a 14-column metric basis.
- **Reporting System:** Granular breakdown reports for individuals and the entire department across configurable time periods (daily, weekly, monthly, quarterly, semi-annually, annually).
- **Excel Exports:** Automatic categorization into major work groups (Groups 1-5).
- **Role-Based Permissions:** Dedicated Admin features to maintain User Catalogs and Work Group parameters dynamically.

---

## Local Development Setup

To run this application locally, you'll need [Node.js](https://nodejs.org/) installed on your machine.

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd kpi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *Note: This project uses Vite as the build tool and bundler.*

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000` (or whichever port Vite provides).

---

## Firebase Realtime Database Setup

This project uses Firebase Realtime Database to sync tasks, user profiles, and settings across all devices in real-time. Follow these steps to configure your own database.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (thêm dự án) and follow the on-screen instructions. You can disable Google Analytics for this specific app if not required.

### 2. Enable Realtime Database
1. Once your project is created, select it to open the dashboard.
2. In the left navigation menu, go to **Build** > **Realtime Database**.
3. Click **Create Database**.
4. Choose the region closest to your users (e.g., `asia-southeast1` for Vietnam).
5. Start in **Locked mode** (we will configure rules later).

### 3. Update Database Rules
For the application to read and write data seamlessly without complex Firebase Authentication (assuming you are handling authentication internally as per `store.js`), update your database rules:

1. In the Realtime Database panel, switch to the **Rules** tab.
2. Replace the existing text with the following configuration:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   *Note: For a production environment with sensitive data, it is highly recommended to implement Firebase Authentication and restrict these rules so that only authenticated users `"auth != null"` can read/write data.*

### 4. Provide Configuration to the App
1. Go to **Project Overview** (gear icon ⚙️) > **Project settings**.
2. Scroll down to the **Your apps** section.
3. Click the Web icon (`</>`) to add a Firebase Web App. Register an app nickname (e.g., "kpi-tracker-web").
4. Firebase will generate an SDK setup and configuration script. Copy the `firebaseConfig` object, which will look something like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.region.firebasedatabase.app",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
5. Open `/src/data/firebase.js` in your codebase.
6. Replace the existing `firebaseConfig` object at the top of the file with the one you copied from the Firebase Console.
7. Save the file. Your app will now read and write directly to your cloud database!

---

## Deployment on Vercel

Vercel is the easiest platform to deploy Vite (React/Vanilla JS) applications globally with free hosting for standard projects. 

### Prerequisites
- A GitHub account holding your push to the repository (`holygeek00/kpi`).
- A [Vercel](https://vercel.com/) account (you can sign up using GitHub).

### Deployment Steps
1. Log in to your Vercel Dashboard.
2. Click **Add New** > **Project**.
3. In the **Import Git Repository** section, select your GitHub account and find the repository `kpi`. Click **Import**.
4. Configure your project:
   - **Project Name:** Choose a name (e.g., `kpi-tracker-vietnam`).
   - **Framework Preset:** Vercel should automatically detect **Vite**. If it doesn't, select it manually.
   - **Root Directory:** Leave it as `./` (default).
   - **Build and Output Settings:** Leave them as their overridden defaults:
     - Build Command: `npm run build` or `vite build`
     - Output Directory: `dist`
     - Install Command: `npm install`
5. Click **Deploy**.
6. Wait 1-2 minutes for Vercel to clone, build, and deploy your site. 
7. Once completed, Vercel will provide a `.vercel.app` live URL.

### Automatic Deployments
Since your Vercel project is linked to your GitHub repository, **any time you run `git push` to your main branch, Vercel will automatically rebuild and deploy the latest changes** to your live URL.

---

## Deployment on Firebase Hosting (Automated via GitHub Actions)

This project is configured to automatically deploy to Firebase Hosting whenever you push to the `main` branch.

### 1. Setup GitHub Secrets
To make the automated deployment work, you MUST add the following secrets to your GitHub repository (**Settings > Secrets and variables > Actions**):

- `FIREBASE_SERVICE_ACCOUNT_KPI_DUN`: The JSON key for your Firebase Service Account.
- `VITE_FIREBASE_API_KEY`: Your Firebase API Key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain.
- `VITE_FIREBASE_DATABASE_URL`: Your Firebase Database URL.
- `VITE_FIREBASE_PROJECT_ID`: `kpi-dun`
- `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID`: Your Firebase App ID.
- `VITE_FIREBASE_MEASUREMENT_ID`: Your Firebase Measurement ID.

### 2. How to get the Service Account Key?
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Project Settings (gear icon) > **Service accounts**.
3. Click **Generate new private key**.
4. A JSON file will download. Copy the ENTIRE content of this file and paste it into the `FIREBASE_SERVICE_ACCOUNT_KPI_DUN` secret on GitHub.

### 3. Automatic Deployments
Once the secrets are set, every time you run `git push origin main`, GitHub will build and deploy your site automatically.
