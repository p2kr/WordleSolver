# 🧩 Wordle Solver

A mathematically optimal, high-performance **Wordle Solver** built as a responsive desktop application. It calculates the expected information gain (entropy) of every word in real-time, helping you solve any Wordle puzzle in the fewest guesses possible.

---

## ✨ Features

1. **Information Theory-Based Solver**:
   - Calculates the **entropy (expected information gain)** for each word in real-time.
   - Recommends the **Best Info Guess** (words like `salet` that maximize narrowing down letters) and **Best Possible Solution** (words matching current grid feedback that can actually win the puzzle).
   - Offloads mathematical computations to a multi-threaded **Web Worker** (`src/utils/solver.worker.ts`) to maintain a butter-smooth 60fps main UI thread.
2. **List Virtualization (Windowing)**:
   - Implements a custom, high-performance DOM virtual list scrolling component in [SuggestionsPanel.tsx](src/components/SuggestionsPanel.tsx) to only render visible items in the DOM.
   - Smoothly handles all 12,972 allowed Wordle words with zero scrolling lag.
3. **Interactive Board & Keyboard**:
   - Clean, modern glassmorphic dashboard interface supporting both **Light** and **Dark** modes.
   - Interactive 6-row Wordle grid supporting letter insertions, deletions, and backtracking.
   - Clickable letter tiles: Cycle states between **Absent (Gray)**, **Present (Yellow)**, and **Correct (Green)**.
   - Full keyboard shortcuts (arrow keys, backspace, typing, enter).
4. **Lightweight Desktop Wrapper**:
   - Built using **Tauri v2** to package the application as a standalone desktop app.
   - Footprint is optimized to **~8.3 MB** by using the system's native WebView2 rendering engine, instead of packaging a full Chromium instance (saving ~170MB over Electron).

---

## 📂 Project Structure

```
├── dist/                   # Compiled frontend assets
├── src/                    # React frontend application source
│   ├── components/         # Board grid, suggested lists, UI elements
│   ├── data/               # Word database (solutions & allowed guesses)
│   ├── utils/              # Solver logic, pattern calculation, Web Worker
│   ├── App.tsx             # Application state coordinator
│   └── index.css           # Styling system & theme custom properties
├── src-tauri/              # Rust desktop backend wrapper (Tauri)
│   ├── src/                # Tauri backend main loop & initialization
│   ├── .cargo/config.toml  # Cargo proxy SSL configurations
│   └── tauri.conf.json     # Window sizes, permissions, and build targets
└── package.json            # Scripts & project dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Yarn](https://yarnpkg.com/)
- [Rust & Cargo](https://rustup.rs/) (Only required if building the desktop app wrapper)

### Installation
Clone the repository and install packages:
```bash
yarn install
```

---

## 🛠️ Development Scripts

- **Run Web app locally**:
  ```bash
  yarn dev
  ```
  Opens the app in your browser at `http://localhost:5173`.

- **Run Desktop app locally**:
  ```bash
  yarn tauri dev
  ```
  Launches the application inside a native desktop frame with live hot-reloading.

- **Check Code Quality (ESLint & Typecheck)**:
  ```bash
  yarn lint
  ```

---

## 📦 Production Builds

- **Build Web production build**:
  ```bash
  yarn build
  ```
  Generates optimized static web files in `dist/`.

- **Build Desktop app binaries**:
  ```bash
  yarn tauri build
  ```
  Compiles the Rust binary and packages the desktop app:
  - **Standalone Executable**: `src-tauri/target/release/app.exe` (~8.3 MB)
  - **Setup Installer**: `src-tauri/target/release/bundle/nsis/WordleSolver_0.1.0_x64-setup.exe` (~1.9 MB)
