# 📍 My Location Guide & Nearby Search Service (Week 8-9)

[English Version](./README.en.md) | [한국어](./README.md)

This web application helps users easily search for local amenities and gathering spots within a **2km radius** from either **89 detailed locations** across 17 provinces in South Korea, or from the user's **current GPS location**, utilizing the Kakao Maps Services API.
It offers interactive maps, responsive designs, and advanced styling built with vanilla technologies.

🔗 **Deployed URL**: [https://ai-location-guide-week8-nyug.onrender.com/](https://ai-location-guide-week8-nyug.onrender.com/)

---

## ✨ Key Features

### 1. 2-Step Location Selection (Region → Detailed Point)
- **Step 1: Region Selection**: Current user location + 14 major administrative zones categorized by signature regional emojis (e.g. Seoul🏙️, Incheon✈️, Busan🌊, Daejeon🔬).
- **Step 2: Detailed Points**: Offers 4–9 major landmarks per administrative zone (totaling 89 detailed nodes nationwide).
- Dropdowns are styled in vanilla CSS imitating modern Shadcn UI aesthetics (focus rings, custom chevrons).

### 2. Real-Time Radius Search (2km)
- Direct keyword input search (e.g. "Daiso", "Library", "Fire station") based on the selected point within a 2km boundaries.
- **9 Preset Category Chips** for one-click searching convenience:
  - 🏛️ Life/Admin: Community Center, Hospital, Pharmacy, Bank, Mart
  - 🥕 Social/Leisure: Restaurants, Cafe, Park, Hiking

### 3. Interactive Map + Results Integration
- Places matching queries are plotted as multiple markers on the map, with metadata cards (name, address, distance, Kakao Map details link) rendered on the left sidebar.
- Clicking a card or a marker pans the camera and reveals a customized Overlay (tooltip).
- Clean state resets: changing the point or keyword clears previous results, overlays, and side cards immediately.

### 4. Location-Based Services (LBS)
- Dynamically retrieves user GPS coordinates via browser Geolocation API on load, setting user coordinate as the default origin.
- Distinctive star-shaped markers identify the user's current location relative to other points.

### 5. 🌗 Premium Dark Mode & UI/UX Polish (New)
- **Hybrid Dark Mode**: Detects client OS theme (`prefers-color-scheme`) automatically and responds to dynamic switches via a toggle button in the sidebar header.
- **Dark Map Filtering**: Integrates a seamless CSS invert filter (`invert(90%) hue-rotate(180deg) ...`) onto the Kakao Map tiles to blend the bright map naturally with the dark theme.
- **Custom Scrollbar**: Replaces default browser scrollbars with thin, elegant styled tracks and thumbs matching the indigo accent color.
- **Micro-Interactions**: Provides smooth transitions on hover/active states for buttons, chips, and result cards.

---

## 🖥️ Screen Layout and UX

- **Split View**: Sidebar (480px) on the left for configurations and result cards + interactive Kakao Map on the right.
- **Mobile Responsive**: Adapts layout to top map + bottom list scroll behavior for easy one-hand operations.
- **Indigo Theme**: Minimalist color palette based on deep indigo tones for clarity and modern look.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Grid/Flex layout), Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Map/Search API**: Kakao Maps SDK (Maps + Services Library)
- **Deployment**: Render.com (GitHub automated CI/CD)

---

## 📁 Project Directory Structure

```text
.
├── server.js          # Express server with security and cache control headers
├── package.json       # Dependencies and npm script hooks
├── package-lock.json  # NPM lock file
├── render.yaml        # Render.com Blueprint configuration
├── .gitignore         # Untracked files list
├── README.md          # Project documentation (Korean)
├── README.en.md       # Project documentation (English)
└── public/
    └── index.html     # Single-page Map Web App
```

---

## 🚀 How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org) installed (LTS version recommended)

### 2. Install Packages
```bash
npm install
```

### 3. Start Server
```bash
npm start
```
- Listens on **Port 3000** by default (or process.env.PORT in production setups).

### 4. Browse App
```text
http://localhost:3000
```

> ⚠️ Local map rendering requires registering `http://localhost:3000` to the **JavaScript SDK domain list** in your Kakao Developer Console.

---

## 🛡️ Operations & Security

- **Dynamic Port Binding**: Prioritizes `process.env.PORT` to run natively in various cloud platforms (e.g. Render).
- **Header Obfuscation**: Disables the `x-powered-by` header to secure server version details.
- **Anti-Caching Policies**: Directs no-store cache headers for `index.html` to prevent display glitches of outdated local cached copies.

---

## 🚚 Deployment Retro — From Cloud Run to Render.com

Initially planned on **Google Cloud Run**, but was blocked because Cloud Run requires credit card registrations to enable billing accounts even for free tiers:

```text
ERROR: Billing account for project ... is not found. Billing must be enabled...
```

To avoid immediate card requirements during the training phase, the project was migrated to **Render.com** which offers free tiers card-free.

**Why Render?**
- 💳 **No credit cards required** for initial deployments.
- 🔗 **GitHub Repository integrations** triggers automatic deployment updates upon git pushes.
- 🌐 **Static SSL address (https)** which keeps Kakao SDK domain registries simple.
- ⏳ (Caveat) Server sleeps when idle under the free tier, causing the initial load to take around 30 seconds (normal speed thereafter).
