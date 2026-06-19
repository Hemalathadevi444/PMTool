# Project Management Frontend

React + Vite frontend for the Project Management API. Includes **Login**, **Sign up**, and **Home** (dashboard) pages styled like ClickUp.

## Prerequisites

- Node.js 18+
- Backend running at `http://localhost:8000`

## Setup

```powershell
cd ProjectManagementFrontend
npm install
copy .env.example .env
npm run dev
```

Open **http://localhost:5173**

## Pages

| Route | Page |
|-------|------|
| `/login` | Welcome back — email/password login |
| `/signup` | Seconds to sign up — registration |
| `/` | Home dashboard — workspaces, projects, tasks |

## Environment

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Scripts

```powershell
npm run dev      # development server
npm run build    # production build
npm run preview  # preview production build
```

## Backend CORS

Ensure the backend `.env` includes the frontend origin:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Auth flow

1. Sign up or log in on `/signup` or `/login`
2. JWT is stored in `localStorage`
3. Protected routes redirect to `/login` if not authenticated
4. Home page loads workspaces, projects, and tasks from the API
