import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Leaf,
  Plus,
  Sparkles,
} from "lucide-react";
import { getAppointments } from "../services/appointments";
import AppointmentActions from "../components/AppointmentActions";
import BookingForm from "../components/BookingForm";

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

function StatusPill({ appointment, today }) {
  const isPast = !isUpcomingAppointment(appointment, today);
  const styles =
    appointment.status === "Done"
      ? "bg-sky-50 text-sky-700 ring-sky-100"
      : appointment.status === "No-show"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : isPast
          ? "bg-stone-100 text-stone-600 ring-stone-200"
          : "bg-[#eaf2e8] text-[#416a49] ring-[#dce8d9]";

  const label =
    appointment.status === "Done"
      ? "Completed"
      : appointment.status === "No-show"
        ? "Missed"
        : isPast
          ? "Past appointment"
          : "Upcoming";

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {appointment.status === "Done" ? (
        <Check size={13} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}

function isUpcomingAppointment(appointment, today) {
  if (appointment.date > today) return true;
  if (appointment.date < today) return false;

  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return appointment.time > currentTime;
}

function AppointmentCard({
  appointment,
  today,
  onChanged,
  featured = false,
}) {
  return (
    <article
      className={`rounded-3xl border border-[#e8e9df] bg-white transition duration-200 hover:border-[#d5dfd1] ${
        featured
          ? "p-5 shadow-[0_12px_35px_rgba(49,75,52,0.07)] sm:p-6"
          : "p-4 sm:p-5"
      }`}
    >
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div
          className={`flex shrink-0 flex-col items-center justify-center rounded-2xl ${
            featured
              ? "h-[68px] w-[64px] bg-[#edf3e9] text-[#456b52]"
              : "h-14 w-14 bg-[#f4f5ef] text-[#627860]"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
            {new Date(`${appointment.date}T12:00:00Z`).toLocaleDateString(
              "en-IN",
              { month: "short", timeZone: "Asia/Kolkata" },
            )}
          </span>
          <span
            className={`font-semibold tracking-tight ${
              featured ? "text-2xl" : "text-xl"
            }`}
          >
            {appointment.date.slice(-2)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-tight text-[#293b2f]">
              Nutrition consultation
            </h3>
            {featured && (
              <span className="rounded-full bg-[#f7f0df] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#96733b]">
                Next session
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-[#81877d]">
            {formatDate(appointment.date)}
          </p>
          <p className="mt-2.5 flex items-center gap-2 text-sm font-medium text-[#4e6251]">
            <Clock3 size={15} strokeWidth={1.8} />
            {formatTime(appointment.time)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0e9] pt-4">
        <StatusPill appointment={appointment} today={today} />
        {featured && (
          <span className="flex items-center gap-1.5 text-xs text-[#788476]">
            <Leaf size={14} />A little time for yourself
          </span>
        )}
      </div>

      {appointment.status === "Booked" &&
        isUpcomingAppointment(appointment, today) && (
          <AppointmentActions
            appointment={appointment}
            onChanged={onChanged}
          />
        )}
    </article>
  );
}

function ClientHome() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAppointments = useCallback(async () => {
    try {
      const data = await getAppointments();
      setAppointments(data);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
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
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const scrollToBooking = () => {
    document.getElementById("book-appointment")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const today = getToday();

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        isUpcomingAppointment(appointment, today) &&
        appointment.status === "Booked" &&
        !appointment.isCancelled,
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );

  const pastAppointments = appointments
    .filter(
      (appointment) =>
        appointment.date < today ||
        (appointment.status === "Booked" &&
          !isUpcomingAppointment(appointment, today)) ||
        appointment.status === "Done" ||
        appointment.status === "No-show",
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
    );

  const nextAppointment = upcomingAppointments[0];
  const otherUpcoming = upcomingAppointments.slice(1);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#faf9f6] text-[#283b30]">
      <header className="sticky top-0 z-20 border-b border-[#e9e9e1]/90 bg-[#faf9f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:h-[80px] sm:px-8">
          <a href="#" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#456b52] text-white shadow-sm sm:h-11 sm:w-11">
              <Leaf size={21} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold tracking-tight sm:text-lg">
                Wellness Booking
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#849080] sm:text-xs">
                Your space to feel better
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-[#697568] sm:flex">
            <a href="#appointments" className="transition hover:text-[#456b52]">
              My appointments
            </a>
            <a
              href="#book-appointment"
              className="transition hover:text-[#456b52]"
            >
              Book a session
            </a>
          </nav>

          <button
            type="button"
            onClick={scrollToBooking}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#456b52] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#365640] active:scale-[0.98] sm:h-11 sm:gap-2 sm:px-5"
          >
            <Plus size={17} />
            <span>Book</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-8 sm:pb-16 sm:pt-9 lg:pt-11">
        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#eaf0e5] px-5 py-7 sm:rounded-[36px] sm:px-10 sm:py-11 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full border-[35px] border-white/35 sm:-right-12 sm:-top-24 sm:h-80 sm:w-80 sm:border-[45px]" />
          <div className="pointer-events-none absolute -bottom-24 right-8 -z-10 h-44 w-44 rounded-full bg-[#dce7d5]/80 sm:right-40 sm:h-56 sm:w-56" />
          <div className="pointer-events-none absolute right-10 top-12 -z-10 hidden h-16 w-16 rotate-12 rounded-[22px] border border-white/60 sm:block" />

          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d6e0d1] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#55745a]">
              <Sparkles size={14} />A little care goes a long way
            </div>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#73846f] sm:text-xs">
              YOUR WELLNESS JOURNEY
            </p>

            <h1 className="max-w-lg text-[38px] font-medium leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[52px]">
              Make room for
              <br />
              <span className="font-serif italic text-[#527758]">
                feeling good.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-[#667765] sm:mt-5 sm:text-base sm:leading-7">
              Your wellbeing deserves a little time. Keep your consultations in
              one place and take your next step at your own pace.
            </p>

            <button
              type="button"
              onClick={scrollToBooking}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#456b52] px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(54,86,64,0.16)] transition hover:-translate-y-0.5 hover:bg-[#365640] active:translate-y-0 sm:mt-7 sm:px-6"
            >
              Book a consultation
              <ArrowRight size={17} />
            </button>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#71816e] sm:mt-7 sm:gap-x-5">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Simple booking
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Your schedule, together
              </span>
            </div>
          </div>
        </section>

        <section id="appointments" className="scroll-mt-24 mt-9 sm:mt-12">
          <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8b9385]">
                YOUR SCHEDULE
              </p>
              <h2 className="mt-1.5 text-[25px] font-semibold tracking-tight sm:mt-2 sm:text-3xl">
                Your appointments
              </h2>
              <p className="mt-1.5 text-sm text-[#858b80]">
                All your sessions, in one place.
              </p>
            </div>
            <span className="mb-1 shrink-0 rounded-full border border-[#e8e8df] bg-white px-3 py-1.5 text-xs font-semibold text-[#697568]">
              {loading ? "…" : appointments.length} sessions
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#e8e9df] bg-white p-6 text-sm text-[#788478]">
              Getting your schedule ready…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-white p-5 sm:p-6">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={loadAppointments}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#456b52] underline underline-offset-4"
              >
                Try again <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
              <div className="min-w-0 space-y-7">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#405244]">
                      Coming up
                    </h3>
                    <span className="text-xs text-[#899184]">
                      {upcomingAppointments.length}{" "}
                      {upcomingAppointments.length === 1
                        ? "appointment"
                        : "appointments"}
                    </span>
                  </div>

                  {nextAppointment ? (
                    <div className="space-y-3">
                      <AppointmentCard
                        appointment={nextAppointment}
                        today={today}
                        onChanged={loadAppointments}
                        featured
                      />
                      {otherUpcoming.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          today={today}
                          onChanged={loadAppointments}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#d9dfd3] bg-[#f4f5ef] p-5 sm:p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#56765b]">
                        <CalendarDays size={21} />
                      </div>
                      <h4 className="mt-4 font-semibold">
                        Nothing on the calendar just yet
                      </h4>
                      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#7b8578]">
                        Give yourself something to look forward to. Book a
                        session whenever you're ready.
                      </p>
                      <button
                        type="button"
                        onClick={scrollToBooking}
                        className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#456b52]"
                      >
                        Find a time <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#405244]">
                      Past sessions
                    </h3>
                    <span className="text-xs text-[#899184]">
                      {pastAppointments.length}{" "}
                      {pastAppointments.length === 1 ? "session" : "sessions"}
                    </span>
                  </div>

                  {pastAppointments.length > 0 ? (
                    <div className="space-y-3">
                      {pastAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          today={today}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#e8e9df] bg-white px-4 py-5 text-sm text-[#81877d]">
                      Your completed sessions will appear here.
                    </div>
                  )}
                </section>
              </div>

              <aside
                id="book-appointment"
                className="scroll-mt-24 rounded-[28px] border border-[#e7e7dd] bg-white p-5 shadow-[0_8px_30px_rgba(35,55,38,0.035)] sm:rounded-[32px] sm:p-7 lg:sticky lg:top-24"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7eee0] text-[#a77d42]">
                  <Leaf size={22} strokeWidth={1.8} />
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#929487]">
                  MAKE TIME FOR YOU
                </p>
                <h2 className="mt-2 text-[25px] font-semibold leading-tight tracking-tight sm:text-3xl">
                  Your next step starts here.
                </h2>
                <p className="mb-6 mt-3 text-sm leading-6 text-[#7a8177]">
                  Choose a date, find a time that suits you, and leave the
                  organising to us.
                </p>

                <BookingForm onBooked={loadAppointments} />

                <div className="mt-5 flex items-start justify-center gap-2 border-t border-[#f0f0e9] pt-4 text-center text-xs leading-5 text-[#92978d]">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-[#668568]"
                    size={14}
                  />
                  <span>Choose a time that works for you.</span>
                </div>
              </aside>
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-[#e9e9e1] pt-5 text-center sm:mt-16">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#899184]">
            <Leaf size={14} />
            Made with care, for your wellbeing.
          </div>
        </footer>
      </div>

      <button
        type="button"
        onClick={scrollToBooking}
        aria-label="Book an appointment"
        className="fixed bottom-4 right-4 z-20 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#456b52] px-5 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(41,66,47,0.25)] transition hover:bg-[#365640] active:scale-[0.98] sm:hidden"
      >
        <Plus size={18} />
        Book a session
      </button>
    </main>
  );
}

export default ClientHome;
