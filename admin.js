const ADMIN_STORAGE_KEYS = {
  bookings: "egmond_bookings_v5",
  requests: "egmond_requests_v5",
  session: "egmond_admin_session_v5"
};

const ADMIN_PASSWORD = "FiegePils";
let currentYear = new Date().getFullYear();

const loginPanel = document.getElementById("adminLoginPanel");
const dashboardPanel = document.getElementById("dashboardPanel");
const loginForm = document.getElementById("adminLoginForm");
const loginError = document.getElementById("adminLoginError");
const statGrid = document.getElementById("statGrid");
const bookingList = document.getElementById("bookingList");
const requestList = document.getElementById("requestList");
const adminYearGrid = document.getElementById("adminYearGrid");
const overviewYearTitle = document.getElementById("overviewYearTitle");

function getBookings() {
  try { return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEYS.bookings) || "[]"); }
  catch { return []; }
}
function setBookings(bookings) {
  localStorage.setItem(ADMIN_STORAGE_KEYS.bookings, JSON.stringify(bookings));
}
function getRequests() {
  try { return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEYS.requests) || "[]"); }
  catch { return []; }
}
function setRequests(requests) {
  localStorage.setItem(ADMIN_STORAGE_KEYS.requests, JSON.stringify(requests));
}
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function formatDate(iso) {
  return parseISO(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function diffNights(startIso, endIso) {
  return Math.round((parseISO(endIso) - parseISO(startIso)) / 86400000);
}
function isLoggedIn() {
  return localStorage.getItem(ADMIN_STORAGE_KEYS.session) === "active";
}
function setLoggedIn(value) {
  if (value) localStorage.setItem(ADMIN_STORAGE_KEYS.session, "active");
  else localStorage.removeItem(ADMIN_STORAGE_KEYS.session);
}
function nextArrivalLabel(bookings) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const future = bookings.filter((b) => parseISO(b.start) >= startOfToday).sort((a, b) => parseISO(a.start) - parseISO(b.start))[0];
  return future ? formatDate(future.start).slice(0, 5) : "–";
}
function buildAvailability(bookings) {
  const map = new Map();
  const ensure = (iso) => {
    if (!map.has(iso)) map.set(iso, { booked: false, halfStart: false, halfEnd: false, label: "" });
    return map.get(iso);
  };

  bookings.forEach((booking) => {
    const start = parseISO(booking.start);
    const end = parseISO(booking.end);
    const lastNight = addDays(end, -1);

    if (booking.type === "arrival-departure") {
      ensure(formatISO(start)).halfStart = true;
      ensure(formatISO(lastNight)).halfEnd = true;
      ensure(formatISO(start)).label = booking.label;
      ensure(formatISO(lastNight)).label = booking.label;
    }

    let cursor = new Date(start);
    while (cursor < end) {
      const iso = formatISO(cursor);
      const state = ensure(iso);
      if (booking.type === "full") {
        state.booked = true;
        state.label = booking.label;
      } else if (iso !== formatISO(start) && iso !== formatISO(lastNight)) {
        state.booked = true;
        state.label = booking.label;
      }
      cursor = addDays(cursor, 1);
    }
  });

  return map;
}
function dayStateFor(map, iso) {
  const entry = map.get(iso);
  if (!entry) return "free";
  if (entry.booked) return "booked";
  if (entry.halfStart) return "half-start";
  if (entry.halfEnd) return "half-end";
  return "free";
}
function labelFor(map, iso) {
  return map.get(iso)?.label || "";
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = document.getElementById("adminPassword").value;
  if (value !== ADMIN_PASSWORD) {
    loginError.textContent = "Falsches Passwort.";
    loginError.classList.remove("hidden");
    return;
  }
  loginError.classList.add("hidden");
  setLoggedIn(true);
  showDashboard();
});
document.getElementById("logoutBtn").addEventListener("click", () => {
  setLoggedIn(false);
  showLogin();
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
    btn.classList.add("is-active");
    document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.remove("hidden");
  });
});

document.getElementById("prevYearBtn").addEventListener("click", () => {
  currentYear -= 1;
  renderYearOverview();
});
document.getElementById("nextYearBtn").addEventListener("click", () => {
  currentYear += 1;
  renderYearOverview();
});

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboardPanel.classList.remove("hidden");
  refreshDashboard();
}
function showLogin() {
  loginPanel.classList.remove("hidden");
  dashboardPanel.classList.add("hidden");
}

