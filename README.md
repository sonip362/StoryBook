# 🏰 StoryBook

**A gothic, interactive digital storybook experience with gamified exploration and secure access.**

StoryBook is a premium web application that blends immersive storytelling with interactive elements. Users navigate through a hauntingly beautiful interface, unlocking "Easter Eggs" as they explore the lore of the castle and its inhabitants.

---

## ✨ Features

- **🕯️ Immersive Atmosphere**: Custom gothic design with Cinzel and Cormorant Garamond typography, floating particles, and ambient background music.
- **🧛 Interactive Storytelling**: Dynamic content with custom CSS shapes and interactive character elements.
- **🐣 Easter Egg System**: A gamified exploration system. Discover hidden secrets to unlock progress, tracked and saved to your profile.
- **🔐 Secure Access**: QR-code based ticket login system with session persistence and "Remember Me" functionality.
- **🛡️ Loading Shield**: A custom-themed transition overlay that elegantly manages backend cold-starts (Render.com) while keeping the user immersed.
- **📱 Responsive Design**: Fully optimized for mobile and desktop, ensuring the atmosphere is preserved on any screen.
- **🛠️ Admin Panel**: Backend tools for administrators to create users, manage tickets, and migrate data.

---

## 🛠️ Technology Stack

### Frontend
- **Plain HTML5/JS**: Core structure and logic.
- **Vanilla CSS + Tailwind CSS**: Modern styling with a custom design system.
- **Particles.js**: For ambient visual effects.
- **Google Fonts**: Cinzel & Cormorant Garamond.

### Backend
- **Node.js & Express**: API and server-side logic.
- **MongoDB & Mongoose**: Secure data storage for users, sessions, and game progress.
- **Bcrypt.js**: Security for access code hashing.
- **CORS**: Configured for cross-origin communication between GitHub Pages (frontend) and Render (backend).

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MongoDB](https://www.mongodb.com/) (Local instance or Atlas URI)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/storybook.git
   cd storybook
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   PORT=8080
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Build CSS**:
   ```bash
   npm run css:build
   ```

5. **Start the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## 📂 Project Structure

```text
├── admin/            # Admin tools and user management scripts
├── assests/          # Media, images, and audio files
├── dist/             # Compiled Tailwind CSS output
├── models/           # Mongoose schemas (User, Session)
├── index.html        # Trial-page entry point
├── or-login.html     # Secure login portal
├── storybook.html    # The main interactive experience
├── server.js         # Express server and API endpoints
├── script.js         # Main frontend logic
└── trial-script.js   # Logic for the trial preview page
```

---

## 🔑 Admin Commands

The project includes utility scripts for managing the system:

- **Create a User**: `npm run admin:create-user`
- **Lookup User Progress**: `npm run admin:lookup-user`
- **Migrate Database**: `npm run admin:migrate-users`

---

## 📜 Metadata & SEO
- **Title**: StoryBook — An Interactive Gothic Legend
- **Description**: Experience the mystery. Explore the castle, find the eggs, and unlock the story.

---

*Built with  ❤️ by the StoryBook Team.*
