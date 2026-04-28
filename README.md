# StoryBook

StoryBook is a gothic interactive web experience built with vanilla HTML, CSS, and JavaScript on the front end, and an Express + MongoDB backend for ticket verification, sessions, and player progress.

The app includes:

- A ticket login flow at `qr-login.html`
- The main story experience at `storybook.html`
- Easter egg tracking, gem rewards, profiles, and a leaderboard
- Admin utilities for creating and migrating users
- A loading shield, ambient audio, and mobile-friendly interaction handling

## Tech Stack

- Frontend: HTML5, JavaScript, Tailwind CSS output in `dist/output.css`
- Backend: Node.js, Express, MongoDB, Mongoose
- Other libraries: `cors`, `dotenv`, `bcryptjs`

## Project Structure

```text
admin/               Admin pages and maintenance scripts
assests/             Static media files
dist/                Compiled CSS output
models/              Mongoose models
index.html           Trial or entry page
qr-login.html        Ticket login page
storybook.html       Main story experience
script.js            Frontend behavior
server.js            Express server and API routes
style.css            Tailwind input stylesheet
story.txt            Story content
users.json           Migration source data for admin scripts
```

## Requirements

- Node.js 16 or newer
- MongoDB connection string

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
PORT=8080
MONGODB_URI=your_mongodb_connection_string
```

`server.js` also accepts `MONGODB-URL` if that is what your environment uses.

3. Build the CSS:

```bash
npm run css:build
```

4. Start the server:

```bash
npm start
```

The `start` script builds CSS and runs `server.js`. The `dev` script does the same.

## Available Scripts

- `npm start` - build CSS and start the server
- `npm run dev` - build CSS and start the server
- `npm run server` - start the server without rebuilding CSS
- `npm run css:build` - compile `style.css` into `dist/output.css`
- `npm run css:watch` - watch `style.css` and rebuild on changes
- `npm run admin:create-user` - create a ticket user from the command line
- `npm run admin:lookup-user` - look up a user by access code
- `npm run admin:migrate-users` - migrate records from `users.json` into MongoDB
- `npm run admin:backfill-users` - backfill normalized user fields

## API Overview

The main server exposes these endpoints:

- `GET /api/health`
- `GET /api/session`
- `POST /api/logout`
- `POST /api/ticket/verify`
- `GET /api/easter-eggs/progress`
- `POST /api/easter-eggs/unlock`
- `POST /api/easter-eggs/purchase-unlock`
- `POST /api/add-gems`
- `GET /api/leaderboard`
- `GET /api/user/me`
- `POST /api/user/profile-pic`
- `POST /api/user/reset-data`

The server also redirects `/` to `qr-login.html` and serves `storybook.html` directly.

## Data Model

The `TicketUser` model stores:

- Name, roll number, class section, and access code
- Normalized lookup fields
- Username and profile picture
- Easter egg progress and gem balance
- One-time reward tracking
- A `used` flag for access-code verification

Sessions are stored in `TicketSession` with a TTL so expired sessions are removed automatically.

## Admin Tools

The `admin/` folder contains helper scripts for managing users:

- `create-user.js`
- `lookup-user.js`
- `migrate-users.js`
- `backfill-normalized.js`
- `fix-null-usernames.js`

There is also a browser-based admin screen in `admin/admin.html`.

## Notes

- `users.json` is used as import data for migration, not as the live runtime database.
- The app is built around MongoDB persistence, so a working database connection is required for login and gameplay features.