function renderStats() {
  const bookings = getBookings();
  const requests = getRequests();
  const openRequests = requests.filter((r) => r.status !== "archiviert").length;
  const currentMonth = new Date().getMonth();
  const monthBookings = bookings.filter((b) => parseISO(b.start).getMonth() === currentMonth).length;

  const stats = [
    { label: "Buchungen", value: bookings.length },
    { label: "Anfragen offen", value: openRequests },
    { label: "Start diesen Monat", value: monthBookings },
    { label: "Nächste Anreise", value: nextArrivalLabel(bookings) }
  ];

  statGrid.innerHTML = "";
  stats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `<div class="label">${stat.label}</div><div class="value">${stat.value}</div>`;
    statGrid.appendChild(card);
  });
}

function renderYearOverview() {
  const bookings = getBookings();
  const availability = buildAvailability(bookings);
  overviewYearTitle.textContent = String(currentYear);
  adminYearGrid.innerHTML = "";

  for (let month = 0; month < 12; month += 1) {
    const monthDate = new Date(currentYear, month, 1);
    const monthEnd = new Date(currentYear, month + 1, 0);
    const firstWeekday = (monthDate.getDay() + 6) % 7;

    const card = document.createElement("article");
    card.className = "year-month";
    card.innerHTML = `<h3 class="year-title">${monthDate.toLocaleDateString("de-DE", { month: "long" })}</h3>`;

    const weekdays = document.createElement("div");
    weekdays.className = "mini-weekdays";
    ["Mo","Di","Mi","Do","Fr","Sa","So"].forEach((label) => {
      const node = document.createElement("div");
      node.className = "mini-weekday";
      node.textContent = label;
      weekdays.appendChild(node);
    });
    card.appendChild(weekdays);

    const grid = document.createElement("div");
    grid.className = "mini-days";
    for (let i = 0; i < firstWeekday; i += 1) {
      const spacer = document.createElement("div");
      spacer.className = "mini-spacer";
      grid.appendChild(spacer);
    }

    const names = new Set();
    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const iso = formatISO(new Date(currentYear, month, day));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mini-day";
      btn.dataset.state = dayStateFor(availability, iso);
      btn.textContent = String(day);
      const name = labelFor(availability, iso);
      if (name) names.add(name);
      grid.appendChild(btn);
    }
    card.appendChild(grid);

    const nameLine = document.createElement("div");
    nameLine.className = "mini-name";
    nameLine.textContent = Array.from(names).slice(0, 3).join(" · ");
    card.appendChild(nameLine);

    adminYearGrid.appendChild(card);
  }
}

function renderBookingList() {
  const bookings = getBookings().sort((a, b) => parseISO(a.start) - parseISO(b.start));
  bookingList.innerHTML = "";
  if (!bookings.length) {
    bookingList.innerHTML = `<div class="empty-state">Keine Buchungen.</div>`;
    return;
  }

  bookings.forEach((booking) => {
    const item = document.createElement("article");
    item.className = "data-item";
    item.innerHTML = `
      <div class="data-item-head">
        <div>
          <h3>${booking.label}</h3>
          <div class="data-meta">
            <span>${formatDate(booking.start)} – ${formatDate(booking.end)}</span>
            <span>${diffNights(booking.start, booking.end)} Nächte</span>
          </div>
        </div>
        <span class="pill ${booking.type === "arrival-departure" ? "" : "danger"}">${booking.type === "arrival-departure" ? "Halbtags-Wechsel" : "Normal"}</span>
      </div>
      <div class="data-actions">
        <button type="button" class="nav-pill admin" data-delete-booking="${booking.id}">Löschen</button>
      </div>
    `;
    bookingList.appendChild(item);
  });

  bookingList.querySelectorAll("[data-delete-booking]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filtered = getBookings().filter((entry) => entry.id !== btn.dataset.deleteBooking);
      setBookings(filtered);
      refreshDashboard();
    });
  });
}

function renderRequestList() {
  const requests = getRequests();
  requestList.innerHTML = "";
  if (!requests.length) {
    requestList.innerHTML = `<div class="empty-state">Keine Anfragen.</div>`;
    return;
  }

  requests.forEach((request) => {
    const item = document.createElement("article");
    item.className = "data-item";
    item.innerHTML = `
      <div class="data-item-head">
        <div>
          <h3>${request.name}</h3>
          <div class="data-meta">
            <span>${request.email}</span>
            <span>${request.phone || "–"}</span>
            <span>${formatDate(request.arrival)} – ${formatDate(request.departure)}</span>
          </div>
        </div>
        <span class="pill ${request.status === "archiviert" ? "" : "danger"}">${request.status}</span>
      </div>
      <div>${request.message || "Keine Nachricht."}</div>
      <div class="data-actions">
        <button type="button" class="nav-pill admin" data-archive-request="${request.id}">Archivieren</button>
        <button type="button" class="nav-pill admin" data-delete-request="${request.id}">Löschen</button>
      </div>
    `;
    requestList.appendChild(item);
  });

  requestList.querySelectorAll("[data-archive-request]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const requests = getRequests().map((req) => req.id === btn.dataset.archiveRequest ? { ...req, status: "archiviert" } : req);
      setRequests(requests);
      refreshDashboard();
    });
  });
  requestList.querySelectorAll("[data-delete-request]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const requests = getRequests().filter((req) => req.id !== btn.dataset.deleteRequest);
      setRequests(requests);
      refreshDashboard();
    });
  });
}

