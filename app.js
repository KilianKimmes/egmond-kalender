
const MIN_STAY = 3
const PRICE_PER_NIGHT = 120

let arrival=null
let departure=null

const calendar=document.getElementById("calendar")

function renderCalendar(){

calendar.innerHTML=""

for(let i=1;i<=30;i++){

const d=document.createElement("div")
d.className="day"
d.innerText=i

d.addEventListener("click",()=>selectDay(i,d))

calendar.appendChild(d)

}

}

function selectDay(day,el){

if(!arrival){
arrival=day
el.classList.add("selected")
}else if(!departure){
departure=day

if(departure-arrival<MIN_STAY){
alert("Mindestaufenthalt "+MIN_STAY+" Nächte")
arrival=null
departure=null
renderCalendar()
return
}

updateSelection()
}

}

function updateSelection(){

document.getElementById("selArrival").innerText="Anreise: "+arrival
document.getElementById("selDeparture").innerText="Abreise: "+departure

const nights=departure-arrival

document.getElementById("selNights").innerText="Nächte: "+nights
document.getElementById("priceEstimate").innerText="≈ "+(nights*PRICE_PER_NIGHT)+" €"

document.getElementById("bookingForm").scrollIntoView({behavior:"smooth"})

}

document.getElementById("bookingForm").addEventListener("submit",(e)=>{

e.preventDefault()

document.getElementById("successMessage").innerText="✓ Anfrage gesendet. Wir melden uns bald."

})

renderCalendar()
