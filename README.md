# BuildForge Mini

Full-stack challenge app for the BuildForge Core Developer Track.

## Features

- Auth with sign up, sign in, signed HTTP-only session cookies, and PBKDF2 password hashing
- Role-filtered task list for developers and admins
- Developer submission form with pending, approved, and rejected status tracking
- Admin review panel with approve/reject actions and decision notes
- Responsive single-page UI served by a Node backend
- File-backed JSON storage for easy review and deployment

## Run Locally

```bash
npm start
```

Open `http://localhost:3000`.

Demo accounts:

- Developer: `dev@buildforge.dev` / `Dev12345!`
- Admin: `admin@buildforge.dev` / `Admin123!`

## API

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/me`
- `GET /api/tasks`
- `GET /api/submissions`
- `POST /api/submissions`
- `PATCH /api/submissions/:id/review`

## Deployment Notes

This app uses only built-in Node modules. Deploy it to Render, Railway, Fly.io, or any Node host with:

- Build command: none
- Start command: `npm start`
- Environment: `SESSION_SECRET=<long random string>`

For a production database, replace `data/db.json` with Postgres or another managed store while keeping the API contract intact.
