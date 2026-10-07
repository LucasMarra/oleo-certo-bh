import { coordinatesFromWkt, parseAddress } from './geo.js';

const cache = new Map();
let nextSlot = 0;
export async function locateAddress(input) {
  const address = parseAddress(input);
  if (!address) return { error: 'Informe uma rua ou avenida com número em Belo Horizonte. Exemplo: Avenida Afonso Pena, 1212.', status: 400 };
  const key = `${address.street.toLocaleLowerCase('pt-BR')}:${address.number}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const slot = Math.max(Date.now(), nextSlot);
  if (slot - Date.now() > 8000) return { error: 'Há muitas consultas neste momento. Aguarde alguns segundos e tente novamente.', status: 429 };
  nextSlot = slot + 1100;
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, slot - Date.now())));
  const url = new URL(process.env.GEOCODER_URL || 'https://geocoder.pbh.gov.br/geocoder/v2/address');
  url.search = new URLSearchParams({ logradouro: address.street.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), numero: String(address.number) }).toString();
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'OleoCertoBH/1.0 (+https://github.com/LucasMarra/oleo-certo-bh)', 'Accept': 'application/json' }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Geocoder indisponível');
    const body = await response.json();
    const addresses = (body.endereco ?? []).filter((record) => record.wkt?.startsWith('POINT('));
    const uniqueStreets = new Set(addresses.map((r) => r.idlogradouro));
    if (uniqueStreets.size > 1) return { error: 'Encontramos mais de uma rua com esse nome. Informe o nome completo do logradouro e tente novamente.', status: 422 };
    if (!addresses.length) return { error: 'Não localizamos esse endereço na base de Belo Horizonte. Confira o nome da rua e o número.', status: 404 };
    const record = addresses.reduce((a, b) => Math.abs(Number(a.numero) - address.number) <= Math.abs(Number(b.numero) - address.number) ? a : b);
    const coords = coordinatesFromWkt(record.wkt);
    if (coords.lat < -20.08 || coords.lat > -19.70 || coords.lng < -44.08 || coords.lng > -43.83) return { error: 'A consulta deve usar um endereço no município de Belo Horizonte.', status: 422 };
    const value = { origin: { ...coords, label: `${record.tipologradouro} ${record.nomelogradouro}, ${record.numero} · ${record.bairropopular || 'Belo Horizonte'}`, approximate: Number(record.numero) !== address.number }, source: 'Base oficial de endereços da Prefeitura de Belo Horizonte' };
    if (cache.size >= 300) cache.delete(cache.keys().next().value);
    cache.set(key, { expires: Date.now() + 3600000, value });
    return value;
  } catch {
    return { error: 'A consulta de endereços está temporariamente indisponível. Você pode explorar os pontos no mapa e tentar novamente em instantes.', status: 503 };
  }
}
