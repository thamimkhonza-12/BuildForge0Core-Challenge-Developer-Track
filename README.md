# BuildForge Core Challenge – Developer Track

A compact full-stack “BuildForge mini” clone focused on authentication, role-based task management, developer submissions, and admin approval workflows.

---

# 🚀 Live Deployment

🌐 Render Deployment:  
https://buildforge0core-challenge-developer-track.onrender.com/

🎥 Loom Walkthrough:  
https://www.loom.com/share/ae67e57d937a4e349a2900478f08aa90

---

# 📂 Project Structure

```bash
buildforge-core-challenge-developer-track-design/
│
├── data/
├── public/
├── .gitignore
├── package.json
├── README.md
├── render.yaml
└── server.js
```

---

# 📖 Project Overview

This project was built as a lightweight full-stack application inspired by a simplified “BuildForge” platform. The main goal was to create a developer challenge workflow system with:

- Secure authentication
- Role-based access control
- Developer project submissions
- Admin review and approval workflows
- Persistent storage
- Responsive frontend design

The application uses pure Node.js with no external backend dependencies, making it lightweight, easy to understand, and simple to deploy.

---

# ⚙️ Backend Architecture

The backend is built entirely with Node.js native modules:

- `http`
- `fs`
- `path`
- `crypto`

The server handles:

- API routing
- Authentication
- Session management
- Static frontend serving
- Submission processing

No frameworks such as Express were used.

---

# 🔐 Authentication System

The authentication system includes:

- User registration
- User login
- Secure password hashing using PBKDF2
- Per-user salt generation
- Signed HTTP-only cookie sessions

This ensures user credentials and session data remain secure.

## Demo Roles

The app includes seeded demo accounts for testing:

| Role | Access |
|---|---|
| Developer | Submit projects/tasks |
| Admin | Review and manage submissions |

---

# 🗄️ Data Persistence

Instead of using a traditional database, the application stores data in lightweight JSON files located in the `data/` directory.

Stored data includes:

- Users
- Sessions
- Submissions

This approach keeps the project portable and easy to review.

---

# 👨‍💻 Developer Features

Developers can:

- View role-specific tasks
- Submit projects including:
  - Project title
  - GitHub repository URL
  - Live deployment URL
  - Submission notes

Every submission is initially marked as:

```text
Pending
```

---

# 🛠️ Admin Features

Admin users can:

- View all submissions
- Review developer projects
- Approve submissions
- Reject submissions
- Add review notes

Submission statuses include:

- Pending
- Approved
- Rejected

---

# 🎨 Frontend

The frontend was built using:

- HTML
- CSS
- Vanilla JavaScript

## UI Improvements

The interface includes:

- Responsive layouts
- Glass-style UI panels
- Dashboard cards
- Status badges
- Hover effects
- Mobile-friendly design
- Improved spacing and visual hierarchy

---

# ✅ Testing

The following workflows were tested locally:

- User authentication
- Developer submission flow
- Admin review flow
- Session handling
- Submission status updates
- JavaScript syntax validation

---

# 🚀 Deployment

The project was deployed on Render using:

- `render.yaml`
- `npm start`
- Generated `SESSION_SECRET`

---

# 🧰 Technologies Used

| Technology | Purpose |
|---|---|
| Node.js | Backend server |
| HTML/CSS/JavaScript | Frontend |
| PBKDF2 | Password hashing |
| JSON Storage | Lightweight persistence |
| Render | Deployment platform |

---

# 📌 Key Features

- Full authentication workflow
- Role-based access control
- Secure session handling
- Project submission management
- Admin approval system
- Responsive modern UI
- Zero external backend frameworks

---

# 📄 Running Locally

## Clone the Repository

```bash
git clone <your-repository-url>
```

## Navigate Into the Project

```bash
cd buildforge-core-challenge-developer-track-design
```

## Install Dependencies

```bash
npm install
```

## Start the Server

```bash
npm start
```

## Open in Browser

```bash
http://localhost:3000
```

---

# 📬 Final Notes

This project was designed to demonstrate strong full-stack fundamentals using minimal tooling while still delivering:

- Secure authentication
- Functional role-based workflows
- Clean UI/UX
- Deployment-ready architecture

The project intentionally avoids external backend frameworks to showcase understanding of core Node.js functionality, session management, and application architecture.