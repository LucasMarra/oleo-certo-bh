import { readFile, writeFile } from 'node:fs/promises';
import { coordinatesFromWkt } from '../lib/geo.js';

const seeds = JSON.parse(await readFile(new URL('../data/points-source.json', import.meta.url), 'utf8'));
const existing = JSON.parse(await readFile(new URL('../data/points.json', import.meta.url), 'utf8'));
const output = [], failed = [];
for (const [i, [name, street, number, neighborhood, category]] of seeds.entries()) {
  const id = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cached = existing.find((point) => point.id === id);
  if (cached) { output.push(cached); continue; }
  try {
    const logradouro = street.replace(/^(Rua|Avenida|Praça) /, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const params = new URLSearchParams({ logradouro, numero: String(number) });
    const response = await fetch(`https://geocoder.pbh.gov.br/geocoder/v2/address?${params}`, { headers: { 'User-Agent': 'OleoCertoBH/1.0 (+https://github.com/LucasMarra/oleo-certo-bh)' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const list = data.endereco || [];
    if (!list.length || new Set(list.map((r) => r.idlogradouro)).size > 1) throw new Error('Endereço não localizado de forma inequívoca');
    const record = list.reduce((a, b) => Math.abs(Number(a.numero) - number) <= Math.abs(Number(b.numero) - number) ? a : b);
    const { lat, lng } = coordinatesFromWkt(record.wkt);
    if (lat < -20.08 || lat > -19.70 || lng < -44.08 || lng > -43.83) throw new Error('Coordenadas fora da área de Belo Horizonte');
    output.push({ id, name, address: `${street}, ${number} · ${neighborhood}, Belo Horizonte`, street, number, neighborhood, city: 'Belo Horizonte', category, lat, lng, coordinateApproximate: Number(record.numero) !== number, geocodedNumber: Number(record.numero), sourceName: 'Óleo Verde', sourceUrl: 'https://www.oleoverderesiduos.com.br/ecopontos/', hours: null, conditions: null });
    console.log(`${i + 1}/${seeds.length}: ${name} (${Number(record.numero) === number ? 'número exato' : 'posição aproximada'})`);
  } catch (error) { failed.push({ name, street, number, reason: error.message }); console.log(`Pendente: ${name} — ${error.message}`); }
  await writeFile(new URL('../data/points.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
await writeFile(new URL('../data/geocoding-pending.json', import.meta.url), JSON.stringify(failed, null, 2) + '\n');
console.log(`Base: ${output.length} pontos publicados; ${failed.length} endereços pendentes, excluídos do mapa.`);
if (!output.length) process.exitCode = 1;
