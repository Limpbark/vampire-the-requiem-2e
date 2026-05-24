// Source generator for the Weapons & Armor compendium.
// Generates one JSON document per item under ./weapons-armor/.
// After running, compile to LevelDB with:
//   npx @foundryvtt/foundryvtt-cli package pack \
//     --in packs-src/weapons-armor --out packs/weapons-armor
//
// IDs are stable: they're derived from a hash of the item name so re-running
// the script overwrites the same files (no churn of random IDs in git).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "weapons-armor");

// Foundry document IDs are 16 alphanumeric chars. Hash the name to get a
// deterministic, stable ID. (Names are stable; the IDs are arbitrary
// identifiers — what matters is consistency across rebuilds.)
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function deterministicId(seed) {
  const buf = crypto.createHash("sha256").update(seed).digest();
  let out = "";
  for (let i = 0; i < 16; i++) out += ID_ALPHABET[buf[i] % ID_ALPHABET.length];
  return out;
}

// Build a safe filename from a name: alphanumerics/spaces -> underscores.
function safeFilename(name, id) {
  const slug = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${slug}_${id}.json`;
}

const FIREARM_IMG = "systems/vampire-the-requiem-2e/icons/placeholders/Firearm.svg";
const MELEE_IMG   = "systems/vampire-the-requiem-2e/icons/placeholders/Melee.svg";
const ARMOR_IMG   = "systems/vampire-the-requiem-2e/icons/placeholders/Armor.svg";

// ─── Ranged Weapons ─────────────────────────────────────────────────────────
// Source: Vampire: the Requiem 2E core rulebook, Ranged Weapons Chart.
// `clip` is the chart's Clip column; the "+1" denotes a round chambered in
// addition to the magazine — we encode the magazine capacity as `capacity`
// and mention the chambered round in the description.
const RANGED = [
  { name: "Revolver, Light",  damage: 1, ranges: [20, 40, 80],   capacity: 6,  chambered: 0, init: 0,  str: 2, size: 1, avail: 2, example: "SW M640 (.38 Special)" },
  { name: "Revolver, Heavy",  damage: 2, ranges: [35, 70, 140],  capacity: 6,  chambered: 0, init: -2, str: 3, size: 1, avail: 2, example: "SW M29 (.44 Magnum)" },
  { name: "Pistol, Light",    damage: 1, ranges: [20, 40, 80],   capacity: 17, chambered: 1, init: 0,  str: 2, size: 1, avail: 3, example: "Glock 17 (9mm)" },
  { name: "Pistol, Heavy",    damage: 2, ranges: [30, 60, 120],  capacity: 7,  chambered: 1, init: -2, str: 3, size: 1, avail: 3, example: "Colt M1911A1 (.45 ACP)" },
  { name: "SMG, Small",       damage: 1, ranges: [25, 50, 100],  capacity: 30, chambered: 1, init: -2, str: 2, size: 1, avail: 3, example: "Ingram Mac-10 (9mm)", note: "Capable of automatic fire." },
  { name: "SMG, Large",       damage: 2, ranges: [50, 100, 200], capacity: 30, chambered: 1, init: -3, str: 3, size: 2, avail: 3, example: "HK MP-5 (9mm)", note: "Capable of automatic fire." },
  { name: "Rifle",            damage: 4, ranges: [200, 400, 800],capacity: 5,  chambered: 1, init: -5, str: 2, size: 3, avail: 2, example: "Remington M-700 (.30-06)" },
  { name: "Assault Rifle",    damage: 3, ranges: [150, 300, 600],capacity: 42, chambered: 1, init: -3, str: 3, size: 3, avail: 3, example: "Steyr-AUG (5.56mm)", note: "Capable of automatic fire." },
  { name: "Shotgun",          damage: 3, ranges: [20, 40, 80],   capacity: 5,  chambered: 1, init: -4, str: 3, size: 2, avail: 2, example: "Remington M870 (12-gauge)", note: "9-again on short range." },
  { name: "Crossbow",         damage: 2, ranges: [40, 80, 160],  capacity: 1,  chambered: 0, init: -5, str: 3, size: 3, avail: 3, example: "" },
];

// ─── Melee Weapons ──────────────────────────────────────────────────────────
// Damage type defaults to lethal in template.json; blunt weapons we mark
// explicitly as bashing. "penetration" handles armour-piercing tags.
const MELEE = [
  { name: "Sap",             damage: 0, init: -1, str: 1, size: 1, avail: 1, dmgType: "bashing", special: "Stun" },
  { name: "Brass Knuckles",  damage: 0, init: 0,  str: 1, size: 1, avail: 1, dmgType: "bashing", special: "Uses Brawl to attack." },
  { name: "Baton",           damage: 1, init: -1, str: 2, size: 2, avail: 0, dmgType: "bashing", special: "" },
  { name: "Crowbar",         damage: 2, init: -2, str: 2, size: 2, avail: 1, dmgType: "lethal",  special: "" },
  { name: "Tire Iron",       damage: 1, init: -3, str: 2, size: 2, avail: 2, dmgType: "lethal",  special: "+1 Defense." },
  { name: "Chain",           damage: 1, init: -3, str: 2, size: 2, avail: 1, dmgType: "bashing", special: "May be used to grapple at range." },
  { name: "Shield (small)",  damage: 0, init: -2, str: 2, size: 2, avail: 2, dmgType: "bashing", special: "Concealed bonus to Defense." },
  { name: "Shield (large)",  damage: 2, init: -4, str: 3, size: 3, avail: 2, dmgType: "bashing", special: "Concealed bonus to Defense." },
  { name: "Knife",           damage: 0, init: -1, str: 1, size: 1, avail: 1, dmgType: "lethal",  special: "" },
  { name: "Rapier",          damage: 1, init: -2, str: 1, size: 2, avail: 2, dmgType: "lethal",  special: "Armor piercing 1.", penetration: 1 },
  { name: "Machete",         damage: 2, init: -2, str: 2, size: 2, avail: 2, dmgType: "lethal",  special: "" },
  { name: "Hatchet",         damage: 1, init: -2, str: 1, size: 1, avail: 1, dmgType: "lethal",  special: "" },
  { name: "Fire Ax",         damage: 3, init: -4, str: 3, size: 3, avail: 2, dmgType: "lethal",  special: "9-again, two-handed." },
  { name: "Chainsaw",        damage: 5, init: -6, str: 4, size: 3, avail: 3, dmgType: "lethal",  special: "9-again, two-handed." },
  { name: "Stake",           damage: 0, init: -4, str: 1, size: 1, avail: 0, dmgType: "lethal",  special: "Can stake a Vampire on an exceptional success or a targeted heart attack." },
  { name: "Spear",           damage: 2, init: -2, str: 2, size: 4, avail: 1, dmgType: "lethal",  special: "+1 Defense, two-handed." },
];

// ─── Armor ──────────────────────────────────────────────────────────────────
// `rating` is the general (non-ballistic) absorption; `ballistic` is the
// ballistic absorption. The chart prints them as "general/ballistic".
const ARMOR = [
  { name: "Reinforced Clothing", rating: 1, ballistic: 0, str: 1, defense: 0,  speed: 0,  avail: 1, era: "Modern",  coverage: ["torso", "arms", "legs"] },
  { name: "Kevlar Vest",         rating: 1, ballistic: 3, str: 1, defense: 0,  speed: 0,  avail: 1, era: "Modern",  coverage: ["torso"] },
  { name: "Flak Jacket",         rating: 2, ballistic: 4, str: 1, defense: -1, speed: 0,  avail: 2, era: "Modern",  coverage: ["torso", "arms"] },
  { name: "Full Riot Gear",      rating: 3, ballistic: 5, str: 2, defense: -2, speed: -1, avail: 3, era: "Modern",  coverage: ["torso", "arms", "legs"] },
  { name: "Leather (hard)",      rating: 2, ballistic: 0, str: 2, defense: -1, speed: 0,  avail: 1, era: "Archaic", coverage: ["torso", "arms"] },
  { name: "Chainmail",           rating: 3, ballistic: 1, str: 3, defense: -2, speed: -2, avail: 2, era: "Archaic", coverage: ["torso", "arms"] },
  { name: "Plate",               rating: 4, ballistic: 2, str: 3, defense: -2, speed: -3, avail: 4, era: "Archaic", coverage: ["torso", "arms", "legs"] },
];

// ─── Document builders ──────────────────────────────────────────────────────
function baseDoc(id, name, type, img, system) {
  return {
    _id: id,
    name,
    type,
    img,
    system,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _key: `!items!${id}`
  };
}

function firearmDoc(w) {
  const id = deterministicId(`firearm:${w.name}`);
  const chamberedNote = w.chambered ? ` (+${w.chambered} chambered, ${w.capacity + w.chambered} total)` : "";
  const exampleNote = w.example ? `<p><em>Example:</em> ${w.example}</p>` : "";
  const extraNote = w.note ? `<p>${w.note}</p>` : "";
  const description =
    `<p>${w.name}. Damage ${w.damage}L, ranges ${w.ranges.join("/")}, ` +
    `clip ${w.capacity}${chamberedNote}, initiative ${w.init >= 0 ? "+" : ""}${w.init}, ` +
    `Strength ${w.str}, Size ${w.size}, availability ${"•".repeat(w.avail) || "n/a"}.</p>` +
    extraNote + exampleNote;
  return baseDoc(id, w.name, "firearm",
    FIREARM_IMG,
    {
      damage: w.damage,
      initiativeMod: w.init,
      penetration: 0,
      noSuccessesToDamage: false,
      applyDefense: false,
      damageType: "lethal",
      ranges: { short: w.ranges[0], medium: w.ranges[1], long: w.ranges[2] },
      capacity: w.capacity,
      magazine: null,
      cartridge: w.example || "",
      strengthReq: w.str,
      traits: [],
      diceBonus: 0,
      size: w.size,
      equipped: false,
      isMagical: false,
      magicType: "",
      magicClass: "",
      unlockAttribute: "",
      quantity: 1,
      durability: 1,
      structure: { value: 1, max: 1 },
      mana: { value: 0, max: 0 },
      description,
      availability: w.avail,
      dicePool: { value: 0, attributes: ["attributes_physical.dexterity", "skills_physical.firearms"], macro: "", comment: "", ignoreUnskilled: false },
      effects: [],
      effectsActive: false,
      specialEffects: []
    });
}

function meleeDoc(w) {
  const id = deterministicId(`melee:${w.name}`);
  const special = w.special ? `<p><em>Special:</em> ${w.special}</p>` : "";
  const description =
    `<p>${w.name}. Damage ${w.damage}${w.dmgType === "bashing" ? "B" : "L"}, ` +
    `initiative ${w.init >= 0 ? "+" : ""}${w.init}, Strength ${w.str}, ` +
    `Size ${w.size}, availability ${"•".repeat(w.avail) || "n/a"}.</p>` + special;
  // Brass Knuckles use Brawl; everything else uses Weaponry.
  const skill = /brass knuckles/i.test(w.name) ? "skills_physical.brawl" : "skills_physical.weaponry";
  return baseDoc(id, w.name, "melee",
    MELEE_IMG,
    {
      damage: w.damage,
      initiativeMod: w.init,
      penetration: w.penetration || 0,
      noSuccessesToDamage: false,
      applyDefense: true,
      damageType: w.dmgType,
      strengthReq: w.str,
      traits: [],
      diceBonus: 0,
      size: w.size,
      equipped: false,
      isMagical: false,
      magicType: "",
      magicClass: "",
      unlockAttribute: "",
      quantity: 1,
      durability: 1,
      structure: { value: 1, max: 1 },
      mana: { value: 0, max: 0 },
      description,
      availability: w.avail,
      dicePool: { value: 0, attributes: ["attributes_physical.strength", skill], macro: "", comment: "", ignoreUnskilled: false },
      effects: [],
      effectsActive: false,
      specialEffects: []
    });
}

function armorDoc(a) {
  const id = deterministicId(`armor:${a.name}`);
  const coverageList = a.coverage.join(", ");
  const description =
    `<p><strong>${a.era}.</strong> ${a.name}. Rating ${a.rating}/${a.ballistic}, ` +
    `Strength ${a.str}, Defense ${a.defense}, Speed ${a.speed}, ` +
    `availability ${"•".repeat(a.avail) || "n/a"}.</p>` +
    `<p><em>Coverage:</em> ${coverageList}.</p>`;
  return baseDoc(id, a.name, "armor",
    ARMOR_IMG,
    {
      rating: a.rating,
      ballistic: a.ballistic,
      defenseMod: a.defense,
      speedMod: a.speed,
      strengthReq: a.str,
      traits: [],
      coverage: {
        torso: a.coverage.includes("torso"),
        arms: a.coverage.includes("arms"),
        legs: a.coverage.includes("legs"),
        head: a.coverage.includes("head")
      },
      equipped: false,
      isMagical: false,
      magicType: "",
      magicClass: "",
      unlockAttribute: "",
      quantity: 1,
      durability: 1,
      structure: { value: 1, max: 1 },
      mana: { value: 0, max: 0 },
      description,
      availability: a.avail,
      dicePool: { value: 0, attributes: [], macro: "", comment: "", ignoreUnskilled: false },
      effects: [],
      effectsActive: false,
      specialEffects: []
    });
}

// ─── Write everything ───────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

// Clean prior generated JSON (keep dotfiles).
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".json")) fs.unlinkSync(path.join(OUT_DIR, f));
}

const docs = [
  ...RANGED.map(firearmDoc),
  ...MELEE.map(meleeDoc),
  ...ARMOR.map(armorDoc),
];

for (const doc of docs) {
  const file = path.join(OUT_DIR, safeFilename(doc.name, doc._id));
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
}

console.log(`Wrote ${docs.length} item source files to ${OUT_DIR}`);
