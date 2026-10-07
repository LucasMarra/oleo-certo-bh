import proj4 from 'proj4';

const SIRGAS23S = '+proj=utm +zone=23 +south +ellps=GRS80 +units=m +no_defs';
export function coordinatesFromWkt(wkt) {
  const match = /^POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)$/i.exec(wkt ?? '');
  if (!match) throw new Error('Coordenada inválida na resposta da PBH.');
  const [lng, lat] = proj4(SIRGAS23S, 'EPSG:4326', [Number(match[1]), Number(match[2])]);
  return { lat, lng };
}
export function distanceKm(a, b) {
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function rankPoints(points, origin) {
  return points.map((point) => ({ ...point, distanceKm: distanceKm(origin, point) })).sort((a, b) => a.distanceKm - b.distanceKm);
}
export function parseAddress(input) {
  const text = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (text.length < 5 || text.length > 180) return null;
  if (/(?:contagem|nova lima|betim|santa luzia|lagoa santa|sao paulo|são paulo|rio de janeiro)/i.test(text)) return null;
  const match = /^(.*?),?\s+(\d{1,6})(?:[a-z])?(?=\s*(?:,|\s+-|$))\s*(?:[,\s-].*)?$/i.exec(text);
  if (!match) return null;
  const street = match[1].replace(/,\s*$/, '').replace(/^(?:rua|r\.?|avenida|av\.?|ave\.?|praça|praca|pç\.?|alameda)\s+/i, '').trim();
  return street.length >= 3 ? { street, number: Number(match[2]) } : null;
}