function showFeedback(el, text, type = "success") {
  el.textContent = text;
  el.className = `notice notice-${type}`;
}

document.getElementById("bookingAdminForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const start = document.getElementById("adminStart").value;
  const end = document.getElementById("adminEnd").value;
  const label = document.getElementById("adminLabel").value.trim();
  const type = document.getElementById("adminType").value;
  const feedback = document.getElementById("bookingAdminFeedback");

  if (!start || !end || !label || parseISO(end) <= parseISO(start)) {
    showFeedback(feedback, "Bitte gültige Daten eingeben.", "error");
    return;
  }

  const bookings = getBookings();
  bookings.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    start,
    end,
    label,
    type
  });
  setBookings(bookings);
  event.target.reset();
  showFeedback(feedback, "Gespeichert.", "success");
  refreshDashboard();
});

function buildPrintableHtml(year, bookings) {
  const availability = buildAvailability(bookings);

  const monthHtml = Array.from({ length: 12 }, (_, month) => {
    const monthDate = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstWeekday = (monthDate.getDay() + 6) % 7;
    let cells = "";

    for (let i = 0; i < firstWeekday; i += 1) cells += `<div class="c empty"></div>`;

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const iso = formatISO(new Date(year, month, day));
      const state = dayStateFor(availability, iso);
      const label = labelFor(availability, iso);
      cells += `<div class="c ${state}"><div class="d">${day}</div><div class="n">${label || ""}</div></div>`;
    }

    return `
      <section class="m">
        <h3>${monthDate.toLocaleDateString("de-DE", { month: "long" })}</h3>
        <div class="w">${["Mo","Di","Mi","Do","Fr","Sa","So"].map((d) => `<div>${d}</div>`).join("")}</div>
        <div class="g">${cells}</div>
      </section>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Egmond Kalender ${year}</title>
<style>
@page{size:A4 landscape; margin:10mm}
body{font-family:Arial,sans-serif; color:#1b140d; margin:0}
h1{font-size:18px; margin:0 0 10px}
.top{display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px}
.legend{display:flex; gap:12px; font-size:10px}
.l{display:inline-flex; align-items:center; gap:5px}
.s{width:11px; height:11px; border-radius:3px; display:inline-block; border:1px solid #cfc0ae}
.b{background:#f5d3d1}.h{background:linear-gradient(135deg,#fff 0 50%, #f5d3d1 50% 100%)}
.grid{display:grid; grid-template-columns:repeat(3,1fr); gap:8px}
.m{border:1px solid #d9cec1; border-radius:10px; padding:8px; break-inside:avoid}
.m h3{font-size:12px; margin:0 0 6px}
.w,.g{display:grid; grid-template-columns:repeat(7,1fr); gap:2px}
.w div{font-size:8px; text-align:center; color:#6f6253}
.c{min-height:34px; border:1px solid #ece3da; border-radius:5px; padding:2px; background:#fff}
.c.booked{background:#f5d3d1}
.c.half-start{background:linear-gradient(135deg,#fff 0 50%, #f5d3d1 50% 100%)}
.c.half-end{background:linear-gradient(135deg,#f5d3d1 0 50%, #fff 50% 100%)}
.c.empty{border:none; background:transparent}
.d{font-size:8px; font-weight:700}
.n{font-size:7px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
</style>
</head>
<body>
  <div class="top">
    <h1>Egmond – Belegungskalender ${year}</h1>
    <div class="legend">
      <span class="l"><span class="s b"></span>belegt</span>
      <span class="l"><span class="s h"></span>halbtags</span>
    </div>
  </div>
  <div class="grid">${monthHtml}</div>
</body>
</html>
  `;
}

document.getElementById("printYearBtn").addEventListener("click", () => {
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) return;
  printWindow.document.write(buildPrintableHtml(currentYear, getBookings()));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
});

function refreshDashboard() {
  renderStats();
  renderYearOverview();
  renderBookingList();
  renderRequestList();
}

if (isLoggedIn()) showDashboard();
else showLogin();
