# THE RACE 🏎️
### Pencil game

Welcome to **THE RACE**, a high-speed vector racing game where strategy meets simplicity. Inspired by the classic paper-and-pencil game, reimagined for the modern web with real-time multiplayer!

![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen?style=for-the-badge)
[Play now at the-race-pencil-game.web.app](https://the-race-pencil-game.web.app)

---

## 🎮 Features

- **Multiplayer for everyone**: Play locally with friends on the same screen or create an online room for up to 8 players.
- **Dynamic Tracks**: Every race is unique! The track adjusts its width based on the number of racers.
- **Pencil & Paper Aesthetic**: A clean, sketchy design that feels like it was drawn right on your notebook.
- **Real-time Synchronization**: Powered by Firebase Firestore for a seamless online experience.
- **Analytics Integrated**: We use Google Analytics to keep improving your racing experience.

## 🕹️ How to Play

The Race is based on **Vector Racing** logic:
1. **Your Velocity**: Your car maintains its speed from the previous turn.
2. **Decisions**: Each turn, you can choose to:
   - **Accelerate**: Increase speed in your current direction.
   - **Brake**: Decrease speed.
   - **Turn**: Change direction while maintaining or adjusting speed.
3. **The Goal**: Reach the finish line 🏁 first without crashing into the walls! If you crash, your speed resets to 0.

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
