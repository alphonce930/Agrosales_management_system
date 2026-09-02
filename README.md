# Golden Agrochemicals Management & Sales System

A full-stack ERP-style agrochemical management platform with customer management, sales, lending, payments, receipts, staff verification, and analytics.

## Stack

- Frontend: React + Vite + Tailwind + Recharts
- Backend: Node.js + Express + MySQL
- Auth: JWT + bcrypt

## Project structure

```bash
golden-agrochemicals/
├── frontend/
├── backend/
├── README.md
└── .gitignore
```

## Setup

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure environment

Create `.env` files based on `.env.example` in both frontend and backend.

### 3. Start backend

```bash
cd backend
npm run dev
```

### 4. Start frontend

```bash
cd frontend
npm run dev
```

## Default admin

- Email: admin@goldenagro.com
- Password: Admin@123

## Notes

This is a scaffolded implementation designed to be extended into a complete production-ready system matching the requirements in the provided spec.
