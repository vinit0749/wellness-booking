# Wellness Booking

A mobile-first appointment booking app for a nutritionist, with a client booking experience and a nutritionist dashboard backed by a shared API and database.

## Features

### Client experience
- View appointments and book an available date and time.
- Enter client name and phone number.
- Prevent double-booking of an active appointment slot.
- View upcoming and past appointments.
- Confirm attendance, reschedule, or cancel an upcoming appointment.
- Display dates and times in India Standard Time (IST).

### Nutritionist dashboard
- View appointments with client name, phone number, date, time, and status.
- Filter appointments for today.
- Manually add an appointment.
- Update appointment status: `Booked`, `Done`, or `No-show`.
- See attendance confirmation separately from appointment outcome.

### Data and validation
- Shared appointment data between the client app and dashboard.
- Server-side validation for booking and appointment changes.
- A unique database index prevents two active appointments from occupying the same date and time.
- Seed script for the five assignment-provided sample appointments.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose

## Sample data

The seed script contains the five appointments specified in the assignment:

| Client | Phone | Date | Time | Status |
|---|---|---|---|---|
| Riya Shah | `98200 11111` | 2026-10-24 | 10:00 | Booked |
| Arjun Mehta | `98200 22222` | 2026-10-24 | 11:30 | Booked |
| Riya Shah | `9820011111` | 2026-10-25 | 16:00 | Booked |
| Meera Iyer | Not provided | 2026-10-23 | 09:00 | Done |
| Kabir Rao | `98200 33333` | 2026-10-22 | 14:00 | No-show |

The sample dates and the missing phone number are intentionally preserved as provided in the assignment. The seed script is located at `backend/src/scripts/seed.js`.

## Project structure

```text
wellness-booking/
├── README.md
├── .gitignore
├── backend/
│   ├── src/
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   └── scripts/         # Seed script
│   └── api/                 # API entry point
└── frontend/
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        └── services/
```

## Run locally

Use two terminals from the repository root.

### 1. Backend

```powershell
cd backend
npm install
```

Create `backend/.env` with your MongoDB connection string:

```dotenv
MONGODB_URI=your_mongodb_connection_string
```

Start the backend:

```powershell
npm run dev
```

The backend exposes the API under `/api`. The health endpoint is `/api/health`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env` with the local backend URL:

```dotenv
VITE_API_BASE_URL=http://localhost:5000
```

If your backend uses a different local port, update the URL accordingly. Start the frontend:

```powershell
npm run dev
```

Open the local URL printed by Vite in the terminal.

> Keep real `.env` files out of Git. Never commit database credentials or other secrets.

## Notes

- Attendance confirmation is separate from appointment status. Confirming attendance does not automatically mark an appointment as completed.
- The app includes the attendance confirmation workflow, but it does not send real WhatsApp messages. Automated WhatsApp reminders would require a messaging provider and configuration.
- See the separate assignment documentation for the approach, assumptions, additional decisions, AI corrections, and detailed setup notes.
