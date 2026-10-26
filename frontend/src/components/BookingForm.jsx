import { useEffect, useState } from "react";
import { CalendarDays, Clock3, LoaderCircle } from "lucide-react";
import { getAvailableSlots, createAppointment } from "../services/appointments";

function getToday() {
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

function formatTime(time) {
  return new Date(`2026-01-01T${time}:00+05:30`).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default function BookingForm({ onBooked }) {
  const [date, setDate] = useState(getToday());
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedTime("");
      setError("");

      try {
        const result = await getAvailableSlots(date);

        if (!ignore) {
          setSlots(result.slots);
        }
      } catch (err) {
        if (!ignore) {
          setSlots([]);
          setError(err.message || "Couldn't load available times.");
        }
      } finally {
        if (!ignore) {
          setLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      ignore = true;
    };
  }, [date]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedTime) {
      setError("Please choose an available time.");
      return;
    }

    setSubmitting(true);

    try {
      await createAppointment({
        clientName: clientName.trim(),
        phone: phone.trim(),
        date,
        time: selectedTime,
      });
    } catch (err) {
      setError(
        err.message || "We couldn't complete your booking. Please try again.",
      );

      try {
        const result = await getAvailableSlots(date);
        setSlots(result.slots);
      } catch {
        // Preserve the booking error if availability cannot be refreshed.
      }
      setSubmitting(false);
      return;
    }

    setMessage("Your appointment is booked!");
    setClientName("");
    setPhone("");
    setSelectedTime("");

    try {
      const result = await getAvailableSlots(date);
      setSlots(result.slots);
    } catch (err) {
      setError(
        err.message ||
          "Your booking is saved, but availability could not be refreshed.",
      );
    }

    try {
      if (onBooked) await onBooked();
    } catch (err) {
      setError(
        err.message || "Your booking is saved, but the schedule did not refresh.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="booking-date"
          className="mb-2 flex items-center gap-2 text-sm font-medium text-[#35463b]"
        >
          <CalendarDays size={16} />
          Choose a date
        </label>

        <input
          id="booking-date"
          type="date"
          min={getToday()}
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setMessage("");
          }}
          required
          className="w-full rounded-xl border border-[#e2e5dc] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#7b9278] focus:ring-2 focus:ring-[#7b9278]/15"
        />
      </div>

      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#35463b]">
          <Clock3 size={16} />
          Available times
        </p>

        {loadingSlots ? (
          <p className="flex items-center gap-2 py-3 text-sm text-[#778078]">
            <LoaderCircle size={16} className="animate-spin" />
            Checking availability...
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl bg-[#f4f4ee] p-4 text-sm text-[#778078]">
            No time slots are available for this date. Please choose another.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                onClick={() => {
                  setSelectedTime(slot.time);
                  setMessage("");
                  setError("");
                }}
                className={`rounded-xl border px-3 py-3 text-sm transition ${
                  !slot.available
                    ? "cursor-not-allowed border-[#eeeeea] bg-[#f5f5f2] text-[#b4b7b0] line-through"
                    : selectedTime === slot.time
                      ? "border-[#526b55] bg-[#526b55] text-white"
                      : "border-[#e2e5dc] bg-white text-[#35463b] hover:border-[#8ca087]"
                }`}
              >
                {formatTime(slot.time)}
                {!slot.available && (
                  <span className="mt-1 block text-xs no-underline">
                    Unavailable
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="client-name"
          className="mb-2 block text-sm font-medium text-[#35463b]"
        >
          Your name
        </label>
        <input
          id="client-name"
          type="text"
          autoComplete="name"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Enter your full name"
          required
          maxLength={100}
          className="w-full rounded-xl border border-[#e2e5dc] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a2a69e] focus:border-[#7b9278] focus:ring-2 focus:ring-[#7b9278]/15"
        />
      </div>

      <div>
        <label
          htmlFor="client-phone"
          className="mb-2 block text-sm font-medium text-[#35463b]"
        >
          Phone number
        </label>
        <input
          id="client-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Enter your phone number"
          required
          maxLength={20}
          className="w-full rounded-xl border border-[#e2e5dc] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#a2a69e] focus:border-[#7b9278] focus:ring-2 focus:ring-[#7b9278]/15"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl bg-[#edf4e9] p-3 text-sm text-[#405d42]"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || loadingSlots || !selectedTime}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#526b55] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#405743] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <LoaderCircle size={17} className="animate-spin" />}
        {submitting ? "Booking..." : "Confirm appointment"}
      </button>

      <p className="text-center text-xs leading-5 text-[#858b82]">
        Your selected time is checked again when you book, so another client
        cannot book the same slot.
      </p>
    </form>
  );
}
