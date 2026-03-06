
const STORAGE_KEYS={bookings:"egmond_bookings_v8",requests:"egmond_requests_v8"};
const HERO_IMAGES=["images/header_neu.jpg","images/Header_fenster.jpg","images/header_duenen.jpg","images/Header_strandkorb.jpg"];
const PHOTOS=[
{img:"images/header_neu.jpg",caption:"Außenansicht"},
{img:"images/Egmond Fenster.jpg",caption:"Fensterblick"},
{img:"images/Egmond Sonnenuntergang.jpg",caption:"Sonnenuntergang"},
{img:"images/Egmond app (1).jpeg",caption:"Wohnbereich"},
{img:"images/Egmond app (2).jpeg",caption:"Essbereich"},
{img:"images/Egmond app (3).jpeg",caption:"Schlafzimmer"},
{img:"images/Egmond app (4).jpeg",caption:"Küche"},
{img:"images/Egmond app (5).jpeg",caption:"Bad"},
{img:"images/Egmond Abend.jpg",caption:"Abendstimmung"}
];
const defaultBookings=[
{id:"b1",label:"Schmidt",start:"2026-03-16",end:"2026-03-21",type:"full"},
{id:"b2",label:"Meyer",start:"2026-03-28",end:"2026-04-03",type:"arrival-departure"},
{id:"b3",label:"Becker",start:"2026-04-18",end:"2026-04-23",type:"full"}
];
const bridgeDays={"2026-01-02":"Brückentag","2026-05-15":"Brückentag","2026-06-05":"Brückentag","2027-05-07":"Brückentag","2027-05-28":"Brückentag","2028-05-26":"Brückentag","2028-06-16":"Brückentag","2028-10-02":"Brückentag"};

