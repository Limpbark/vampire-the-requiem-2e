import { MTA } from "./config.js";

/**
 * Rules of the Kindred body (Vampire: The Requiem 2E, chapter 3) as plain
 * functions: no Foundry globals, no documents, nothing asynchronous. Every
 * function takes numbers and returns numbers, so the arithmetic can be
 * checked outside the game. The dialogs and updates that use them live in
 * actor-kindred.js.
 */

const int = (v) => Math.round(Number(v) || 0);
const atLeast0 = (v) => Math.max(0, int(v));
const clamp = (v, lo, hi) => Math.min(Math.max(int(v), lo), hi);

/* -------------------------------------------- */
/*  Health track                                */
/* -------------------------------------------- */

/**
 * Wounds on a Health track. The system stores three counters that each count
 * boxes NOT yet filled to that severity: `value` (no damage at all), `lethal`
 * (not lethal or worse) and `aggravated` (not aggravated).
 * @param {{max:number, value:number, lethal:number, aggravated:number}} health
 * @returns {{max:number, bashing:number, lethal:number, aggravated:number, empty:number}}
 */
export function woundCounts(health) {
  const max = atLeast0(health?.max);
  const aggLeft = clamp(health?.aggravated ?? max, 0, max);
  const lethalLeft = clamp(health?.lethal ?? aggLeft, 0, aggLeft);
  const empty = clamp(health?.value ?? lethalLeft, 0, lethalLeft);
  return {
    max,
    aggravated: max - aggLeft,
    lethal: aggLeft - lethalLeft,
    bashing: lethalLeft - empty,
    empty
  };
}

/**
 * The inverse of woundCounts: the three stored counters for a track of `max`
 * boxes carrying the given wounds. Wounds beyond the track are dropped,
 * least severe first.
 * @returns {{max:number, value:number, lethal:number, aggravated:number}}
 */
export function healthCounters({ max, bashing = 0, lethal = 0, aggravated = 0 }) {
  max = atLeast0(max);
  const agg = Math.min(atLeast0(aggravated), max);
  const let_ = Math.min(atLeast0(lethal), max - agg);
  const bash = Math.min(atLeast0(bashing), max - agg - let_);
  return { max, aggravated: max - agg, lethal: max - agg - let_, value: max - agg - let_ - bash };
}

/**
 * What a full Health track means for a vampire (VtR 2E p. 90): bashing in the
 * last box leaves her conscious, lethal there means torpor at the end of her
 * turn, aggravated there means Final Death.
 * @returns {"ok"|"bashingFull"|"torpor"|"finalDeath"}
 */
export function kindredTrackState(health) {
  const w = woundCounts(health);
  if (w.max === 0 || w.empty > 0) return "ok";
  if (w.aggravated >= w.max) return "finalDeath";
  if (w.bashing === 0) return "torpor";
  return "bashingFull";
}

/* -------------------------------------------- */
/*  Damage intake                               */
/* -------------------------------------------- */

/**
 * Sources of harm, by how a Kindred body treats them.
 * - mundane: ordinary weapons and accidents. Lethal becomes bashing, and what
 *   would be aggravated to a mortal becomes lethal (p. 90).
 * - supernatural: fangs, claws and powers that say they harm Kindred fully.
 * - fire, bane: aggravated as dealt; Resilience helps.
 * - sunlight: as dealt; Resilience never helps.
 */
export const DAMAGE_SOURCES = ["mundane", "supernatural", "fire", "bane", "sunlight"];

/**
 * Convert damage, stated as its source would deal it to a mortal, into what a
 * vampire actually suffers.
 * @param {{bashing?:number, lethal?:number, aggravated?:number}} damage
 * @param {object} [o]
 * @param {string}  [o.source="mundane"]        One of DAMAGE_SOURCES.
 * @param {number}  [o.resilience=0]            Dots of Resilience.
 * @param {boolean} [o.resilienceActive=false]  The active effect was paid for
 *                                              this turn (1 Vitae, p. 141).
 * @returns {{bashing:number, lethal:number, aggravated:number, soaked:number, downgraded:number}}
 */
