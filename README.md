# PG Explorer

PG Explorer is a full‑stack web app for finding and managing PG (Paying Guest) accommodations.

- **Students** can search PGs, favorite listings, book rooms, and receive notifications.
- **Owners** can add/manage PG listings, view bookings, and chat with students.
- **Admins** can moderate PG listings, manage users (block/unblock), and publish announcements.

## Repo structure

- `pgexplorer-backed/` – Node.js/Express + MongoDB API + Socket.IO
- `pgexplorer-frontend/` – React (Create React App) client

## Tech stack

- **Backend:** Node.js, Express, Mongoose (MongoDB), JWT auth, Multer uploads, Socket.IO
- **Frontend:** React, react-router, Axios, Bootstrap

## Local development

### 1) Backend (API)

From the repo root:

```bash
npm --prefix pgexplorer-backed install
```

Create `pgexplorer-backed/.env` (this file is ignored by git). Example:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
FRONTEND_ORIGIN=http://localhost:3001

# Optional (for Cloudinary uploads). If not set, local /uploads is used.
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
```

Start the backend:

```bash
npm --prefix pgexplorer-backed start
```

API base URL (default): `http://localhost:5000/api`

### 2) Frontend (React)

Install and start:

```bash
npm --prefix pgexplorer-frontend install
npm --prefix pgexplorer-frontend start
```

The frontend runs on `http://localhost:3001` (or the next free port).

Optional: to override the API URL, set:

```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

## Key features

### Roles

- `student`, `owner`, `admin`

### Admin account creation

Admin registration is blocked from the public UI. Create an admin from the backend:

```bash
npm --prefix pgexplorer-backed run create-admin
```

Follow the prompts in the terminal to set email/password.

### PG moderation + uploads

- Owners add PGs with **images** and a **property paper** document.
- Uploads use **Cloudinary** if configured; otherwise they are served locally from `/uploads`.
- Admin moderation is available under the Admin Panel (`/admin/*`).

### Notifications

- Real‑time updates are delivered via **Socket.IO**.
- The client also syncs via API to ensure reliability when reconnecting.

## Common commands

### Backend

- `npm --prefix pgexplorer-backed start` – start server
- `npm --prefix pgexplorer-backed run dev` – start with nodemon
- `npm --prefix pgexplorer-backed run create-admin` – create admin user

### Frontend

- `npm --prefix pgexplorer-frontend start` – dev server
- `npm --prefix pgexplorer-frontend run build` – production build

## Notes

- Do not commit `.env` files (already ignored in `.gitignore`).
- If you change frontend port/origin, update `FRONTEND_ORIGIN` in backend `.env`.