function seedData(){if(!localStorage.getItem(STORAGE_KEYS.bookings))localStorage.setItem(STORAGE_KEYS.bookings,JSON.stringify(defaultBookings));if(!localStorage.getItem(STORAGE_KEYS.requests))localStorage.setItem(STORAGE_KEYS.requests,JSON.stringify([]));}
function getBookings(){try{return JSON.parse(localStorage.getItem(STORAGE_KEYS.bookings)||"[]")}catch{return[]}}
function getRequests(){try{return JSON.parse(localStorage.getItem(STORAGE_KEYS.requests)||"[]")}catch{return[]}}
function setRequests(v){localStorage.setItem(STORAGE_KEYS.requests,JSON.stringify(v))}
function parseISO(iso){const[y,m,d]=iso.split("-").map(Number);return new Date(y,m-1,d)}
function formatISO(date){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");return`${y}-${m}-${d}`}
function addDays(date,days){const c=new Date(date);c.setDate(c.getDate()+days);return c}
function formatDate(iso){return parseISO(iso).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}
function diffNights(a,b){return Math.round((parseISO(b)-parseISO(a))/86400000)}
function overlaps(a,b,c,d){return parseISO(a)<parseISO(d)&&parseISO(b)>parseISO(c)}
function isSameDay(a,b){return formatISO(a)===formatISO(b)}

function buildAvailability(bookings){
 const map=new Map(),ensure=iso=>{if(!map.has(iso))map.set(iso,{booked:false,halfStart:false,halfEnd:false});return map.get(iso)};
 bookings.forEach(booking=>{
  const start=parseISO(booking.start),end=parseISO(booking.end),lastNight=addDays(end,-1);
  if(booking.type==="arrival-departure"){ensure(formatISO(start)).halfStart=true;ensure(formatISO(lastNight)).halfEnd=true}
  let cursor=new Date(start);
  while(cursor<end){
   const iso=formatISO(cursor),state=ensure(iso);
   if(booking.type==="full") state.booked=true;
   else if(iso!==formatISO(start)&&iso!==formatISO(lastNight)) state.booked=true;
   cursor=addDays(cursor,1);
  }
 });
 return map;
}

const state={monthOffset:0,selectedArrival:null,selectedDeparture:null,previewDeparture:null,heroIndex:0,lightboxIndex:0,bookings:[],availability:new Map(),holidaysMap:new Map(),submitting:false};
const calendarMount=document.getElementById("calendarMount");
const calendarWrap=document.getElementById("calendarWrap");
const summaryArrival=document.getElementById("summaryArrival");
const summaryDeparture=document.getElementById("summaryDeparture");
const summaryNights=document.getElementById("summaryNights");
const selectionNotice=document.getElementById("selectionNotice");
const arrivalInput=document.getElementById("arrivalInput");
const departureInput=document.getElementById("departureInput");
const nextSlotBox=document.getElementById("nextSlotBox");
const bookingForm=document.getElementById("bookingForm");
const formError=document.getElementById("formError");
const formSuccess=document.getElementById("formSuccess");
const submitBtn=document.getElementById("submitBtn");

function startHeroRotation(){
 const a=document.getElementById("heroA"),b=document.getElementById("heroB");let active=a;
 setInterval(()=>{state.heroIndex=(state.heroIndex+1)%HERO_IMAGES.length;const next=active===a?b:a;next.style.backgroundImage=`url('${HERO_IMAGES[state.heroIndex]}')`;next.classList.add("active");active.classList.remove("active");active=next},5200);
}
function renderMiniGallery(){document.getElementById("miniGallery").innerHTML=PHOTOS.slice(0,3).map((p,i)=>`<button type="button" class="mini-card" data-photo-index="${i}" style="background-image:url('${p.img}')" aria-label="${p.caption}"></button>`).join("")}
function renderMosaic(){document.getElementById("galleryMosaic").innerHTML=PHOTOS.slice(0,7).map((p,i)=>`<button type="button" class="mosaic-tile ${i===0?"large":""}" data-photo-index="${i}" style="background-image:url('${p.img}')"><span class="mosaic-caption">${p.caption}</span></button>`).join("")}
function openLightbox(i){state.lightboxIndex=i;updateLightbox();document.getElementById("lightbox").classList.add("open");document.getElementById("lightbox").setAttribute("aria-hidden","false");document.body.style.overflow="hidden"}
function closeLightbox(){document.getElementById("lightbox").classList.remove("open");document.getElementById("lightbox").setAttribute("aria-hidden","true");document.body.style.overflow=""}
function navLightbox(d){state.lightboxIndex=(state.lightboxIndex+d+PHOTOS.length)%PHOTOS.length;updateLightbox()}
function updateLightbox(){const p=PHOTOS[state.lightboxIndex];document.getElementById("lightboxImage").style.backgroundImage=`url('${p.img}')`;document.getElementById("lightboxCaption").textContent=`${p.caption} · ${state.lightboxIndex+1}/${PHOTOS.length}`}
function isPast(iso){const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());return parseISO(iso)<today}
function getDayState(iso){const a=state.availability.get(iso);if(!a)return"free";if(a.booked)return"booked";if(a.halfStart)return"half-start";if(a.halfEnd)return"half-end";return"free"}
function isSpecialDay(iso){return state.holidaysMap.has(iso)||bridgeDays[iso]}
function canStartOn(iso){if(isPast(iso))return false;const s=getDayState(iso);return s!=="booked"&&s!=="half-end"}
function canEndOn(iso){if(isPast(iso))return false;return getDayState(iso)!=="booked"}
function canStayRange(startIso,endIso){
 if(!startIso||!endIso)return false;
 if(parseISO(endIso)<=parseISO(startIso))return false;
 for(const booking of state.bookings){
  if(overlaps(startIso,endIso,booking.start,booking.end)){
   if(booking.type==="arrival-departure"&&booking.start===endIso) continue;
   if(booking.type==="arrival-departure"&&booking.end===startIso) continue;
   return false;
  }
 }
 return true;
}
function updateSelectionUI(){
 arrivalInput.value=state.selectedArrival?formatDate(state.selectedArrival):"";
 departureInput.value=state.selectedDeparture?formatDate(state.selectedDeparture):"";
 summaryArrival.textContent=state.selectedArrival?formatDate(state.selectedArrival):"–";
 summaryDeparture.textContent=state.selectedDeparture?formatDate(state.selectedDeparture):"–";
 if(state.selectedArrival&&state.selectedDeparture){summaryNights.textContent=String(diffNights(state.selectedArrival,state.selectedDeparture));selectionNotice.textContent="Zeitraum gewählt.";selectionNotice.className="notice notice-success"}
 else if(state.selectedArrival){summaryNights.textContent="–";selectionNotice.textContent="Jetzt Abreise wählen.";selectionNotice.className="notice notice-info"}
 else{summaryNights.textContent="–";selectionNotice.textContent="Anreise wählen, dann Abreise wählen.";selectionNotice.className="notice notice-info"}
}
function setPreview(iso){
 if(!state.selectedArrival||state.selectedDeparture)return;
 if(parseISO(iso)<=parseISO(state.selectedArrival))return;
 if(!canEndOn(iso))return;
 state.previewDeparture=canStayRange(state.selectedArrival,iso)?iso:null;
 renderCalendar();
}
function clearPreview(){if(!state.previewDeparture)return;state.previewDeparture=null;renderCalendar()}
function handleDateClick(iso){
 formError.classList.add("hidden");formSuccess.classList.add("hidden");
 if(!state.selectedArrival||state.selectedDeparture){
  if(!canStartOn(iso))return;
  state.selectedArrival=iso;state.selectedDeparture=null;state.previewDeparture=null;updateSelectionUI();renderCalendar();return;
 }
 if(parseISO(iso)<=parseISO(state.selectedArrival)){
  if(!canStartOn(iso))return;
  state.selectedArrival=iso;state.selectedDeparture=null;state.previewDeparture=null;updateSelectionUI();renderCalendar();return;
 }
 if(!canEndOn(iso))return;
 if(!canStayRange(state.selectedArrival,iso)){selectionNotice.textContent="Zeitraum nicht verfügbar.";selectionNotice.className="notice notice-error";state.previewDeparture=null;renderCalendar();return}
 state.selectedDeparture=iso;state.previewDeparture=null;updateSelectionUI();renderCalendar();document.getElementById("nameInput").focus();document.getElementById("bookingForm").scrollIntoView({behavior:"smooth",block:"start"});
}
function createMonthCard(baseDate){
 const monthStart=new Date(baseDate.getFullYear(),baseDate.getMonth(),1),monthEnd=new Date(baseDate.getFullYear(),baseDate.getMonth()+1,0),firstWeekday=(monthStart.getDay()+6)%7,today=new Date();
 const card=document.createElement("article");card.className="month-card";card.innerHTML=`<div class="month-head"><div class="month-title">${monthStart.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}</div></div>`;
 const weekdays=document.createElement("div");weekdays.className="weekdays";["Mo","Di","Mi","Do","Fr","Sa","So"].forEach(label=>{const n=document.createElement("div");n.className="weekday";n.textContent=label;weekdays.appendChild(n)});card.appendChild(weekdays);
 const grid=document.createElement("div");grid.className="days-grid";
 for(let i=0;i<firstWeekday;i++){const s=document.createElement("div");s.className="day-spacer";grid.appendChild(s)}
 for(let day=1;day<=monthEnd.getDate();day++){
  const current=new Date(baseDate.getFullYear(),baseDate.getMonth(),day),iso=formatISO(current),btn=document.createElement("button");
  btn.type="button";btn.className="day-btn";btn.dataset.date=iso;btn.dataset.state=getDayState(iso);btn.dataset.past=String(isPast(iso));btn.dataset.weekend=String([0,6].includes(current.getDay()));btn.dataset.today=String(isSameDay(current,today));
  if(isSpecialDay(iso))btn.dataset.special="true";
  const inRange=state.selectedArrival&&state.selectedDeparture&&parseISO(iso)>parseISO(state.selectedArrival)&&parseISO(iso)<parseISO(state.selectedDeparture);
  const inPreview=state.selectedArrival&&state.previewDeparture&&parseISO(iso)>parseISO(state.selectedArrival)&&parseISO(iso)<parseISO(state.previewDeparture);
  if(inRange)btn.dataset.inRange="true";
  if(inPreview)btn.dataset.preview="true";
  if(iso===state.selectedArrival)btn.dataset.boundary="start";
  if(iso===state.selectedDeparture)btn.dataset.boundary="end";
  if(!state.selectedArrival||state.selectedDeparture){if(!canStartOn(iso))btn.disabled=true}
  else{if(parseISO(iso)>parseISO(state.selectedArrival)){if(!canEndOn(iso))btn.disabled=true}else if(!canStartOn(iso))btn.disabled=true}
  btn.innerHTML=`<span class="num">${day}</span>`;
  btn.addEventListener("pointerenter",()=>setPreview(iso));
  btn.addEventListener("focus",()=>setPreview(iso));
  btn.addEventListener("pointerleave",clearPreview);
  btn.addEventListener("blur",clearPreview);
  btn.addEventListener("click",()=>handleDateClick(iso));
  grid.appendChild(btn);
 }
 card.appendChild(grid);return card;
}
function renderCalendar(){calendarMount.innerHTML="";const now=new Date();[0,1].forEach(offset=>{const monthDate=new Date(now.getFullYear(),now.getMonth()+state.monthOffset+offset,1);calendarMount.appendChild(createMonthCard(monthDate))})}
function findNextFreeRange(minNights=4){
 const now=new Date(),horizon=365;
 for(let offset=0;offset<horizon;offset++){
  const start=formatISO(addDays(now,offset));if(!canStartOn(start))continue;let length=0;
  while(offset+length<horizon){const next=formatISO(addDays(now,offset+length+1));if(!canEndOn(next)||!canStayRange(start,next))break;length++;if(length>=minNights)return{start,end:next}}
 }
 return null;
}
function renderNextSlot(){const slot=findNextFreeRange();if(!slot){nextSlotBox.textContent="Kein längerer freier Zeitraum gefunden.";nextSlotBox.className="notice notice-error";return}nextSlotBox.textContent=`${formatDate(slot.start)} – ${formatDate(slot.end)} · ${diffNights(slot.start,slot.end)} Nächte`;nextSlotBox.className="notice notice-success"}
function validateForm(){if(!state.selectedArrival||!state.selectedDeparture)return"Bitte zuerst einen Zeitraum wählen.";const name=document.getElementById("nameInput").value.trim(),email=document.getElementById("emailInput").value.trim(),phone=document.getElementById("phoneInput").value.trim();if(!name)return"Bitte Namen eintragen.";if(!email||!email.includes("@"))return"Bitte gültige E-Mail eintragen.";if(!phone||phone.length<6)return"Bitte Telefonnummer eintragen.";return""}
function setSubmitState(s){state.submitting=s;submitBtn.disabled=s;submitBtn.textContent=s?"Wird gesendet …":"Anfrage senden"}
bookingForm.addEventListener("submit",event=>{
 event.preventDefault();if(state.submitting)return;formError.classList.add("hidden");formSuccess.classList.add("hidden");
 const error=validateForm();if(error){formError.textContent=error;formError.classList.remove("hidden");return}
 setSubmitState(true);
 const requests=getRequests();requests.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),createdAt:new Date().toISOString(),arrival:state.selectedArrival,departure:state.selectedDeparture,nights:diffNights(state.selectedArrival,state.selectedDeparture),name:document.getElementById("nameInput").value.trim(),email:document.getElementById("emailInput").value.trim(),phone:document.getElementById("phoneInput").value.trim(),message:document.getElementById("messageInput").value.trim(),status:"neu"});setRequests(requests);
 formSuccess.textContent="✓ Anfrage gesendet.";formSuccess.classList.remove("hidden");bookingForm.reset();state.selectedArrival=null;state.selectedDeparture=null;state.previewDeparture=null;updateSelectionUI();renderCalendar();setSubmitState(false);
});
function scrollToTarget(hash,pushHash=false){const t=document.querySelector(hash);if(!t)return;t.scrollIntoView({behavior:"smooth",block:"start"});if(pushHash)history.replaceState(null,"",hash)}
function handleDeepLink(){if(!location.hash)return;const hash=location.hash;if(["#booking","#gallery","#top"].includes(hash))setTimeout(()=>scrollToTarget(hash),60)}
document.addEventListener("click",event=>{
 const el=event.target.closest("[data-action], [data-scroll-target], [data-photo-index]");if(!el)return;
 if(el.dataset.scrollTarget){event.preventDefault();scrollToTarget(el.dataset.scrollTarget,true);return}
 if(el.dataset.photoIndex){openLightbox(Number(el.dataset.photoIndex));return}
 if(el.dataset.action==="prev-months"){state.monthOffset-=1;renderCalendar()}
 if(el.dataset.action==="next-months"){state.monthOffset+=1;renderCalendar()}
});
let touchStartX=0;
calendarWrap.addEventListener("touchstart",e=>{touchStartX=e.changedTouches[0].clientX},{passive:true});
calendarWrap.addEventListener("touchend",e=>{const delta=e.changedTouches[0].clientX-touchStartX;if(Math.abs(delta)<40)return;state.monthOffset+=delta<0?1:-1;renderCalendar()},{passive:true});
document.getElementById("lightboxClose").addEventListener("click",closeLightbox);
document.getElementById("lightboxPrev").addEventListener("click",()=>navLightbox(-1));
document.getElementById("lightboxNext").addEventListener("click",()=>navLightbox(1));
document.getElementById("lightbox").addEventListener("click",e=>{if(e.target.id==="lightbox")closeLightbox()});
window.addEventListener("hashchange",handleDeepLink);window.addEventListener("load",handleDeepLink);
document.addEventListener("keydown",event=>{const open=document.getElementById("lightbox").classList.contains("open");if(!open)return;if(event.key==="Escape")closeLightbox();if(event.key==="ArrowLeft")navLightbox(-1);if(event.key==="ArrowRight")navLightbox(1)});
async function loadExternalDates(year){
 const special=new Map();
 try{const r=await fetch(`https://feiertage-api.de/api/?jahr=${year}&nur_land=NW`);if(r.ok){const data=await r.json();Object.values(data).forEach(entry=>{if(entry.datum)special.set(entry.datum,"Feiertag")})}}catch{}
 try{const r=await fetch(`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&subdivisionCode=DE-NW&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year}-12-31`);if(r.ok){const data=await r.json();data.forEach(entry=>{let cursor=parseISO(entry.startDate),end=parseISO(entry.endDate);while(cursor<=end){special.set(formatISO(cursor),"Ferien");cursor=addDays(cursor,1)}})}}catch{}
 Object.entries(bridgeDays).forEach(([iso,label])=>{if(iso.startsWith(String(year)))special.set(iso,label)});
 return special;
}
async function init(){seedData();state.bookings=getBookings();state.availability=buildAvailability(state.bookings);state.holidaysMap=await loadExternalDates(new Date().getFullYear());renderMiniGallery();renderMosaic();updateSelectionUI();renderCalendar();renderNextSlot();startHeroRotation()}
init();