export function kindredIntake(damage, { source = "mundane", resilience = 0, resilienceActive = false } = {}) {
  let bashing = atLeast0(damage?.bashing);
  let lethal = atLeast0(damage?.lethal);
  let aggravated = atLeast0(damage?.aggravated);
  resilience = atLeast0(resilience);

  if (source === "mundane") {
    bashing += lethal;
    lethal = aggravated;
    aggravated = 0;
  }

  let soaked = 0;
  let downgraded = 0;
  if (source !== "sunlight" && resilience > 0) {
    if (resilienceActive) {
      // Dots + 1 off ordinary harm, dots alone off fire and banes. The worst
      // wounds are dismissed first.
      let budget = (source === "fire" || source === "bane") ? resilience : resilience + 1;
      const take = (n) => { const t = Math.min(n, budget); budget -= t; soaked += t; return n - t; };
      aggravated = take(aggravated);
      lethal = take(lethal);
      bashing = take(bashing);
    }
    // Always on: one point of aggravated per dot becomes lethal.
    downgraded = Math.min(aggravated, resilience);
    aggravated -= downgraded;
    lethal += downgraded;
  }
  return { bashing, lethal, aggravated, soaked, downgraded };
}

/** "3 lethal, 1 bashing", or "no damage". */
export function describeDamage({ bashing = 0, lethal = 0, aggravated = 0 } = {}) {
  const parts = [];
  if (aggravated) parts.push(`${aggravated} aggravated`);
  if (lethal) parts.push(`${lethal} lethal`);
  if (bashing) parts.push(`${bashing} bashing`);
  return parts.length ? parts.join(", ") : "no damage";
}

/* -------------------------------------------- */
/*  Sunlight and fire                           */
/* -------------------------------------------- */

/**
 * Sunlight (VtR 2E p. 102). Humanity sets how much damage and of what type;
 * Blood Potency sets how often it lands.
 * @param {object} o
 * @param {number}  o.humanity        Current dots, already lowered for a Mekhet.
 * @param {number}  o.bloodPotency
 * @param {boolean} [o.eyesOnly=false] Covered but for the eyes: one step slower.
 * @param {number}  [o.intervals=1]   Intervals of exposure to total up.
 * @returns {{amount:number, type:string, times:number, interval:string, label:string, perInterval:number, total:number}}
 */
export function sunlightExposure({ humanity, bloodPotency, eyesOnly = false, intervals = 1 }) {
  const level = MTA.humanity_levels[clamp(humanity, 0, 10)];
  const bp = MTA.bloodPotency_levels[clamp(bloodPotency, 0, 10)];
  const step = Math.max(0, bp.sunlightStep - (eyesOnly ? 1 : 0));
  const frequency = MTA.sunlightFrequencies[step];
  const perInterval = level.sunlight.amount * frequency.times;
  return {
    amount: level.sunlight.amount,
    type: level.sunlight.type,
    times: frequency.times,
    interval: frequency.interval,
    label: frequency.label,
    perInterval,
    total: perInterval * atLeast0(intervals)
  };
}

/**
 * Fire (VtR 2E p. 103): aggravated damage each turn of exposure, from the
 * size of the fire plus its heat. Resilience is applied by kindredIntake.
 * @returns {number} Aggravated damage for one turn.
 */
export function fireDamage({ size = "torch", heat = "candle" } = {}) {
  return (MTA.fireSizes[size]?.damage ?? 0) + (MTA.fireHeats[heat]?.damage ?? 0);
}

/* -------------------------------------------- */
/*  Mending and the day's sleep                 */
/* -------------------------------------------- */

/** Vitae to mend wounds on the spot: 1 per two bashing, 1 per lethal (p. 91). */
export function mendCost({ bashing = 0, lethal = 0 } = {}) {
  return Math.ceil(atLeast0(bashing) / 2) + atLeast0(lethal);
}

/**
 * What spending some Vitae on mending closes (p. 91). Bashing goes first in
 * pairs, since one Vitae closes two of those; then lethal; then a last odd
 * bashing. That clears the most boxes for the Vitae, and when a Vitae would
 * close one box either way it closes the lethal one.
 * @param {{bashing?:number, lethal?:number}} wounds
 * @param {number} vitae  Vitae to spend; any beyond what the wounds need is kept.
 * @returns {{bashing:number, lethal:number, cost:number}}
 */
