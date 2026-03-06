const STORAGE_KEYS = {
  bookings: "egmond_bookings_v5",
  requests: "egmond_requests_v5"
};

const HERO_IMAGES = [
  "images/header_neu.jpg",
  "images/Header_fenster.jpg",
  "images/header_duenen.jpg",
  "images/Header_strandkorb.jpg"
];

const PHOTOS = [
  { img: "images/Egmond Sonnenuntergang.jpg", caption: "Sonnenuntergang" },
  { img: "images/Egmond Sterne.jpg", caption: "Sterne" },
  { img: "images/Egmond Abend.jpg", caption: "Abend" },
  { img: "images/Egmond Fenster.jpg", caption: "Fensterblick" },
  { img: "images/Egmond app (1).jpeg", caption: "Wohnbereich" },
  { img: "images/Egmond app (2).jpeg", caption: "Essbereich" },
  { img: "images/Egmond app (3).jpeg", caption: "Schlafzimmer" },
  { img: "images/Egmond app (4).jpeg", caption: "Küche" },
  { img: "images/Egmond app (5).jpeg", caption: "Bad" },
  { img: "images/Egmond app (6).jpeg", caption: "Details" },
  { img: "images/Egmond app (7).jpeg", caption: "Lichtstimmung" },
  { img: "images/Egmond app (8).jpeg", caption: "Außenbereich" }
];

const defaultBookings = [
  { id: "b1", label: "Schmidt", start: "2026-03-16", end: "2026-03-21", type: "full" },
  { id: "b2", label: "Meyer", start: "2026-03-28", end: "2026-04-03", type: "arrival-departure" },
  { id: "b3", label: "Becker", start: "2026-04-18", end: "2026-04-23", type: "full" }
];

function seedData() {
  if (!localStorage.getItem(STORAGE_KEYS.bookings)) {
    localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(defaultBookings));
  }
  if (!localStorage.getItem(STORAGE_KEYS.requests)) {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify([]));
  }
}

function getBookings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.bookings) || "[]"); }
  catch { return []; }
}
function getRequests() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.requests) || "[]"); }
  catch { return []; }
}
function setRequests(value) {
  localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(value));
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
function overlaps(startA, endA, startB, endB) {
  return parseISO(startA) < parseISO(endB) && parseISO(endA) > parseISO(startB);
}

function buildAvailability(bookings) {
  const map = new Map();
  const ensure = (iso) => {
    if (!map.has(iso)) map.set(iso, { booked: false, halfStart: false, halfEnd: false });
    return map.get(iso);
  };

  bookings.forEach((booking) => {
    const start = parseISO(booking.start);
    const end = parseISO(booking.end);
    const lastNight = addDays(end, -1);

    if (booking.type === "arrival-departure") {
      ensure(formatISO(start)).halfStart = true;
      ensure(formatISO(lastNight)).halfEnd = true;
    }

    let cursor = new Date(start);
    while (cursor < end) {
      const iso = formatISO(cursor);
      const state = ensure(iso);
      if (booking.type === "full") {
        state.booked = true;
      } else if (iso !== formatISO(start) && iso !== formatISO(lastNight)) {
        state.booked = true;
      }
      cursor = addDays(cursor, 1);
    }
  });

  return map;
}

const state = {
  monthOffset: 0,
  selectedArrival: null,
  selectedDeparture: null,
  previewDeparture: null,
  heroIndex: 0,
  lightboxIndex: 0,
  bookings: [],
  availability: new Map()
};

const calendarMount = document.getElementById("calendarMount");
const calendarWrap = document.getElementById("calendarWrap");
const summaryArrival = document.getElementById("summaryArrival");
const summaryDeparture = document.getElementById("summaryDeparture");
const summaryNights = document.getElementById("summaryNights");
const selectionNotice = document.getElementById("selectionNotice");
const arrivalInput = document.getElementById("arrivalInput");
const departureInput = document.getElementById("departureInput");
const nextSlotBox = document.getElementById("nextSlotBox");
const bookingForm = document.getElementById("bookingForm");
const formError = document.getElementById("formError");
const formSuccess = document.getElementById("formSuccess");
const submitBtn = document.getElementById("submitBtn");

