const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const API_BASE_URL = configuredApiBaseUrl
  ? `${configuredApiBaseUrl.replace(/\/api$/i, "")}/api`
  : import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/appointments${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : "Something went wrong. Please try again.",
    );
  }

  return data;
}

export function getAppointments() {
  return request("");
}

export function getAvailableSlots(date) {
  return request(`/availability?date=${encodeURIComponent(date)}`);
}

export function createAppointment(appointment) {
  return request("", {
    method: "POST",
    body: JSON.stringify(appointment),
  });
}

export function cancelAppointment(id) {
  return request(`/${id}/cancel`, {
    method: "PATCH",
  });
}

export function rescheduleAppointment(id, date, time) {
  return request(`/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({ date, time }),
  });
}

export function updateAppointmentStatus(id, status) {
  return request(`/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function confirmAppointment(id) {
  return request(`/${id}/confirm`, {
    method: "PATCH",
  });
}

export function addManualAppointment(appointment) {
  return request("/manual", {
    method: "POST",
    body: JSON.stringify(appointment),
  });
}