export function mendPlan({ bashing = 0, lethal = 0 } = {}, vitae = 0) {
  bashing = atLeast0(bashing);
  lethal = atLeast0(lethal);
  let left = atLeast0(vitae);
  const pairs = Math.min(Math.floor(bashing / 2), left);
  left -= pairs;
  const mendLethal = Math.min(lethal, left);
  left -= mendLethal;
  const odd = bashing % 2 === 1 && left > 0 ? 1 : 0;
  left -= odd;
  return { bashing: pairs * 2 + odd, lethal: mendLethal, cost: atLeast0(vitae) - left };
}

/** An aggravated wound takes this much Vitae and a full day's sleep (p. 91). */
export const AGGRAVATED_MEND_COST = 5;

/**
 * What a day's sleep does to a wounded vampire (VtR 2E p. 91, p. 98). The
 * body heals every wound it can pay for, cheapest first, unless the vampire
 * spent Willpower to keep it (1 per wound). Vitae already set aside towards
 * an aggravated wound is used before fresh Vitae, and only whole wounds are
 * paid for. Waking then costs 1 Vitae; with none left she drifts into torpor.
 * @param {object} o
 * @param {{bashing:number, lethal:number, aggravated:number}} o.wounds
 * @param {number} o.vitae
 * @param {number} [o.banked=0]   Vitae already spent towards aggravated wounds.
 * @param {{bashing?:number, lethal?:number, aggravated?:number}} [o.preserve]
 */
export function daysleepPlan({ wounds, vitae, banked = 0, preserve = {} }) {
  const kept = {
    bashing: clamp(preserve.bashing, 0, atLeast0(wounds?.bashing)),
    lethal: clamp(preserve.lethal, 0, atLeast0(wounds?.lethal)),
    aggravated: clamp(preserve.aggravated, 0, atLeast0(wounds?.aggravated))
  };
  let left = atLeast0(vitae);
  banked = atLeast0(banked);

  const bashing = Math.min(atLeast0(wounds?.bashing) - kept.bashing, left * 2);
  left -= Math.ceil(bashing / 2);

  const lethal = Math.min(atLeast0(wounds?.lethal) - kept.lethal, left);
  left -= lethal;

  const aggravated = Math.min(
    atLeast0(wounds?.aggravated) - kept.aggravated,
    Math.floor((banked + left) / AGGRAVATED_MEND_COST)
  );
  const aggCost = aggravated * AGGRAVATED_MEND_COST;
  const bankedUsed = Math.min(banked, aggCost);
  left -= aggCost - bankedUsed;

  const canWake = left >= 1;
  return {
    healed: { bashing, lethal, aggravated },
    preserved: kept,
    willpowerCost: kept.bashing + kept.lethal + kept.aggravated,
    vitaeSpent: atLeast0(vitae) - left,
    bankedUsed,
    bankedLeft: banked - bankedUsed,
    vitaeBeforeWaking: left,
    canWake,
    vitaeAfterWaking: canWake ? left - 1 : 0
  };
}

/* -------------------------------------------- */
/*  Feeding                                     */
/* -------------------------------------------- */

/** Vitae an animal of a given Size can give (VtR 2E p. 95). */
export function animalVitae(size) {
  size = atLeast0(size);
  if (size === 0) return 0;
  if (size === 1) return 1;
  if (size <= 3) return 2;
  if (size <= 5) return 3;
  return 3 + (size - 5);
}

/**
 * Kinds of vessel. `rank` indexes MTA.feedingSources; `cold` blood (from a
 * corpse or a bag) takes Blood Potency x 2 pints for each Vitae.
 */
export const VESSELS = {
  human: { label: "Living human", rank: 1 },
  animal: { label: "Animal", rank: 0 },
  kindred: { label: "Kindred Vitae", rank: 2 },
  cold: { label: "Cold human blood", rank: 1 }
};

/**
 * Work out one feeding (VtR 2E p. 89, p. 95).
 * @param {object} o
 * @param {string} o.vessel        Key of VESSELS.
 * @param {number} o.requested     Vitae the vampire means to take.
 * @param {number} o.bloodPotency
 * @param {number} o.vitae         Her current Vitae.
 * @param {number} o.maxVitae      Her capacity.
 * @param {number} [o.willpower]   Willpower points she has, for feeding
 *                                 beneath her Blood Potency. Unlimited if omitted.
 * @param {number} [o.health]      Human vessel: unmodified Health dots.
 * @param {number} [o.stamina]     Human vessel: Stamina dots.
 * @param {number} [o.size]        Animal vessel: Size. Unlimited if omitted.
 * @param {number} [o.vesselVitae] Kindred vessel: Vitae they hold.
 */