function startHeroRotation() {
  const a = document.getElementById("heroA");
  const b = document.getElementById("heroB");
  let active = a;

  setInterval(() => {
    state.heroIndex = (state.heroIndex + 1) % HERO_IMAGES.length;
    const next = active === a ? b : a;
    next.style.backgroundImage = `url('${HERO_IMAGES[state.heroIndex]}')`;
    next.classList.add("active");
    active.classList.remove("active");
    active = next;
  }, 5200);
}

function renderMosaic() {
  const mount = document.getElementById("galleryMosaic");
  mount.innerHTML = PHOTOS.slice(0, 7).map((photo, index) => `
    <button type="button" class="mosaic-tile ${index === 0 ? "large" : ""}" data-photo="${index}" style="background-image:url('${photo.img}')">
      <span class="mosaic-caption">${photo.caption}</span>
    </button>
  `).join("");

  mount.querySelectorAll("[data-photo]").forEach((btn) => {
    btn.addEventListener("click", () => openLightbox(Number(btn.dataset.photo)));
  });

  document.querySelectorAll("[data-open-photo]").forEach((btn) => {
    btn.addEventListener("click", () => openLightbox(Number(btn.dataset.openPhoto)));
  });
}

function openLightbox(index) {
  state.lightboxIndex = index;
  updateLightbox();
  document.getElementById("lightbox").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  document.getElementById("lightbox").classList.remove("open");
  document.body.style.overflow = "";
}
function navLightbox(direction) {
  state.lightboxIndex = (state.lightboxIndex + direction + PHOTOS.length) % PHOTOS.length;
  updateLightbox();
}
function updateLightbox() {
  const photo = PHOTOS[state.lightboxIndex];
  document.getElementById("lightboxImage").style.backgroundImage = `url('${photo.img}')`;
  document.getElementById("lightboxCaption").textContent = `${photo.caption} · ${state.lightboxIndex + 1}/${PHOTOS.length}`;
}

function isPast(iso) {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return parseISO(iso) < current;
}
function getDayState(iso) {
  const availability = state.availability.get(iso);
  if (!availability) return "free";
  if (availability.booked) return "booked";
  if (availability.halfStart) return "half-start";
  if (availability.halfEnd) return "half-end";
  return "free";
}
function canStayRange(startIso, endIso) {
  if (!startIso || !endIso) return false;
  if (parseISO(endIso) <= parseISO(startIso)) return false;

  for (const booking of state.bookings) {
    if (overlaps(startIso, endIso, booking.start, booking.end)) {
      if (booking.type === "arrival-departure" && booking.start === endIso) continue;
      if (booking.type === "arrival-departure" && booking.end === startIso) continue;
      return false;
    }
  }
  return true;
}
function isSelectable(iso) {
  if (isPast(iso)) return false;
  const currentState = getDayState(iso);
  return currentState !== "booked" && currentState !== "half-end";
}

function updateSelectionUI() {
  arrivalInput.value = state.selectedArrival ? formatDate(state.selectedArrival) : "";
  departureInput.value = state.selectedDeparture ? formatDate(state.selectedDeparture) : "";
  summaryArrival.textContent = state.selectedArrival ? formatDate(state.selectedArrival) : "–";
  summaryDeparture.textContent = state.selectedDeparture ? formatDate(state.selectedDeparture) : "–";

  if (state.selectedArrival && state.selectedDeparture) {
    const nights = diffNights(state.selectedArrival, state.selectedDeparture);
    summaryNights.textContent = String(nights);
    selectionNotice.textContent = "Zeitraum gewählt.";
    selectionNotice.className = "notice notice-success";
  } else if (state.selectedArrival) {
    summaryNights.textContent = "–";
    selectionNotice.textContent = "Jetzt Abreise wählen.";
    selectionNotice.className = "notice notice-info";
  } else {
    summaryNights.textContent = "–";
    selectionNotice.textContent = "Anreise wählen, dann Abreise wählen.";
    selectionNotice.className = "notice notice-info";
  }
}

