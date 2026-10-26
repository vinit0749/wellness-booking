import dotenv from "dotenv";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";

dotenv.config();

const sampleAppointments = [
  {
    clientName: "Riya Shah",
    phone: "98200 11111",
    date: "2026-10-24",
    time: "10:00",
    status: "Booked",
  },
  {
    clientName: "Arjun Mehta",
    phone: "98200 22222",
    date: "2026-10-24",
    time: "11:30",
    status: "Booked",
  },
  {
    clientName: "Riya Shah",
    phone: "9820011111",
    date: "2026-10-25",
    time: "16:00",
    status: "Booked",
  },
  {
    clientName: "Meera Iyer",
    phone: "",
    date: "2026-10-23",
    time: "09:00",
    status: "Done",
  },
  {
    clientName: "Kabir Rao",
    phone: "98200 33333",
    date: "2026-10-22",
    time: "14:00",
    status: "No-show",
  },
];

async function seedAppointments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    for (const appointment of sampleAppointments) {
      await Appointment.updateOne(
        {
          clientName: appointment.clientName,
          date: appointment.date,
          time: appointment.time,
        },
        {
          $set: {
            phone: appointment.phone,
            status: appointment.status,
            isCancelled: false,
          },
          $setOnInsert: {
            clientName: appointment.clientName,
            date: appointment.date,
            time: appointment.time,
          },
        },
        { upsert: true },
      );
    }

    console.log(`Seeded ${sampleAppointments.length} sample appointments`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAppointments();
