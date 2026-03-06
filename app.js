
const calendar=document.getElementById("calendarGrid")

let arrival=null
let departure=null

function renderCalendar(){

calendar.innerHTML=""

for(let i=1;i<=30;i++){

const el=document.createElement("div")
el.className="day"
el.innerText=i

el.onclick=()=>selectDay(i,el)

calendar.appendChild(el)

}

}

function selectDay(day,el){

if(!arrival){
arrival=day
el.classList.add("selected")
}else if(!departure){
departure=day
updateSelection()
}

}

function updateSelection(){

document.getElementById("arrivalText").innerText="Anreise: "+arrival
document.getElementById("departureText").innerText="Abreise: "+departure

document.getElementById("bookingForm").scrollIntoView({behavior:"smooth"})

}

document.getElementById("bookingForm").addEventListener("submit",e=>{

e.preventDefault()

document.getElementById("successBox").innerText="✓ Anfrage gesendet"

})

function renderGallery(){

const imgs=[
"images/Egmond Sonnenuntergang.jpg",
"images/Egmond Sterne.jpg",
"images/Egmond Abend.jpg",
"images/Egmond Fenster.jpg",
"images/Egmond app (1).jpeg",
"images/Egmond app (2).jpeg"
]

const g=document.getElementById("gallery")

imgs.forEach(src=>{

const img=document.createElement("img")
img.src=src
img.loading="lazy"

g.appendChild(img)

})

}

renderCalendar()
renderGallery()