function setPreview(iso) {
  if (!state.selectedArrival || state.selectedDeparture) return;
  if (parseISO(iso) <= parseISO(state.selectedArrival)) return;
  state.previewDeparture = canStayRange(state.selectedArrival, iso) ? iso : null;
  renderCalendar();
}
function clearPreview() {
  if (!state.previewDeparture) return;
  state.previewDeparture = null;
  renderCalendar();
}

function handleDateClick(iso) {
  formError.classList.add("hidden");
  formSuccess.classList.add("hidden");

  if (!isSelectable(iso)) return;

  if (!state.selectedArrival || state.selectedDeparture) {
    state.selectedArrival = iso;
    state.selectedDeparture = null;
    state.previewDeparture = null;
    updateSelectionUI();
    renderCalendar();
    return;
  }

  if (parseISO(iso) <= parseISO(state.selectedArrival)) {
    state.selectedArrival = iso;
    state.selectedDeparture = null;
    state.previewDeparture = null;
    updateSelectionUI();
    renderCalendar();
    return;
  }

  if (!canStayRange(state.selectedArrival, iso)) {
    selectionNotice.textContent = "Zeitraum nicht verfügbar.";
    selectionNotice.className = "notice notice-error";
    state.previewDeparture = null;
    renderCalendar();
    return;
  }

  state.selectedDeparture = iso;
  state.previewDeparture = null;
  updateSelectionUI();
  renderCalendar();
  document.getElementById("nameInput").focus();
  document.getElementById("bookingForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function createMonthCard(baseDate) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const firstWeekday = (monthStart.getDay() + 6) % 7;

  const card = document.createElement("article");
  card.className = "month-card";
  card.innerHTML = `<div class="month-head"><div class="month-title">${monthStart.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</div></div>`;

  const weekdays = document.createElement("div");
  weekdays.className = "weekdays";
  ["Mo","Di","Mi","Do","Fr","Sa","So"].forEach((label) => {
    const node = document.createElement("div");
    node.className = "weekday";
    node.textContent = label;
    weekdays.appendChild(node);
  });
  card.appendChild(weekdays);

  const grid = document.createElement("div");
  grid.className = "days-grid";

  for (let i = 0; i < firstWeekday; i += 1) {
    const spacer = document.createElement("div");
    spacer.className = "day-spacer";
    grid.appendChild(spacer);
  }

  for (let day = 1; day <= monthEnd.getDate(); day += 1) {
    const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), day);
    const iso = formatISO(current);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-btn";
    btn.dataset.date = iso;
    btn.dataset.state = getDayState(iso);
    btn.dataset.past = String(isPast(iso));
    btn.dataset.weekend = String([0, 6].includes(current.getDay()));

    const inRange =
      state.selectedArrival &&
      state.selectedDeparture &&
      parseISO(iso) > parseISO(state.selectedArrival) &&
      parseISO(iso) < parseISO(state.selectedDeparture);

    const inPreview =
      state.selectedArrival &&
      state.previewDeparture &&
      parseISO(iso) > parseISO(state.selectedArrival) &&
      parseISO(iso) < parseISO(state.previewDeparture);

    if (inRange) btn.dataset.inRange = "true";
    if (inPreview) btn.dataset.preview = "true";
    if (iso === state.selectedArrival) btn.dataset.boundary = "start";
    if (iso === state.selectedDeparture) btn.dataset.boundary = "end";

    if (!isSelectable(iso)) btn.disabled = true;

    btn.innerHTML = `<span class="num">${day}</span>`;
    btn.addEventListener("mouseenter", () => setPreview(iso));
    btn.addEventListener("focus", () => setPreview(iso));
    btn.addEventListener("mouseleave", clearPreview);
    btn.addEventListener("blur", clearPreview);
    btn.addEventListener("click", () => handleDateClick(iso));
    grid.appendChild(btn);
  }

  card.appendChild(grid);
  return card;
}

