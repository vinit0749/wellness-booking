import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    status: {
      type: String,
      enum: ["Booked", "Done", "No-show"],
      default: "Booked",
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    confirmationStatus: {
      type: String,
      enum: ["Pending", "Confirmed"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

appointmentSchema.index(
  { date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { isCancelled: false },
  },
);

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
