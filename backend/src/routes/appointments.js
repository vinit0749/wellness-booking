import { Router } from "express";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";

const router = Router();

const TIME_SLOTS = ["09:00", "10:00", "11:30", "14:00", "16:00"];

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function timeInIndia() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function isFutureSlot(date, time) {
  const today = todayInIndia();
  return date > today || (date === today && time > timeInIndia());
}

function futureAppointmentFilter() {
  const today = todayInIndia();

  return {
    $or: [
      { date: { $gt: today } },
      { date: today, time: { $gt: timeInIndia() } },
    ],
  };
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function validPhone(phone) {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function validClientName(name) {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.trim().length <= 100
  );
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({
      message: "That time slot is already booked. Please choose another.",
    });
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: "Invalid appointment data." });
  }

  console.error("Appointment API error:", error.message);
  return res.status(500).json({ message: "Something went wrong." });
}

// GET /api/appointments — list appointments for both sides of the app
router.get("/", async (_req, res) => {
  try {
    const appointments = await Appointment.find({
      isCancelled: false,
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/appointments/availability?date=YYYY-MM-DD
router.get("/availability", async (req, res) => {
  const { date } = req.query;

  if (!validDate(date)) {
    return res.status(400).json({ message: "Provide a valid date." });
  }

  if (date < todayInIndia()) {
    return res.status(400).json({ message: "Choose today or a future date." });
  }

  try {
    const booked = await Appointment.find({
      date,
      isCancelled: false,
    }).select("time -_id");

    const occupied = new Set(booked.map((item) => item.time));
    const today = todayInIndia();
    const currentTime = timeInIndia();
    const slots = TIME_SLOTS.map((time) => ({
      time,
      available:
        !occupied.has(time) &&
        (date > today || (date === today && time > currentTime)),
    }));

    res.json({ date, slots });
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/appointments — client booking
router.post("/", async (req, res) => {
  const { clientName, phone, date, time } = req.body || {};

  if (!validClientName(clientName) || !validPhone(phone)) {
    return res.status(400).json({
      message: "Enter a client name and a valid phone number.",
    });
  }

  if (!validDate(date) || !isFutureSlot(date, time)) {
    return res.status(400).json({
      message: "Choose a valid date today or in the future.",
    });
  }

  if (!TIME_SLOTS.includes(time)) {
    return res.status(400).json({
      message: "Choose one of the available consultation times.",
    });
  }

  try {
    const appointment = await Appointment.create({
      clientName: clientName.trim(),
      phone: phone.trim(),
      date,
      time,
      status: "Booked",
      confirmationStatus: "Pending",
      isCancelled: false,
    });

    res.status(201).json(appointment);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/appointments/manual — nutritionist adds an appointment
router.post("/manual", async (req, res) => {
  const { clientName, phone = "", date, time, status = "Booked" } =
    req.body || {};

  if (!validClientName(clientName)) {
    return res.status(400).json({
      message: "Enter a client name of 1 to 100 characters.",
    });
  }

  if (typeof phone !== "string" || (phone && !validPhone(phone))) {
    return res.status(400).json({ message: "Enter a valid phone number." });
  }

  if (
    !validDate(date) ||
    !TIME_SLOTS.includes(time) ||
    (status === "Booked" && !isFutureSlot(date, time))
  ) {
    return res.status(400).json({
      message: "Choose a valid future date and consultation time.",
    });
  }

  if (!["Booked", "Done", "No-show"].includes(status)) {
    return res.status(400).json({ message: "Invalid appointment status." });
  }

  try {
    const appointment = await Appointment.create({
      clientName: clientName.trim(),
      phone: phone.trim(),
      date,
      time,
      status,
      confirmationStatus: "Pending",
      isCancelled: false,
    });

    res.status(201).json(appointment);
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/appointments/:id/status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }

  if (!["Booked", "Done", "No-show"].includes(status)) {
    return res.status(400).json({ message: "Invalid appointment status." });
  }

  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: id, isCancelled: false },
      { $set: { status } },
      { new: true, runValidators: true },
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    res.json(appointment);
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/appointments/:id/confirm
router.patch("/:id/confirm", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: id,
        isCancelled: false,
        status: "Booked",
        ...futureAppointmentFilter(),
      },
      { $set: { confirmationStatus: "Confirmed" } },
      { new: true, runValidators: true },
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Upcoming booked appointment not found.",
      });
    }

    res.json(appointment);
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/appointments/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }

  try {
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: id,
        isCancelled: false,
        status: "Booked",
        ...futureAppointmentFilter(),
      },
      { $set: { isCancelled: true } },
      { new: true, runValidators: true },
    );

    if (!appointment) {
      return res.status(400).json({
        message: "Only upcoming booked appointments can be cancelled.",
      });
    }

    res.json({ message: "Appointment cancelled.", appointment });
  } catch (error) {
    handleError(res, error);
  }
});

// PATCH /api/appointments/:id/reschedule
router.patch("/:id/reschedule", async (req, res) => {
  const { id } = req.params;
  const { date, time } = req.body || {};

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid appointment ID." });
  }

  if (
    !validDate(date) ||
    !TIME_SLOTS.includes(time) ||
    !isFutureSlot(date, time)
  ) {
    return res.status(400).json({
      message: "Choose a valid future date and consultation time.",
    });
  }

  try {
    // Updating the same document is atomic. If the unique slot index
    // rejects the new slot, the original appointment remains unchanged.
    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: id,
        isCancelled: false,
        status: "Booked",
        ...futureAppointmentFilter(),
      },
      {
        $set: {
          date,
          time,
          confirmationStatus: "Pending",
        },
      },
      { new: true, runValidators: true },
    );

    if (!appointment) {
      return res.status(400).json({
        message: "Only upcoming booked appointments can be rescheduled.",
      });
    }

    res.json(appointment);
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
