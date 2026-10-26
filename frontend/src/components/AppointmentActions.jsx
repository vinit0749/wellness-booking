import { useEffect, useState } from "react";
import { CalendarDays, Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import {
  cancelAppointment,
  confirmAppointment,
  getAvailableSlots,
  rescheduleAppointment,
} from "../services/appointments";

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
  return new Date(`2026-01-01T${time}:00+05:30`).toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    },
  );
}

export default function AppointmentActions({ appointment, onChanged }) {
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(appointment.date);
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(appointment.time);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!rescheduling) return undefined;

    let ignore = false;

    async function loadSlots() {
      setLoadingSlots(true);
      setError("");

      try {
        const result = await getAvailableSlots(date);
        if (!ignore) {
          setSlots(
            result.slots.map((slot) => ({
              ...slot,
              available:
                slot.available ||
                (date === appointment.date && slot.time === appointment.time),
            })),
          );
        }
      } catch (loadError) {
        if (!ignore) {
          setSlots([]);
          setError(loadError.message || "Couldn't load available times.");
        }
      } finally {
        if (!ignore) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      ignore = true;
    };
  }, [appointment.date, appointment.time, date, rescheduling]);

  async function finishAction(action, successMessage) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await action();
      setRescheduling(false);
      setMessage(successMessage);
      await onChanged();
    } catch (actionError) {
      setError(actionError.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (!window.confirm("Cancel this appointment? Its time will be released.")) {
      return;
    }

    return finishAction(
      () => cancelAppointment(appointment._id),
      "Your appointment has been cancelled.",
    );
  }

  const buttonClass =
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#e2e5dc] bg-white px-3.5 text-xs font-semibold text-[#526653] transition hover:border-[#9aaa95] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="mt-4 border-t border-[#f0f0e9] pt-4">
      {appointment.confirmationStatus === "Confirmed" ? (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#456b52]">
          <Check size={14} />
          Attendance confirmed
        </p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            finishAction(
              () => confirmAppointment(appointment._id),
              "Your attendance is confirmed.",
            )
          }
          className={`${buttonClass} mb-3`}
        >
          {busy ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          Confirm attendance
        </button>
      )}

      {rescheduling ? (
        <div className="space-y-3 rounded-2xl bg-[#f7f8f3] p-3.5">
          <label className="block text-xs font-semibold text-[#405244]">
            Choose a new date
            <input
              type="date"
              min={getToday()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedTime("");
                setError("");
              }}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-[#e2e5dc] bg-white px-3 text-sm outline-none focus:border-[#7b9278] focus:ring-2 focus:ring-[#7b9278]/15"
            />
          </label>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#405244]">
              <CalendarDays size={14} />
              Available time
            </p>
            {loadingSlots ? (
              <p className="flex items-center gap-2 py-2 text-xs text-[#778078]">
                <LoaderCircle size={14} className="animate-spin" />
                Checking times…
              </p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-[#778078]">
                No available times. Choose another date.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`min-h-10 rounded-xl border px-2 text-xs font-medium transition ${
                      !slot.available
                        ? "cursor-not-allowed border-[#eeeeea] bg-[#f0f0eb] text-[#a8ada4]"
                        : selectedTime === slot.time
                          ? "border-[#526b55] bg-[#526b55] text-white"
                          : "border-[#e2e5dc] bg-white text-[#405244]"
                    }`}
                  >
                    {formatTime(slot.time)}
                    {!slot.available && (
                      <span className="mt-0.5 block text-[10px]">Booked</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRescheduling(false);
                setDate(appointment.date);
                setSelectedTime(appointment.time);
                setError("");
              }}
              className={buttonClass}
            >
              <X size={14} />
              Keep current time
            </button>
            <button
              type="button"
              disabled={busy || loadingSlots || !selectedTime}
              onClick={() =>
                finishAction(
                  () =>
                    rescheduleAppointment(
                      appointment._id,
                      date,
                      selectedTime,
                    ),
                  "Your appointment has been rescheduled.",
                )
              }
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[#456b52] px-4 text-xs font-semibold text-white transition hover:bg-[#365640] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <LoaderCircle size={14} className="animate-spin" />}
              Save new time
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDate(appointment.date);
              setSelectedTime(appointment.time);
              setRescheduling(true);
              setError("");
              setMessage("");
            }}
            className={buttonClass}
          >
            <RefreshCw size={14} />
            Reschedule
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleCancel}
            className={buttonClass}
          >
            <X size={14} />
            Cancel appointment
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-3 text-xs font-medium text-[#456b52]">
          {message}
        </p>
      )}
    </div>
  );
}
