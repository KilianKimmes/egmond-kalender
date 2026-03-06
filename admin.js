
const ADMIN_STORAGE_KEYS={bookings:"egmond_bookings_v8",requests:"egmond_requests_v8",session:"egmond_admin_session_v8"};
const ADMIN_PASSWORD="FiegePils";
const bridgeDays={"2026-01-02":"Brückentag","2026-05-15":"Brückentag","2026-06-05":"Brückentag","2027-05-07":"Brückentag","2027-05-28":"Brückentag","2028-05-26":"Brückentag","2028-06-16":"Brückentag","2028-10-02":"Brückentag"};
let currentYear=new Date().getFullYear(),holidaysMap=new Map();
const loginPanel=document.getElementById("adminLoginPanel"),dashboardPanel=document.getElementById("dashboardPanel"),loginForm=document.getElementById("adminLoginForm"),loginError=document.getElementById("adminLoginError"),statGrid=document.getElementById("statGrid"),bookingList=document.getElementById("bookingList"),requestList=document.getElementById("requestList"),adminYearGrid=document.getElementById("adminYearGrid"),overviewYearTitle=document.getElementById("overviewYearTitle");
function getBookings(){try{return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEYS.bookings)||"[]")}catch{return[]}}
function setBookings(v){localStorage.setItem(ADMIN_STORAGE_KEYS.bookings,JSON.stringify(v))}
function getRequests(){try{return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEYS.requests)||"[]")}catch{return[]}}
function setRequests(v){localStorage.setItem(ADMIN_STORAGE_KEYS.requests,JSON.stringify(v))}
function parseISO(iso){const[y,m,d]=iso.split("-").map(Number);return new Date(y,m-1,d)}
function formatISO(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");return`${y}-${m}-${d}`}
function addDays(date,days){const c=new Date(date);c.setDate(c.getDate()+days);return c}
function formatDate(iso){return parseISO(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}
function diffNights(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000)}
function isLoggedIn(){return localStorage.getItem(ADMIN_STORAGE_KEYS.session)==="active"}
function setLoggedIn(v){if(v)localStorage.setItem(ADMIN_STORAGE_KEYS.session,"active");else localStorage.removeItem(ADMIN_STORAGE_KEYS.session)}
function nextArrivalLabel(bookings){const today=new Date(),startOfToday=new Date(today.getFullYear(),today.getMonth(),today.getDate());const future=bookings.filter(b=>parseISO(b.start)>=startOfToday).sort((a,b)=>parseISO(a.start)-parseISO(b.start))[0];return future?formatDate(future.start).slice(0,5):"–"}
function buildAvailability(bookings){
 const map=new Map(),ensure=iso=>{if(!map.has(iso))map.set(iso,{booked:false,halfStart:false,halfEnd:false,label:""});return map.get(iso)};
 bookings.forEach(booking=>{
  const start=parseISO(booking.start),end=parseISO(booking.end),lastNight=addDays(end,-1);
  if(booking.type==="arrival-departure"){ensure(formatISO(start)).halfStart=true;ensure(formatISO(lastNight)).halfEnd=true;ensure(formatISO(start)).label=booking.label;ensure(formatISO(lastNight)).label=booking.label}
  let cursor=new Date(start);
  while(cursor<end){
   const iso=formatISO(cursor),state=ensure(iso);
   if(booking.type==="full"){state.booked=true;state.label=booking.label}
   else if(iso!==formatISO(start)&&iso!==formatISO(lastNight)){state.booked=true;state.label=booking.label}
   cursor=addDays(cursor,1);
  }
 });
 return map;
}
function dayStateFor(map,iso){const e=map.get(iso);if(!e)return"free";if(e.booked)return"booked";if(e.halfStart)return"half-start";if(e.halfEnd)return"half-end";return"free"}
function labelFor(map,iso){return map.get(iso)?.label||""}
function isSpecialDay(iso){return holidaysMap.has(iso)||bridgeDays[iso]}
function openTab(tab,updateHash=true){document.querySelectorAll(".tab-btn").forEach(el=>el.classList.toggle("is-active",el.dataset.tab===tab));document.querySelectorAll(".tab-panel").forEach(panel=>panel.classList.toggle("hidden",panel.dataset.panel!==tab));if(updateHash)history.replaceState(null,"",`#${tab}`)}
function handleInitialHash(){const hash=location.hash.replace("#","");if(["overview","bookings","requests"].includes(hash))openTab(hash,false)}
function showDashboard(){loginPanel.classList.add("hidden");dashboardPanel.classList.remove("hidden");refreshDashboard();handleInitialHash()}
function showLogin(){loginPanel.classList.remove("hidden");dashboardPanel.classList.add("hidden")}
loginForm.addEventListener("submit",event=>{event.preventDefault();const value=document.getElementById("adminPassword").value;if(value!==ADMIN_PASSWORD){loginError.textContent="Falsches Passwort.";loginError.classList.remove("hidden");return}loginError.classList.add("hidden");setLoggedIn(true);showDashboard()});
document.addEventListener("click",event=>{
 const target=event.target.closest("[data-action], .tab-btn, [data-delete-booking], [data-archive-request], [data-delete-request]");if(!target)return;
 if(target.classList.contains("tab-btn")){openTab(target.dataset.tab);return}
 if(target.dataset.deleteBooking){setBookings(getBookings().filter(entry=>entry.id!==target.dataset.deleteBooking));refreshDashboard();return}
 if(target.dataset.archiveRequest){setRequests(getRequests().map(req=>req.id===target.dataset.archiveRequest?{...req,status:"archiviert"}:req));refreshDashboard();return}
 if(target.dataset.deleteRequest){setRequests(getRequests().filter(req=>req.id!==target.dataset.deleteRequest));refreshDashboard();return}
 if(target.dataset.action==="logout"){setLoggedIn(false);showLogin();return}
 if(target.dataset.action==="prev-year"){currentYear-=1;loadSpecialDays(currentYear).then(()=>renderYearOverview());return}
 if(target.dataset.action==="next-year"){currentYear+=1;loadSpecialDays(currentYear).then(()=>renderYearOverview());return}
 if(target.dataset.action==="print-year"){printYear();return}
});
function renderStats(){const bookings=getBookings(),requests=getRequests(),openRequests=requests.filter(r=>r.status!=="archiviert").length,currentMonth=new Date().getMonth(),monthBookings=bookings.filter(b=>parseISO(b.start).getMonth()===currentMonth).length;
 const stats=[{label:"Buchungen",value:bookings.length},{label:"Anfragen offen",value:openRequests},{label:"Start diesen Monat",value:monthBookings},{label:"Nächste Anreise",value:nextArrivalLabel(bookings)}];
 statGrid.innerHTML="";stats.forEach(stat=>{const card=document.createElement("article");card.className="stat-card";card.innerHTML=`<div class="label">${stat.label}</div><div class="value">${stat.value}</div>`;statGrid.appendChild(card)})}
function renderYearOverview(){
 const bookings=getBookings(),availability=buildAvailability(bookings);overviewYearTitle.textContent=String(currentYear);adminYearGrid.innerHTML="";
 for(let month=0;month<12;month++){
  const monthDate=new Date(currentYear,month,1),monthEnd=new Date(currentYear,month+1,0),firstWeekday=(monthDate.getDay()+6)%7;
  const card=document.createElement("article");card.className="year-month";card.innerHTML=`<h3 class="year-title">${monthDate.toLocaleDateString("de-DE",{month:"long"})}</h3>`;
  const weekdays=document.createElement("div");weekdays.className="mini-weekdays";["Mo","Di","Mi","Do","Fr","Sa","So"].forEach(label=>{const node=document.createElement("div");node.className="mini-weekday";node.textContent=label;weekdays.appendChild(node)});card.appendChild(weekdays);
  const grid=document.createElement("div");grid.className="mini-days";for(let i=0;i<firstWeekday;i++){const s=document.createElement("div");s.className="mini-spacer";grid.appendChild(s)}
  const names=new Set();
  for(let day=1;day<=monthEnd.getDate();day++){const iso=formatISO(new Date(currentYear,month,day)),btn=document.createElement("button");btn.type="button";btn.className="mini-day";btn.dataset.state=dayStateFor(availability,iso);if(isSpecialDay(iso))btn.dataset.special="true";btn.textContent=String(day);const name=labelFor(availability,iso);if(name)names.add(name);grid.appendChild(btn)}
  card.appendChild(grid);const line=document.createElement("div");line.className="mini-name";line.textContent=Array.from(names).slice(0,3).join(" · ");card.appendChild(line);adminYearGrid.appendChild(card);
 }
}
function renderBookingList(){
 const bookings=getBookings().sort((a,b)=>parseISO(a.start)-parseISO(b.start));bookingList.innerHTML="";
 if(!bookings.length){bookingList.innerHTML=`<div class="empty-state">Keine Buchungen.</div>`;return}
 bookings.forEach(booking=>{const item=document.createElement("article");item.className="data-item";item.innerHTML=`<div class="data-item-head"><div><h3>${booking.label}</h3><div class="data-meta"><span>${formatDate(booking.start)} – ${formatDate(booking.end)}</span><span>${diffNights(booking.start,booking.end)} Nächte</span></div></div><span class="pill ${booking.type==="arrival-departure"?"":"danger"}">${booking.type==="arrival-departure"?"Halbtags-Wechsel":"Normal"}</span></div><div class="data-actions"><button type="button" class="nav-pill admin" data-delete-booking="${booking.id}">Löschen</button></div>`;bookingList.appendChild(item)})
}
function renderRequestList(){
 const requests=getRequests();requestList.innerHTML="";
 if(!requests.length){requestList.innerHTML=`<div class="empty-state">Keine Anfragen.</div>`;return}
 requests.forEach(request=>{const item=document.createElement("article");item.className="data-item";item.innerHTML=`<div class="data-item-head"><div><h3>${request.name}</h3><div class="data-meta"><span>${request.email}</span><span>${request.phone||"–"}</span><span>${formatDate(request.arrival)} – ${formatDate(request.departure)}</span></div></div><span class="pill ${request.status==="archiviert"?"":"danger"}">${request.status}</span></div><div>${request.message||"Keine Nachricht."}</div><div class="data-actions"><button type="button" class="nav-pill admin" data-archive-request="${request.id}">Archivieren</button><button type="button" class="nav-pill admin" data-delete-request="${request.id}">Löschen</button></div>`;requestList.appendChild(item)})
}
function showFeedback(el,text,type="success"){el.textContent=text;el.className=`notice notice-${type}`}
document.getElementById("bookingAdminForm").addEventListener("submit",event=>{event.preventDefault();const start=document.getElementById("adminStart").value,end=document.getElementById("adminEnd").value,label=document.getElementById("adminLabel").value.trim(),feedback=document.getElementById("bookingAdminFeedback");if(!start||!end||!label||parseISO(end)<=parseISO(start)){showFeedback(feedback,"Bitte gültige Daten eingeben.","error");return}const bookings=getBookings();bookings.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),start,end,label,type:"full"});setBookings(bookings);event.target.reset();showFeedback(feedback,"Gespeichert.","success");refreshDashboard()});
async function loadSpecialDays(year){
 const special=new Map();
 try{const r=await fetch(`https://feiertage-api.de/api/?jahr=${year}&nur_land=NW`);if(r.ok){const data=await r.json();Object.values(data).forEach(entry=>{if(entry.datum)special.set(entry.datum,"Feiertag")})}}catch{}
 try{const r=await fetch(`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NW&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year}-12-31`);if(r.ok){const data=await r.json();data.forEach(entry=>{let cursor=parseISO(entry.startDate),end=parseISO(entry.endDate);while(cursor<=end){special.set(formatISO(cursor),"Ferien");cursor=addDays(cursor,1)}})}}catch{}
 Object.entries(bridgeDays).forEach(([iso,label])=>{if(iso.startsWith(String(year)))special.set(iso,label)});
 holidaysMap=special;
}
function buildPrintableHtml(year,bookings){
 const availability=buildAvailability(bookings);
 const months=Array.from({length:12},(_,month)=>{const monthDate=new Date(year,month,1),monthEnd=new Date(year,month+1,0),firstWeekday=(monthDate.getDay()+6)%7;let cells="";
 for(let i=0;i<firstWeekday;i++)cells+=`<div class="c empty"></div>`;
 for(let day=1;day<=monthEnd.getDate();day++){const iso=formatISO(new Date(year,month,day)),state=dayStateFor(availability,iso),label=labelFor(availability,iso),special=holidaysMap.has(iso)||bridgeDays[iso]?" special":"";cells+=`<div class="c ${state}${special}"><div class="d">${day}</div><div class="n">${label||""}</div></div>`}
 return `<section class="m"><h3>${monthDate.toLocaleDateString("de-DE",{month:"long"})}</h3><div class="w">${["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div>${d}</div>`).join("")}</div><div class="g">${cells}</div></section>`;
 }).join("");
 return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Egmond Kalender ${year}</title><style>@page{size:A4 landscape; margin:8mm}body{font-family:Arial,sans-serif; color:#1b140d; margin:0}.top{display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:8px}h1{font-size:17px; margin:0}.sub{font-size:10px; color:#6a5e50; margin-top:2px}.legend{display:flex; gap:12px; font-size:9px}.l{display:inline-flex; align-items:center; gap:5px}.s{width:10px; height:10px; border-radius:3px; display:inline-block; border:1px solid #cfc0ae}.b{background:#f5d3d1}.h{background:linear-gradient(135deg,#fff 0 50%, #f5d3d1 50% 100%)}.x{background:#f3efe7;border-color:#d9cfbf}.grid{display:grid; grid-template-columns:repeat(4,1fr); gap:7px}.m{border:1px solid #d9cec1; border-radius:9px; padding:6px; break-inside:avoid; background:#fff}.m h3{font-size:11px; margin:0 0 5px}.w,.g{display:grid; grid-template-columns:repeat(7,1fr); gap:2px}.w div{font-size:7px; text-align:center; color:#6f6253}.c{min-height:29px; border:1px solid #ece3da; border-radius:4px; padding:2px; background:#fff}.c.booked{background:#f5d3d1}.c.half-start{background:linear-gradient(135deg,#fff 0 50%, #f5d3d1 50% 100%)}.c.half-end{background:linear-gradient(135deg,#f5d3d1 0 50%, #fff 50% 100%)}.c.special{background:#f3efe7; box-shadow:inset 0 0 0 1px #d9cfbf}.c.empty{border:none; background:transparent; box-shadow:none}.d{font-size:7px; font-weight:700}.n{font-size:6px; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}</style></head><body><div class="top"><div><h1>Egmond – Belegungsübersicht ${year}</h1><div class="sub">A4 Querformat · Druckansicht</div></div><div class="legend"><span class="l"><span class="s b"></span>belegt</span><span class="l"><span class="s h"></span>halbtags</span><span class="l"><span class="s x"></span>Ferien · Feiertag · Brückentag</span></div></div><div class="grid">${months}</div></body></html>`
}
function printYear(){const w=window.open("","_blank","width=1200,height=900");if(!w)return;w.document.write(buildPrintableHtml(currentYear,getBookings()));w.document.close();w.focus();setTimeout(()=>w.print(),250)}
function refreshDashboard(){renderStats();renderYearOverview();renderBookingList();renderRequestList()}
async function init(){await loadSpecialDays(currentYear);if(isLoggedIn())showDashboard();else showLogin()}
init();