export function feedingPlan({ vessel, requested, bloodPotency, vitae, maxVitae, willpower, health, stamina, size, vesselVitae }) {
  const kind = VESSELS[vessel] ?? VESSELS.human;
  const bp = clamp(bloodPotency, 0, 10);
  const needsRank = MTA.feedingSources.indexOf(MTA.bloodPotency_levels[bp].feedsFrom);
  const beneath = kind.rank < needsRank;

  let capacity = Infinity;
  if (vessel === "human" && health != null) capacity = atLeast0(health);
  if (vessel === "animal" && size != null) capacity = animalVitae(size);
  if (vessel === "kindred" && vesselVitae != null) capacity = atLeast0(vesselVitae);

  const room = Math.max(0, atLeast0(maxVitae) - atLeast0(vitae));
  let gained = Math.min(atLeast0(requested), capacity, room);
  // Blood beneath her station costs a Willpower point for every Vitae.
  if (beneath && willpower != null) gained = Math.min(gained, atLeast0(willpower));

  return {
    gained,
    capacity,
    room,
    beneath,
    feedsFrom: MTA.bloodPotency_levels[bp].feedsFrom,
    willpowerCost: beneath ? gained : 0,
    // A living mortal takes a point of lethal damage for each Vitae taken.
    vesselLethal: vessel === "human" ? gained : 0,
    vesselVitaeLoss: vessel === "kindred" ? gained : 0,
    // More Vitae than the vessel's Stamina leaves them Drained.
    drained: vessel === "human" && stamina != null && gained > atLeast0(stamina),
    coldPints: vessel === "cold" ? gained * bp * 2 : 0
  };
}

/** Starting Vitae: one die's face value plus Feeding Grounds, up to capacity (p. 95). */
export function startingVitae({ die, feedingGrounds = 0, maxVitae }) {
  return Math.min(atLeast0(maxVitae), clamp(die, 1, 10) + atLeast0(feedingGrounds));
}

/* -------------------------------------------- */
/*  Humanity                                    */
/* -------------------------------------------- */

/**
 * The modifier Humanity puts on rolls to relate to mortals (VtR 2E p. 106).
 * @returns {{modifier:number, chance:boolean}} `chance` means the roll is
 *   reduced to a chance die, whatever the pool.
 */
export function mortalsModifier(humanity) {
  const value = MTA.humanity_levels[clamp(humanity, 0, 10)].mortals;
  return value === "chance" ? { modifier: 0, chance: true } : { modifier: value, chance: false };
}

/** Sum a checklist of modifiers such as MTA.huntingModifiers. */
export function sumModifiers(list, picked = {}) {
  return list.reduce((total, m) => {
    const n = m.each ? atLeast0(picked[m.key]) : (picked[m.key] ? 1 : 0);
    return total + n * m.value;
  }, 0);
}

/**
 * The Vitae pool as a row of droplets for the sheet's blood ribbon: one per
 * point the character can hold, the first `value` of them full, standing in
 * groups of five so the pool reads at a glance (and so a long row breaks
 * between groups, never inside one). A pool holding more than its maximum
 * still shows every point it holds. Bigger pools use smaller droplets: "l"
 * up to 15, "m" up to 30, "s" beyond.
 */
export function vitaeDroplets(value, max) {
  value = atLeast0(value);
  const count = Math.max(atLeast0(max), value);
  const groups = [];
  for (let i = 0; i < count; i++) {
    if (i % 5 === 0) groups.push([]);
    groups.at(-1).push({ n: i + 1, filled: i < value });
  }
  return { size: count <= 15 ? "l" : count <= 30 ? "m" : "s", count, groups };
}

/** What clicking droplet `n` leaves in the pool: that many, or one fewer when it is the last full one. */
export function dropletClick(n, value) {
  n = atLeast0(n);
  return n === atLeast0(value) ? Math.max(0, n - 1) : n;
}
