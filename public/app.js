const $ = (selector) => document.querySelector(selector);
const escape = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formatDistance = (km) => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
let points = [], origin = null, originMarker = null, selectedId = null, requestController = null;
const map = L.map('map', { scrollWheelZoom: false }).setView([-19.919, -43.954], 12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
const markers = new Map();
function routeUrl(point) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${point.lat},${point.lng}`);
  if (origin) url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  return url.href;
}
function icon(index, selected = false) { return L.divIcon({ className: '', html: `<div class="marker-number${selected ? ' chosen' : ''}"><span>${index + 1}</span></div>`, iconSize: [33, 33], iconAnchor: [16, 33], popupAnchor: [0, -30] }); }
function selectPoint(id, move = true) {
  selectedId = id;
  document.querySelectorAll('.point-card').forEach((card) => card.classList.toggle('selected', card.dataset.id === id));
  points.forEach((point, i) => markers.get(point.id)?.setIcon(icon(i, point.id === id)));
  const point = points.find((point) => point.id === id);
  if (move) { map.setView([point.lat, point.lng], 15); markers.get(id).openPopup(); }
  const card = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (card) $('#results').scrollTo({ top: card.offsetTop - $('#results').offsetTop, behavior: 'smooth' });
}
function showStatus(message = '', error = false) { $('#search-status').textContent = message; $('#search-status').classList.toggle('error', error); }
function fitPoints() {
  const coords = points.map((point) => [point.lat, point.lng]);
  if (origin) coords.push([origin.lat, origin.lng]);
  if (coords.length) map.fitBounds(coords, { padding: [45, 45], maxZoom: 14 });
}
function render() {
  markers.forEach((marker) => map.removeLayer(marker)); markers.clear();
  if (originMarker) map.removeLayer(originMarker);
  if (origin) originMarker = L.marker([origin.lat, origin.lng], { icon: L.divIcon({ className: '', html: '<div class="origin-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map).bindPopup('Seu endereço de referência');
  $('#origin').hidden = !origin; $('#origin-label').textContent = origin?.label || '';
  $('#results-title').textContent = origin ? 'Mais próximos de você' : 'Pontos em Belo Horizonte';
  $('#results-count').textContent = `${points.length} locais`;
  $('#distance-help').textContent = origin ? 'Distâncias aproximadas em linha reta. Consulte o trajeto antes de sair.' : 'Explore os locais ou busque para ordenar por proximidade.';
  $('#results').innerHTML = points.map((point, i) => {
    const marker = L.marker([point.lat, point.lng], { icon: icon(i), title: point.name, keyboard: true }).addTo(map).bindPopup(`<strong>${escape(point.name)}</strong><br>${escape(point.address)}<br><a href="${escape(routeUrl(point))}" target="_blank" rel="noopener noreferrer">Consultar trajeto</a>`);
    marker.on('click', () => selectPoint(point.id, false)); markers.set(point.id, marker);
    return `<article class="point-card" data-id="${escape(point.id)}"><span class="point-number" aria-hidden="true">${i + 1}</span><div><div class="point-header"><h3>${escape(point.name)}</h3>${origin ? `<span class="point-distance">${formatDistance(point.distanceKm)}</span>` : ''}</div><span class="point-type">${escape(point.category)} · ${escape(point.neighborhood)}</span><p class="point-address">${escape(point.address)}</p><p class="point-details">${escape(point.hours || 'Horário: confirme com o local.')}<br>${escape(point.conditions || 'Entregue o óleo frio em recipiente fechado. Confirme as condições de recebimento.')}</p><div class="point-actions"><a class="route" href="${escape(routeUrl(point))}" target="_blank" rel="noopener noreferrer" aria-label="Ver trajeto até ${escape(point.name)}">Ver trajeto</a><button type="button" data-point="${escape(point.id)}" aria-label="Mostrar ${escape(point.name)} no mapa">No mapa</button><a class="point-source" href="${escape(point.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fonte</a></div></div></article>`;
  }).join('');
  selectedId = null; fitPoints();
}
async function loadPoints() {
  try { const response = await fetch('/api/points'); if (!response.ok) throw new Error(); const data = await response.json(); points = data.points; $('#total-points').textContent = points.length; render(); }
  catch { $('#results').innerHTML = '<p class="loading">Não foi possível carregar os pontos. Recarregue a página para tentar novamente.</p>'; showStatus('Falha ao carregar a base de pontos de coleta.', true); }
}
$('#results').addEventListener('click', (event) => { const button = event.target.closest('[data-point]'); if (button) selectPoint(button.dataset.point); });
$('#fit-map').addEventListener('click', fitPoints);
$('#clear-search').addEventListener('click', async () => { requestController?.abort(); origin = null; $('#address').value = ''; showStatus(); await loadPoints(); $('#address').focus(); });
$('#search-form').addEventListener('submit', async (event) => {
  event.preventDefault(); requestController?.abort(); requestController = new AbortController();
  const query = $('#address').value.trim();
  $('#search-button').disabled = true; $('#spinner').hidden = false; showStatus('Localizando o endereço na base de Belo Horizonte…');
  try {
    const response = await fetch(`/api/search?${new URLSearchParams({ q: query })}`, { signal: requestController.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível realizar a consulta.');
    origin = data.origin; points = data.points; render();
    const notes = [];
    if (data.origin.approximate) notes.push('Usamos o número mais próximo disponível na base da PBH.');
    if (!data.nearbyCount) notes.push('Não há pontos cadastrados a até 5 km desse endereço. Confira as alternativas mais próximas abaixo.');
    showStatus(notes.join(' '));
  } catch (error) { if (error.name !== 'AbortError') showStatus(error.message, true); }
  finally { $('#search-button').disabled = false; $('#spinner').hidden = true; }
});
loadPoints();