function renderCalendar() {
  calendarMount.innerHTML = "";
  const today = new Date();
  [0, 1].forEach((offset) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + state.monthOffset + offset, 1);
    calendarMount.appendChild(createMonthCard(monthDate));
  });
}

function findNextFreeRange(minNights = 4) {
  const today = new Date();
  const horizon = 365;

  for (let offset = 0; offset < horizon; offset += 1) {
    const start = formatISO(addDays(today, offset));
    if (!isSelectable(start)) continue;

    let length = 0;
    while (offset + length < horizon) {
      const next = formatISO(addDays(today, offset + length + 1));
      if (!canStayRange(start, next)) break;
      length += 1;
      if (length >= minNights) {
        return { start, end: next };
      }
    }
  }
  return null;
}

function renderNextSlot() {
  const slot = findNextFreeRange();
  if (!slot) {
    nextSlotBox.textContent = "Kein längerer freier Zeitraum gefunden.";
    nextSlotBox.className = "notice notice-error";
    return;
  }
  const nights = diffNights(slot.start, slot.end);
  nextSlotBox.textContent = `${formatDate(slot.start)} – ${formatDate(slot.end)} · ${nights} Nächte`;
  nextSlotBox.className = "notice notice-success";
}

function validateForm() {
  if (!state.selectedArrival || !state.selectedDeparture) return "Bitte zuerst einen Zeitraum wählen.";
  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  if (!name) return "Bitte Namen eintragen.";
  if (!email || !email.includes("@")) return "Bitte gültige E-Mail eintragen.";
  if (!phone || phone.length < 6) return "Bitte Telefonnummer eintragen.";
  return "";
}

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.classList.add("hidden");
  formSuccess.classList.add("hidden");

  const error = validateForm();
  if (error) {
    formError.textContent = error;
    formError.classList.remove("hidden");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Wird gesendet …";

  const requests = getRequests();
  requests.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    arrival: state.selectedArrival,
    departure: state.selectedDeparture,
    nights: diffNights(state.selectedArrival, state.selectedDeparture),
    name: document.getElementById("nameInput").value.trim(),
    email: document.getElementById("emailInput").value.trim(),
    phone: document.getElementById("phoneInput").value.trim(),
    message: document.getElementById("messageInput").value.trim(),
    status: "neu"
  });
  setRequests(requests);

  formSuccess.textContent = "✓ Anfrage gesendet.";
  formSuccess.classList.remove("hidden");
  bookingForm.reset();
  state.selectedArrival = null;
  state.selectedDeparture = null;
  state.previewDeparture = null;
  updateSelectionUI();
  renderCalendar();

  submitBtn.disabled = false;
  submitBtn.textContent = "Anfrage senden";
});

document.getElementById("prevMonthsBtn").addEventListener("click", () => {
  state.monthOffset -= 1;
  renderCalendar();
});
document.getElementById("nextMonthsBtn").addEventListener("click", () => {
  state.monthOffset += 1;
  renderCalendar();
});

let touchStartX = 0;
calendarWrap.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
calendarWrap.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 40) return;
  state.monthOffset += delta < 0 ? 1 : -1;
  renderCalendar();
}, { passive: true });

document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightboxPrev").addEventListener("click", () => navLightbox(-1));
document.getElementById("lightboxNext").addEventListener("click", () => navLightbox(1));
document.getElementById("lightbox").addEventListener("click", (event) => {
  if (event.target.id === "lightbox") closeLightbox();
});
document.addEventListener("keydown", (event) => {
  const open = document.getElementById("lightbox").classList.contains("open");
  if (!open) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") navLightbox(-1);
  if (event.key === "ArrowRight") navLightbox(1);
});

function init() {
  seedData();
  state.bookings = getBookings();
  state.availability = buildAvailability(state.bookings);
  updateSelectionUI();
  renderCalendar();
  renderNextSlot();
  renderMosaic();
  startHeroRotation();
}

init();
