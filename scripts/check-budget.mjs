#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
/**
 * Budget de poids JS, vérifié en CI.
 *
 * Sans garde-fou, la homepage et les jeux prennent du poids commit après commit
 * sans que personne ne le remarque. Ici on échoue le build avant que ça arrive.
 *
 * Le budget porte sur le total JS émis : c'est une approximation volontairement
 * grossière mais suffisante pour détecter une dépendance lourde ajoutée par erreur.
 */
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Budget total du JS servi, en kilo-octets gzip. */
const TOTAL_BUDGET_KB = 250;
/** Budget d'un seul fichier — attrape une dépendance monolithique. */
const CHUNK_BUDGET_KB = 120;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const chunks = [];
for await (const file of walk(DIST)) {
  if (!file.endsWith('.js')) continue;
  const gzipped = gzipSync(readFileSync(file)).length / 1024;
  chunks.push({ path: relative(DIST, file), kb: gzipped });
}

chunks.sort((a, b) => b.kb - a.kb);
const total = chunks.reduce((sum, c) => sum + c.kb, 0);

console.log(`\nJS émis : ${chunks.length} fichiers, ${total.toFixed(1)} kB gzip\n`);
for (const chunk of chunks.slice(0, 10)) {
  console.log(`  ${chunk.kb.toFixed(1).padStart(7)} kB  ${chunk.path}`);
}

const failures = [];
if (total > TOTAL_BUDGET_KB) {
  failures.push(`total ${total.toFixed(1)} kB > budget ${TOTAL_BUDGET_KB} kB`);
}
for (const chunk of chunks) {
  if (chunk.kb > CHUNK_BUDGET_KB) {
    failures.push(`${chunk.path} : ${chunk.kb.toFixed(1)} kB > budget ${CHUNK_BUDGET_KB} kB`);
  }
}

if (failures.length > 0) {
  console.error('\n✗ Budget dépassé :');
  for (const failure of failures) console.error(`  · ${failure}`);
  console.error(
    '\nSoit tu allèges, soit tu relèves consciemment le budget dans scripts/check-budget.mjs.\n',
  );
  process.exit(1);
}

console.log('\n✓ Budget respecté\n');
