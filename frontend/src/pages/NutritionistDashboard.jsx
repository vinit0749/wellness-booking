import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import {
  getAppointments,
  getAvailableSlots,
  updateAppointmentStatus,
  addManualAppointment,
} from "../services/appointments";

const STATUSES = ["Booked", "Done", "No-show"];

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

function getCurrentDateTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function getAppointmentIndicator(appointment, currentDateTime) {
  const isPast =
    `${appointment.date}T${appointment.time}:00` <= currentDateTime;

  if (isPast) {
    if (appointment.status === "Done") return "Completed";
    if (appointment.status === "No-show") return "Missed";
    return "Outcome needed";
  }

  return appointment.confirmationStatus === "Confirmed"
    ? "Confirmed"
    : "Awaiting confirmation";
}

function formatDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
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

function StatusBadge({ status }) {
  const styles = {
    Booked: "bg-[#edf3e9] text-[#456b52] ring-[#dce8d9]",
    Done: "bg-sky-50 text-sky-700 ring-sky-100",
    "No-show": "bg-amber-50 text-amber-700 ring-amber-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${styles[status] || styles.Booked}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function ConfirmationBadge({ label }) {
  const styles = {
    Confirmed: "bg-[#edf3e9] text-[#456b52] ring-[#dce8d9]",
    Completed: "bg-sky-50 text-sky-700 ring-sky-100",
    Missed: "bg-amber-50 text-amber-700 ring-amber-100",
    "Awaiting confirmation": "bg-[#f7f2e8] text-[#80632f] ring-[#ede3ce]",
    "Outcome needed": "bg-[#f7f2e8] text-[#80632f] ring-[#ede3ce]",
  };
  const Icon =
    label === "Missed" ? X : label === "Completed" || label === "Confirmed"
      ? CheckCircle2
      : Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${styles[label]}`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

function NutritionistDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  const [manualSlots, setManualSlots] = useState([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);
  const [manualSlotsError, setManualSlotsError] = useState("");

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState("");
  const availabilityRequest = useRef(0);

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getAppointments();
      setAppointments(data);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    getAppointments()
      .then((data) => {
        if (!ignore) {
          setAppointments(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || "Unable to load appointments.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setFeedback("");
    await loadAppointments();
  }

  async function handleStatusChange(id, status) {
    setUpdatingId(id);
    setFeedback("");
    setFormError("");

    try {
      await updateAppointmentStatus(id, status);
      await loadAppointments();
      setFeedback("Appointment status updated.");
    } catch (err) {
      setFormError(err.message || "Couldn't update the appointment.");
    } finally {
      setUpdatingId("");
    }
  }

  async function loadManualAvailability(selectedDate) {
    const requestId = ++availabilityRequest.current;
    setLoadingManualSlots(true);
    setManualSlotsError("");

    try {
      const result = await getAvailableSlots(selectedDate);
      if (requestId === availabilityRequest.current) {
        setManualSlots(result.slots);
        setTime(result.slots.find((slot) => slot.available)?.time || "");
      }
    } catch (err) {
      if (requestId === availabilityRequest.current) {
        setManualSlots([]);
        setTime("");
        setManualSlotsError(
          err.message || "Couldn't load available consultation times.",
        );
      }
    } finally {
      if (requestId === availabilityRequest.current) {
        setLoadingManualSlots(false);
      }
    }
  }

  async function handleManualAdd(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setFormError("");

    try {
      await addManualAppointment({
        clientName: clientName.trim(),
        phone: phone.trim(),
        date,
        time,
        status: "Booked",
      });

      availabilityRequest.current += 1;
      await loadAppointments();
      setClientName("");
      setPhone("");
      setDate(getToday());
      setTime("");
      setManualSlots([]);
      setFormOpen(false);
      setFeedback("Appointment added successfully.");
    } catch (err) {
      setFormError(
        err.message || "Couldn't add the appointment. Please try again.",
      );
      loadManualAvailability(date);
    } finally {
      setSaving(false);
    }
  }

  const currentDateTime = getCurrentDateTime();
  const today = currentDateTime.slice(0, 10);

  const sortedAppointments = [...appointments].sort(
    (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
  );

  const visibleAppointments = todayOnly
    ? sortedAppointments.filter((appointment) => appointment.date === today)
    : sortedAppointments;

  const bookedCount = appointments.filter(
    (appointment) => appointment.status === "Booked",
  ).length;

  const doneCount = appointments.filter(
    (appointment) => appointment.status === "Done",
  ).length;

  const noShowCount = appointments.filter(
    (appointment) => appointment.status === "No-show",
  ).length;

  const todayCount = appointments.filter(
    (appointment) => appointment.date === today,
  ).length;

  const stats = [
    {
      label: "Booked",
      value: bookedCount,
      note: "Awaiting consultation",
      icon: CalendarDays,
      style: "bg-[#edf3e9] text-[#527454]",
    },
    {
      label: "Completed",
      value: doneCount,
      note: "Consultations done",
      icon: CheckCircle2,
      style: "bg-sky-50 text-sky-700",
    },
    {
      label: "No-shows",
      value: noShowCount,
      note: "Missed appointments",
      icon: Users,
      style: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-clip bg-[#faf9f6] text-[#283b30]">
      <header className="sticky top-0 z-20 border-b border-[#e9e9e1]/90 bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#456b52] text-white shadow-sm sm:h-11 sm:w-11">
              <CalendarDays size={21} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold tracking-tight sm:text-lg">
                Wellness Booking
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-[#788478] sm:text-xs">
                Nutritionist workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh appointments"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e2e5dc] bg-white px-3 text-sm font-medium transition hover:border-[#9aaa95] disabled:opacity-60 sm:h-11 sm:px-4"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-8 sm:pb-16 sm:pt-11">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#eaf0e5] px-5 py-7 sm:rounded-[34px] sm:px-9 sm:py-9 lg:px-12 lg:py-11">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full border-[32px] border-white/35 sm:h-72 sm:w-72 sm:border-[42px]" />
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d6e0d1] bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#55745a]">
                <CheckCircle2 size={14} />
                Your practice, in one place
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#73846f]">
                NUTRITIONIST WORKSPACE
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl lg:text-4xl">
                Your schedule.
                <br />
                <span className="font-serif font-normal italic text-[#527758]">
                  A little more organised.
                </span>
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#667765] sm:mt-4 sm:text-base sm:leading-7">
                Keep track of every consultation, update appointment outcomes,
                and make space for the people you care for.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const opening = !formOpen;
                setFormOpen(opening);
                setFormError("");
                setFeedback("");
                if (opening) {
                  loadManualAvailability(date);
                } else {
                  availabilityRequest.current += 1;
                  setLoadingManualSlots(false);
                }
              }}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#456b52] px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(54,86,64,0.16)] transition hover:-translate-y-0.5 hover:bg-[#365640] active:translate-y-0"
            >
              {formOpen ? <X size={17} /> : <Plus size={17} />}
              {formOpen ? "Close form" : "Add appointment"}
            </button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:mt-7 sm:grid-cols-3 sm:gap-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-[#e8e9df] bg-white p-4 shadow-[0_3px_12px_rgba(35,55,38,0.02)] sm:p-5"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.style}`}
                  >
                    <Icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#788478]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {loading ? "—" : item.value}
                    </p>
                  </div>
                  <span className="text-right text-[11px] leading-4 text-[#93998e] sm:hidden">
                    {item.note}
                  </span>
                </div>
                <p className="mt-3 hidden text-xs text-[#93998e] sm:block">
                  {item.note}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-7 rounded-3xl border border-[#e8e9df] bg-white px-4 py-4 sm:mt-8 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f1e7] text-[#987943]">
                <CalendarDays size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold">Today's schedule</p>
                <p className="mt-0.5 text-xs text-[#81877d]">
                  {loading
                    ? "Loading appointments…"
                    : `${todayCount} ${todayCount === 1 ? "appointment" : "appointments"} scheduled today`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTodayOnly((value) => !value)}
              aria-pressed={todayOnly}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition ${
                todayOnly
                  ? "bg-[#456b52] text-white"
                  : "border border-[#e2e5dc] bg-white text-[#526653] hover:border-[#9aaa95]"
              }`}
            >
              <Check size={14} />
              {todayOnly ? "Showing today" : "View today only"}
            </button>
          </div>
        </section>

        {formOpen && (
          <section className="mt-5 rounded-3xl border border-[#e3e7dc] bg-white p-5 shadow-[0_8px_30px_rgba(35,55,38,0.035)] sm:mt-6 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf3e9] text-[#456b52]">
                <Plus size={21} />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                  Add a client appointment
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#788478]">
                  Add a consultation directly to the shared schedule.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleManualAdd}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="manual-name"
                  className="mb-2 block text-sm font-semibold text-[#405244]"
                >
                  Client name
                </label>
                <input
                  id="manual-name"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  required
                  maxLength={100}
                  placeholder="Enter full name"
                  className="min-h-12 w-full rounded-2xl border border-[#e2e5dc] bg-[#fdfdfa] px-4 py-3 text-base outline-none transition placeholder:text-[#a2a79c] focus:border-[#7b9278] focus:ring-4 focus:ring-[#eaf0e5]"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-phone"
                  className="mb-2 block text-sm font-semibold text-[#405244]"
                >
                  Phone number{" "}
                  <span className="font-normal text-[#92978d]">(optional)</span>
                </label>
                <input
                  id="manual-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter phone number"
                  className="min-h-12 w-full rounded-2xl border border-[#e2e5dc] bg-[#fdfdfa] px-4 py-3 text-base outline-none transition placeholder:text-[#a2a79c] focus:border-[#7b9278] focus:ring-4 focus:ring-[#eaf0e5]"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-date"
                  className="mb-2 block text-sm font-semibold text-[#405244]"
                >
                  Appointment date
                </label>
                <input
                  id="manual-date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => {
                    const selectedDate = event.target.value;
                    setDate(selectedDate);
                    setTime("");
                    loadManualAvailability(selectedDate);
                  }}
                  required
                  className="min-h-12 w-full rounded-2xl border border-[#e2e5dc] bg-[#fdfdfa] px-4 py-3 text-base outline-none transition focus:border-[#7b9278] focus:ring-4 focus:ring-[#eaf0e5]"
                />
              </div>

              <div>
                <label
                  htmlFor="manual-time"
                  className="mb-2 block text-sm font-semibold text-[#405244]"
                >
                  Available time
                </label>
                <select
                  id="manual-time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                  disabled={loadingManualSlots || manualSlots.length === 0}
                  className="min-h-12 w-full rounded-2xl border border-[#e2e5dc] bg-[#fdfdfa] px-4 py-3 text-base outline-none transition focus:border-[#7b9278] focus:ring-4 focus:ring-[#eaf0e5] disabled:opacity-60"
                >
                  <option value="" disabled>
                    {loadingManualSlots
                      ? "Checking available times…"
                      : manualSlots.length === 0
                        ? "No available times"
                        : "Choose a time"}
                  </option>
                  {manualSlots.map((slot) => (
                    <option
                      key={slot.time}
                      value={slot.time}
                      disabled={!slot.available}
                    >
                      {formatTime(slot.time)}
                      {!slot.available ? " — Unavailable" : ""}
                    </option>
                  ))}
                </select>
                {manualSlotsError && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {manualSlotsError}
                  </p>
                )}
                {!loadingManualSlots &&
                  !manualSlotsError &&
                  manualSlots.length > 0 &&
                  !manualSlots.some((slot) => slot.available) && (
                    <p className="mt-2 text-xs text-[#778078]">
                      No times are available for this date. Choose another.
                    </p>
                  )}
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600 sm:col-span-2">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setFormError("");
                    availabilityRequest.current += 1;
                    setLoadingManualSlots(false);
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#e2e5dc] px-5 text-sm font-semibold text-[#59675a] transition hover:bg-[#f8f8f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingManualSlots ||
                    !time ||
                    !manualSlots.some(
                      (slot) => slot.time === time && slot.available,
                    )
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#456b52] px-5 text-sm font-semibold text-white transition hover:bg-[#365640] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  {saving ? "Saving appointment…" : "Save appointment"}
                </button>
              </div>
            </form>
          </section>
        )}

        {feedback && (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-[#dce8d9] bg-[#edf3e9] px-4 py-3 text-sm font-medium text-[#456b52]"
          >
            {feedback}
          </p>
        )}

        {formError && !formOpen && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {formError}
          </p>
        )}

        <section className="mt-9 sm:mt-11">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b9385]">
                YOUR PRACTICE
              </p>
              <h3 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
                Client schedule
              </h3>
              <p className="mt-1.5 text-sm text-[#788478]">
                {todayOnly
                  ? "Today's appointments"
                  : "Every scheduled consultation"}
              </p>
            </div>
            <span className="rounded-full border border-[#e8e8df] bg-white px-3 py-1.5 text-xs font-semibold text-[#697568]">
              {loading ? "…" : visibleAppointments.length}{" "}
              {visibleAppointments.length === 1
                ? "appointment"
                : "appointments"}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#e8e9df] bg-white p-8 text-sm text-[#788478]">
              Loading your schedule…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-white p-5 sm:p-6">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={loadAppointments}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#456b52] underline underline-offset-4"
              >
                Try again <RefreshCw size={14} />
              </button>
            </div>
          ) : visibleAppointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#d9dfd3] bg-white px-5 py-10 text-center sm:px-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3e9] text-[#527454]">
                <CalendarDays size={22} />
              </span>
              <h4 className="mt-4 font-semibold">No appointments here</h4>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#788478]">
                {todayOnly
                  ? "There are no appointments scheduled for today. Switch back to the full schedule to see other dates."
                  : "When clients book or you add an appointment, it will appear here."}
              </p>
              {todayOnly && (
                <button
                  type="button"
                  onClick={() => setTodayOnly(false)}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#edf3e9] px-4 text-sm font-semibold text-[#456b52]"
                >
                  View all appointments
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAppointments.map((appointment) => (
                <article
                  key={appointment._id}
                  className="rounded-3xl border border-[#e8e9df] bg-white p-4 shadow-[0_3px_12px_rgba(35,55,38,0.02)] transition hover:border-[#d8e0d3] sm:p-5"
                >
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f0f3eb] text-[#58775b] sm:h-14 sm:w-14">
                      <Users size={21} strokeWidth={1.7} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words font-semibold tracking-tight text-[#293b2f]">
                          {appointment.clientName}
                        </h4>
                        <StatusBadge status={appointment.status} />
                        <ConfirmationBadge
                          label={getAppointmentIndicator(
                            appointment,
                            currentDateTime,
                          )}
                        />
                      </div>

                      <p className="mt-1.5 break-all text-sm text-[#788478]">
                        {appointment.phone || "No phone provided"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-[#667765] sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} />
                          {formatDate(appointment.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={14} />
                          {formatTime(appointment.time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f0f0e9] pt-3.5 sm:ml-[68px] sm:mt-3 sm:pt-0">
                    <p className="text-xs text-[#93998e]">Update outcome</p>
                    <div className="relative min-w-0">
                      <select
                        aria-label={`Change status for ${appointment.clientName}`}
                        value={appointment.status}
                        disabled={updatingId === appointment._id}
                        onChange={(event) =>
                          handleStatusChange(
                            appointment._id,
                            event.target.value,
                          )
                        }
                        className="min-h-10 max-w-[175px] rounded-xl border border-[#e2e5dc] bg-white py-2 pl-3 pr-8 text-sm font-medium text-[#405244] outline-none transition focus:border-[#7b9278] focus:ring-4 focus:ring-[#eaf0e5] disabled:opacity-60"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {updatingId === appointment._id && (
                        <LoaderCircle
                          size={14}
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-[#456b52]"
                        />
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-[#e9e9e1] pt-5 text-center text-xs text-[#96998f] sm:mt-16">
          Wellness Booking <span className="mx-1.5">·</span> A little more care,
          a little less admin.
        </footer>
      </div>
    </main>
  );
}

export default NutritionistDashboard;
