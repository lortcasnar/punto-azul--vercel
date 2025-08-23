let MAP, markers = [];
const q = document.getElementById('q');
const fIndoor = document.getElementById('fIndoor');
const fOutdoor = document.getElementById('fOutdoor');
const minCourts = document.getElementById('minCourts');
const list = document.getElementById('clubList');

const CLUBS = [
  {"id":"houston-01","name":"Punto Azul Padel — Houston","city":"Houston","country":"USA","lat":29.7604,"lng":-95.3698,"courts":4,"indoor":true,"outdoor":false,"website":"#"},
  {"id":"austin-01","name":"Eastside Padel","city":"Austin","country":"USA","lat":30.2672,"lng":-97.7431,"courts":6,"indoor":false,"outdoor":true,"website":"#"},
  {"id":"acapulco-01","name":"Acapulco Beach Padel Club","city":"Acapulco","country":"Mexico","lat":16.863,"lng":-99.882,"courts":5,"indoor":false,"outdoor":true,"website":"#"},
  {"id":"madrid-01","name":"Centro Padel Madrid","city":"Madrid","country":"Spain","lat":40.4168,"lng":-3.7038,"courts":12,"indoor":true,"outdoor":true,"website":"#"},
  {"id":"dubai-01","name":"Dubai Marina Padel","city":"Dubai","country":"UAE","lat":25.08,"lng":55.14,"courts":8,"indoor":true,"outdoor":true,"website":"#"},
  {"id":"buenosaires-01","name":"Palermo Padel","city":"Buenos Aires","country":"Argentina","lat":-34.588,"lng":-58.43,"courts":7,"indoor":false,"outdoor":true,"website":"#"}
];

function clearMarkers(){ markers.forEach(m => m.remove()); markers = []; }
function ensureMap(){
  if (MAP) return;
  MAP = L.map('map', { scrollWheelZoom:false }).setView([30,-20], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(MAP);
}
function renderList(clubs){
  list.innerHTML = '';
  if (!clubs.length){ list.innerHTML = '<div class="muted">No clubs match your search.</div>'; return; }
  clubs.forEach(c => {
    const card = document.createElement('article');
    card.className = 'club';
    card.innerHTML = `
      <div class="row"><h3>${c.name}</h3><span class="muted">${c.city}, ${c.country}</span></div>
      <div class="muted">Courts: ${c.courts} · ${(c.indoor?'Indoor':'')}${(c.indoor&&c.outdoor?' + ':'')}${(c.outdoor?'Outdoor':'')}</div>
      ${c.website ? `<a class="cta" href="${c.website}" target="_blank" rel="noreferrer">Visit</a>` : ''}`;
    list.appendChild(card);
  });
}
function renderMarkers(clubs){
  ensureMap(); clearMarkers();
  clubs.forEach(c => {
    const m = L.marker([c.lat, c.lng]).addTo(MAP).bindPopup(`<strong>${c.name}</strong><br>${c.city}, ${c.country}<br/>Courts: ${c.courts}`);
    markers.push(m);
  });
}
function applyFilters(clubs){
  const term = (q.value || '').toLowerCase().trim();
  const min = Number(minCourts.value) || 0;
  return clubs.filter(c => {
    if (fIndoor.checked && !c.indoor) return false;
    if (fOutdoor.checked && !c.outdoor) return false;
    if (min > 0 && c.courts < min) return false;
    if (!term) return true;
    return (`${c.name} ${c.city} ${c.country}`.toLowerCase().includes(term));
  });
}
(function init(){
  function refresh(){ const filtered = applyFilters(CLUBS); renderList(filtered); renderMarkers(filtered); }
  [q, fIndoor, fOutdoor, minCourts].forEach(el => el.addEventListener('input', refresh));
  refresh();
})();
