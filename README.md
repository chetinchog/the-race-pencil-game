# THE RACE 🏎️
### Pencil game

Welcome to **THE RACE**, a high-speed vector racing game where strategy meets simplicity. Inspired by the classic paper-and-pencil game, reimagined for the modern web with a professional camera system and real-time multiplayer!

![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)
[Play now at the-race-pencil-game.web.app](https://the-race-pencil-game.web.app)

---

## 🎮 Features

### 🏁 Pro Racing Experience
- **Advanced Camera System**: Features direction-aware targeting (the 25% rule), smooth lerped following, and predictive lookahead to always keep you in the action.
- **Dynamic Navigation**: Zoom In/Out to plan your strategy or use the **GPS 🎯** button to snap back to your car instantly.
- **Immersive UI**: A full-screen racing map with a sleek horizontal bottom-bar for all your stats and controls.
- **Detailed History**: Every turn leaves a trail with small circles at each stop, helping you analyze your racing line and master the track.

### 🌐 Connectivity & Multiplayer
- **Multiplayer for everyone**: Play locally with friends on the same screen or create an online room for up to 8 players.
- **Real-time Synchronization**: Powered by Firebase Firestore for a seamless online experience across devices.
- **Dynamic Tracks**: The track width adjusts automatically based on the number of racers to ensure competitive play.

### 🎨 Aesthetic & Design
- **Pencil & Paper Aesthetic**: A clean, "sketchy" design with hand-drawn SVG car icons that feels like it was drawn right on your notebook.
- **Paper Texture**: Authentic dotted-paper background and subtle shadows to maintain the classic feel.

---

## 🕹️ How to Play

The Race is based on **Vector Racing** logic:
1. **Your Velocity**: Your car maintains its speed and direction from the previous turn.
2. **Decisions**: Each turn, you can:
   - **Accelerate/Brake**: Increase or decrease speed.
   - **Turn**: Change your vector direction.
3. **The Goal**: Reach the finish line 🏁 first!
4. **Crashes**: If you hit a wall, your speed resets to 0. Use your history circles to avoid making the same mistake twice!

---

## 🛠️ Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Backend/Database**: [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Analytics**: [Google Analytics](https://firebase.google.com/products/analytics)
- **Styling**: Vanilla CSS (Sketchy/Hand-drawn theme)

## 🚀 Development

### Prerequisites
- Node.js (v18+)
- Firebase Account (for online features)

### Local Setup
1. Clone the repo:
   ```bash
   git clone https://github.com/chetinchog/the-race-pencil-game.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

---

## 🛡️ Credits

Created with ❤️ by **iCTG**
*Powered by Antigravity*

---
© 2026 The Race
