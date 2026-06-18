# 🥞 Uncle Peter's Pancakes Chatbot & Admin Dashboard

An intelligent conversational WhatsApp chatbot simulator and live token auditing dashboard built for **Uncle Peter's Pancakes** in Ludhiana. 

This project simulates direct-to-consumer automated ordering, checks menu prices and stock status from a local SQLite database, stores structured chat logs, and implements **Cross-Session User Profile Memory** (rolling summaries carried over when starting new sessions).

---

## 🚀 Quick Start Guide

Follow these simple steps to run the project locally on your laptop:

### 1. Prerequisite
Make sure you have [Node.js](https://nodejs.org/) installed (v16.0.0 or higher is recommended).

### 2. Install Dependencies
Clone the repository, open the project folder in your terminal, and run:
```bash
npm install
```

### 3. Setup Environment Variables
Create a file named `.env` in the root folder of the project and add your Gemini API Key:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If you do not have a Gemini API key or leave it blank, the project will automatically start in **Simulator Mode** so it remains 100% functional for testing).*

### 4. Run the Development Server
Start the server using nodemon:
```bash
npm run dev
```

When you start the server:
* It will initialize the SQLite database (`database.sqlite`) and seed the 70 menu items.
* **It will automatically open two tabs in your browser:**
  * **Customer Chat:** `http://localhost:3000/customer.html` (The WhatsApp chatbot interface)
  * **Admin Dashboard:** `http://localhost:3000/admin.html` (Flat session auditor, menu editor, and token stats)

---

## 🛠️ Troubleshooting & Common Errors

If you run into errors while running the project, here is how to quickly resolve them:

### 1. "Error: Address already in use :::3000" (Port Busy)
* **Why it happens:** Another process (like another server or app) is already using port 3000 on your machine.
* **How to resolve:** Change the port in your `.env` file to any other number (e.g., `PORT=3001` or `PORT=8080`) and restart the server:
  ```env
  PORT=3001
  ```

### 2. "⚠️ Error: Failed to connect to server" (Gemini 503 Overload)
* **Why it happens:** Google's free-tier Gemini API servers occasionally experience temporary spikes in traffic, returning a `503 Service Unavailable` error.
* **How to resolve:** **You don't need to do anything!** The server has built-in graceful fallback handling. If the Gemini API fails, it instantly falls back to **Simulator Mode** in the background so the chat is never interrupted. It will automatically switch back to Live Gemini Mode on your next message once Google's servers recover.

### 3. Wiping Old Chat Data for a Fresh Test
* **Why it happens:** You want to clear out previous test sessions, old conversation logs, and users from your database to start fresh.
* **How to resolve:** Run the helper reset script in your terminal before launching the server:
  ```bash
  node reset_db.js
  ```
  *(This clears the logs and sessions, but preserves all your custom menu pricing and availability edits).*

### 4. SQLite3 Installation Issues on Windows/Mac
* **Why it happens:** Rarely, node-sqlite3 binary compilation fails if your machine lacks C++ build tools.
* **How to resolve:** Run the rebuild command to fetch pre-compiled binaries:
  ```bash
  npm rebuild sqlite3
  ```
