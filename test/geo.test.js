import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { coordinatesFromWkt, distanceKm, parseAddress, rankPoints } from '../lib/geo.js';

test('distância em km é simétrica e preserva origem coincidente', () => {
  const a = { lat: 0, lng: 0 }, b = { lat: 0, lng: 1 };
  assert.equal(distanceKm(a, a), 0);
  assert.ok(Math.abs(distanceKm(a, b) - 111.195) < 0.001);
  assert.equal(distanceKm(a, b), distanceKm(b, a));
});
test('ordena por distância sem modificar a base original', () => {
  const points = [{ id: 'longe', lat: 0, lng: 2 }, { id: 'perto', lat: 0, lng: 0.1 }];
  assert.deepEqual(rankPoints(points, { lat: 0, lng: 0 }).map((p) => p.id), ['perto', 'longe']);
  assert.equal(points[0].id, 'longe');
});
test('interpreta endereços com e sem vírgula e rejeita consultas fora do escopo', () => {
  assert.deepEqual(parseAddress('Avenida Afonso Pena, 1212'), { street: 'Afonso Pena', number: 1212 });
  assert.deepEqual(parseAddress('Rua Guaicuí 355, Belo Horizonte'), { street: 'Guaicuí', number: 355 });
  assert.equal(parseAddress('Rua Guaicuí'), null);
  assert.equal(parseAddress('Rua Beta, 401, Contagem'), null);
  assert.equal(parseAddress('Avenida Afonso Pena, 1212, São Paulo'), null);
});
test('converte UTM 23S para a localização de Belo Horizonte e rejeita WKT inválido', () => {
  const coords = coordinatesFromWkt('POINT(611346.2532381 7796618.60222302)');
  assert.ok(coords.lat > -19.93 && coords.lat < -19.90);
  assert.ok(coords.lng > -43.95 && coords.lng < -43.92);
  assert.throws(() => coordinatesFromWkt('POINT EMPTY'));
});
test('base publicada contém apenas pontos identificados, georreferenciados e com fonte', async () => {
  const points = JSON.parse(await readFile(new URL('../data/points.json', import.meta.url), 'utf8'));
  assert.ok(points.length >= 20);
  assert.equal(new Set(points.map((p) => p.id)).size, points.length);
  for (const point of points) {
    assert.equal(point.city, 'Belo Horizonte');
    assert.ok(Number.isFinite(point.lat) && Number.isFinite(point.lng));
    assert.ok(point.lat > -20.08 && point.lat < -19.70 && point.lng > -44.08 && point.lng < -43.83);
    assert.ok(point.sourceUrl.startsWith('https://www.oleoverderesiduos.com.br/'));
    assert.equal(point.number, point.geocodedNumber);
  }
});
