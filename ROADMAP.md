# Requiem 2E alignment roadmap

A plan for bringing this fork closer to *Vampire: The Requiem 2nd Edition* as written.
Written 2026-11-20 against system version 1.0.82.

Page numbers are printed book pages. Code references are to this repository.

## How to read this

- Phases are ordered by value and by dependency. Phase 1 fixes features that already exist.
  Phase 2 is the foundation most later work builds on.
- Each item is a checkbox. Tick it when it ships.
- **Check every rule number against its page before coding it.** The code findings, the
  Chapter 4 combat rules and the Phase 1 rules (Touchstones, Blush of Life, Predatory Aura,
  Detachment, clan banes) were verified directly. The other rule numbers came from
  extraction passes over a two-column text dump of the book. An earlier draft of this file
  got one wrong in the other direction: clan banes **do** wait until Humanity first reaches
  6, and then never leave, even if the seventh dot is regained (p.103).
- Homebrew settings are out of scope and stay as they are: Hunger dice, Phases of Night,
  alternative Willpower gain, lower Defense, easier dramatic failures.

## Baseline: what already matches the book

- Character types limited to Vampire, Ghoul and Mortal; Mask and Dirge replace Virtue and Vice.
- Humanity with ten Touchstone slots; Blood Potency sets maximum Vitae and Vitae per turn.
- Attribute and Skill cap follows Blood Potency (`getTraitMaximum`).
- Daysleep spends 1 Vitae. Frenzy, Lashing Out and Detachment have roll dialogs and outcome cards.
- Dice roller: Physical Intensity (1 Vitae for +2), Blood Potency toggle for contested rolls,
  Perception Merit toggles, extended-action roll cap.
- Vitae spend prompt on Discipline powers and Devotions.
- Item types for Discipline powers, Devotions, rites and miracles, Coils, Scales and Vinculum.
- Compendiums: all 44 Conditions, weapons and armor, Beat macros.

The main structural gap: `prepareData()` in `module/actor.js` computes derived traits with
no vampire branch, so nothing Kindred-specific reaches Defense, Health, Speed or dice pools.

---

## Phase 1: Fix what is already there

Implemented 2026-11-20, after v1.0.82. Not yet play-tested in Foundry.

- [x] **1.1 Humanity is read from the wrong field.**
  `rollFrenzy`, `rollDetachment` and `_resolveDetachmentOutcome` use `system.integrity`
  (`module/actor.js` lines 1681, 1838, 1932-1934). The sheet stores a vampire's Humanity in
  `system.vampire_traits.humanity`. Effects today: a failed Detachment roll reports a
  Humanity loss the sheet never shows, and the Gangrel cap uses a hidden value.
  Fix: read `.final`, write `.value`, on `vampire_traits.humanity`. Ghouls and mortals keep Integrity.
- [x] **1.2 Touchstone slots disagree with each other.**
  The Description tab maps slot 1 to Humanity 10 (`templates/actors/character.html` line 874,
  helper `convertVampTouchstone`). The Humanity-box corner icons treat the slot number as the
  Humanity dot (`module/templates.js` line 371). Detachment counts every filled slot.
  Fix: one helper returning `{dot, name, attached}` per Touchstone, used by all three.
  Only attached Touchstones count (dot at or below current Humanity): +2 for one, +3 for
  several (p.87, p.108). The -2 is for a character with no Touchstones at all; Touchstones
  that are all detached give +0. Shared helper: `MTA.vampireTouchstones` in `module/config.js`.
- [x] **1.3 Lashing Out is half a contest** (p.92).
  Deduct 1 Willpower when the target is Kindred (free against mortals). Let the defender
  choose Fight (own aspect's Power Attribute + Blood Potency; costs 1 Willpower if their
  Blood Potency is lower) or Flight. Winner inflicts their Condition and gets +2 for the
  scene; a tie applies both Conditions. Modifiers: Feeding Grounds dots on home territory,
  hungry +1, starving +2, -1 for each earlier aura used on the same victim this scene.
  Shipped target-first, like weapon rolls: the aggressor targets the victim's token, and the
  card is addressed to that character with Fight and Flight buttons for whoever controls
  them. The +2 for the scene is stated on the card, not applied to rolls (that needs the
  pool-only modifier of 5.5).
  Slimmed after v1.0.83: Kindred or mortal comes from the target's sheet, hunger and Blood
  Potency from the aggressor's; a Feeding Grounds tick box shows only for a character with the
  Merit; one button per aspect shows its dice and rolls at once. Fight Back works the same way.
  Nothing targeted is the normal case (theatre of the mind): the dialog asks vampire or
  mortal, and the card is answered by the selected token, else the character whose sheet the
  user has in front, else the user's own character. Targeting is an optional shortcut.
  Dropped: the -1 per earlier use on the same victim, and the free modifier field.
- [x] **1.4 Condition buttons ignore the shipped compendium.**
  `applyConditionByName` (`module/actor.js` line 1599) searches world items only. Fall back to
  the `conditions` pack, as the Inspired button in `module/mta.js` already does.
- [x] **1.5 Blush of Life is a core rule** (1 Vitae, lasts a scene, p.90).
  It is gated behind the homebrew Phases of Night setting and a portrait image
  (`module/actor-sheet.js` line 325). Make the toggle always available for vampires; keep the
  portrait swap as optional flair.
- [x] **1.6 New characters get five hidden werewolf form items.**
  `Actor.create` calls `createWerewolfForms()` for every character (`module/actor.js` line 536).
- [x] **1.7 Detachment dialog details** (pp.107-108).
  Offer only breaking-point levels at or below current Humanity. Add explicit options for
  protecting the Masquerade (-1) and protecting the Requiem (+1). Also shipped: a "banes
  already taken" field (-1 each), to be replaced by a count of bane items in 3.2.

## Phase 2: The vampire body

Implemented 2026-11-20, after v1.0.82. Not yet play-tested in Foundry.
Rules arithmetic is in `module/kindred.js` (plain functions, no Foundry globals); the
dialogs and updates are in `module/actor-kindred.js`, a mixin on the actor class.
Four new macro buttons for Vampires: Mend, Feeding, Physical Disciplines, Banes.

**The sheet since v1.0.85.** The Vitae pool left the button ribbon for a blood ribbon of its
own above it: the word Vitae over the splatter, one droplet per point the character can hold
(click a droplet to set the pool, click the last full one to spend a point), then Blood
Potency and Vitae per turn, always in view. The button ribbon holds the seven buttons the
sheet always had, in their old places, then Mend and Feed. Vampire and Ghoul sheets open
52px taller to make the room. Nothing on either ribbon is positioned over anything else,
so a wide side column or a narrow window can no longer put a button under the pool.

- [x] **2.1 Physical Disciplines feed derived traits** (pp.130-142).
  Add a vampire branch to `prepareData()`, for vampires and ghouls:
  Celerity adds to Defense; Vigor adds to Strength; Resilience adds to Stamina and so to Health.
  Vigor and Resilience may exceed the Blood Potency cap. Recalculate maximum Health
  automatically instead of relying on the calculate button.
  Shipped: all of it, with the Health sync limited to Vampires and Ghouls (hooks in
  `module/mta.js`). Also: a firearm shot at a target with Celerity takes the Celerity dots
  as a penalty. Not done: Celerity on an active Dodge roll.
- [x] **2.2 Active Discipline effects as toggles** (1 Vitae each, reflexive, one turn, each once per turn).
  Celerity: top of Initiative; interrupt an action (at most Celerity times per scene); Speed x (Celerity + 1).
  Resilience: subtract Resilience + 1 from non-bane damage; subtract Resilience from fire and bane damage, not sunlight.
  Vigor: add Vigor as weapon bonus to Athletics, Brawl and Weaponry attacks; hurl large objects.
  Place them beside the existing Physical Intensity toggle.
  Shipped in three places, by when each choice is made. Vigor's weapon bonus is a toggle on
  the attack roll. Celerity's three effects and Vigor's hurl are in the Physical Disciplines
  dialog. Resilience is asked for when damage is applied, or bought ahead in that dialog
  while in combat. "Once per turn" is only enforced in combat, where a turn has edges.
  Not automated: the Initiative jump and the Speed change are announced on a card only.
  v1.0.85: the Physical Disciplines button is off the sheet. Its pop-up told players only
  that they could spend Vitae, and listed Resilience only while Foundry's combat tracker was
  running. Spending the Vitae is now one click on the last full droplet. The dialog code
  (`usePhysicalDisciplines`) is kept but nothing opens it.
- [x] **2.3 Kindred damage intake** (p.90, p.181).
  Mundane weapons deal bashing to Kindred. Weapon rolls currently apply the item's damage
  type unchanged. Add a weapon flag for "lethal to Kindred" (fangs, Horrid Talons, Carving).
  Sources that are aggravated to mortals are lethal to Kindred; fire and sunlight stay aggravated.
  Resilience downgrades aggravated to lethal, one per dot, never for sunlight.
  Shipped: weapon field `fullDamageToKindred` ("Harms Kindred fully" on the weapon sheet).
  Cards still state damage as dealt to a mortal; the target converts it when Apply damage
  is pressed, and the card adds a "To a Kindred" line when the target is known.
  Also fixed an inherited bug in `ActorMtA#damage`: bashing that overflowed the track
  upgraded too many boxes to lethal.
- [x] **2.4 Health track outcomes** (p.90, p.181).
  Track full of bashing: stays conscious, wound penalties still apply. Full of lethal:
  torpor prompt. Full of aggravated: Final Death (set `isDead`).
  Shipped as cards. Torpor is a warning with its duration, since she may still mend
  before the end of her turn; torpor as a state is 3.6.
- [x] **2.5 Mending** (p.91).
  A Mend control: 1 Vitae heals 2 bashing or 1 lethal. One aggravated costs 5 Vitae plus a
  full day's sleep, so track Vitae banked toward it. Respect Vitae per turn.
  Shipped: the dialog pre-fills the cheapest wounds within what can be spent this turn.
  Slimmed after v1.0.83: asks only the Vitae to spend and shows what it heals. Banking Vitae
  towards aggravated wounds is gone; Daysleep heals those.
  v1.0.85: an ordinary Mend button at the end of the button ribbon. (v1.0.84 opened it from
  the word "Health", which nobody could be expected to find.)
- [x] **2.6 A real Daysleep** (p.91, p.98).
  Order: heal wounds with Vitae (offer 1 Willpower per wound to preserve it), then spend the
  waking Vitae, and fall into torpor if none is left. Add the stay-awake roll
  (Stamina + Resolve, Lethargic on success) and the disturbed-sleep roll (Humanity), with
  Haven dots added to both.
  Shipped: the Daysleep button now opens a dialog instead of acting at once. When Vitae is
  short the sleep heals bashing first, then lethal, then aggravated (the book gives no
  order). Not done: counting successes towards staying awake for good.
  Slimmed after v1.0.83: a pop-up of what the sleep will do and one Sleep button. Keeping
  wounds for Willpower, staying awake and being woken by danger were removed from the sheet.
- [x] **2.7 Vitae per turn.** Track spends per combat round and warn past the Blood Potency limit.
  Shipped as `actor.spendVitae()`, used by every Vitae spend in the system. It warns and
  does not refuse. Nothing is tracked outside combat.
- [x] **2.8 Humanity and Blood Potency tables as data.**
  Extend `MTA.bloodPotency_levels` (`module/config.js` line 891) and add a Humanity table
  (see the appendix). Add a roller toggle "involves mortals" that applies the Humanity
  modifier (p.106). It does not apply to Intimidation or to Subterfuge used to feed.
  Shipped: the toggle appears on a Vampire's Social rolls when Humanity gives a modifier,
  never with Intimidation. The Nosferatu two-dot shift is left for 3.3.
- [x] **2.9 Sunlight and fire calculators** (pp.102-103). Chat card with an apply-damage button.
  Shipped as dialogs on the burning character's own sheet that apply the damage directly,
  rather than a card with a second button. A woken Mekhet bane lowers Humanity by one here.
  Removed from the sheet after v1.0.83 (too rare for a button). The rules stay in
  `module/kindred.js` (`sunlightExposure`, `fireDamage`) for a future Storyteller tool.
- [x] **2.10 Feeding** (p.89, pp.95-96).
  Feed dialog by source: living human (up to their Health dots, 1 lethal per Vitae, Drained
  past Stamina), animal by Size, Kindred Vitae (1 for 1, triggers addiction and the bond),
  cold blood. Enforce the Blood Potency feeding restriction (1 Willpower per Vitae below it).
  Add the hunting roll with its modifier list, the starting-Vitae roll (one die's face value
  plus Feeding Grounds, capped), and Herd's weekly Vitae.
  Shipped: target a vessel's token first and its numbers are filled in and it pays the cost.
  Not done: the violent bite and the Feed move in a grapple, the Swooning and Scarred
  Conditions, and counting the Herd's week.
  Slimmed after v1.0.83: Feed asks only what kind of blood and how much, with a preview.
  v1.0.85: an ordinary Feed button at the end of the button ribbon. (v1.0.84 opened it from
  the word "Vitae", which nobody could be expected to find.) Hunting, starting Vitae and the Herd were
  removed from the sheet; the rules stay in `module/kindred.js` and `MTA.huntingModifiers`.
- [x] **2.11 Kindred senses and A Taste of Blood** (p.91). Low priority helper rolls.
  Shipped: the Taste of Blood roll, and a line of sense ranges on the Feeding menu.
  Removed from the sheet after v1.0.83 along with the Feeding menu.

## Phase 3: The Beast and the Blood

Declined 2026-11-20, after v1.0.86: the owner judged none of this phase worth adding to the
sheet. Kept here as a record only; do not build it unless asked.

- [ ] **3.1 Frenzy as a state** (pp.103-105).
  Prefill modifiers: hungry at 4 Vitae or less (-2), starving at 2 or less (-4), wounded (-1),
  wounded in the last three boxes (-3), plus a provocation pick-list.
  Apply Conditions: Tempted (-N), Bestial (-2), Sated (+1), Ecstatic (+2), Jaded (cap at
  Humanity, no Willpower).
  Frenzied status: add Blood Potency to Strength, Dexterity and Stamina rolls; ignore wound penalties.
  Riding the wave: 1 Willpower, Resolve + Composure, accumulate 5 successes; any failure is
  dramatic; it is a Humanity 8 breaking point.
  Touchstone talk-down: 3 x Blood Potency successes.
- [ ] **3.2 Banes as items** (pp.108-109).
  Replace the free-text `system.banes` with a bane item type. Maximum three; each is -1 on
  Detachment. On a failed Detachment roll, offer "also take a bane and a Beat" as a button:
  the dot is still lost, but that breaking point can never cost Humanity again (p.108).
  Ship the 14 banes as a compendium.
- [ ] **3.3 Clan as structured data** (p.80, p.82, p.103).
  A clan select that knows favoured Attributes, in-clan Disciplines and the clan bane.
  Clan banes lie dormant until Humanity first reaches 6 and then stay for good; Phase 1
  records this in the actor flag `clanBaneAwake` (see `isClanBaneAwake` in `module/actor.js`).
  Gangrel exists. Add: Nosferatu (Humanity counts 2 lower for the modifier with humans;
  failed Presence or Manipulation rolls become dramatic failures), Mekhet (extra bane at
  Humanity 6; Humanity counts 1 lower for sunlight, torpor and banes), Ventrue (first
  Touchstone on dot 7), Daeva (Humanity roll on repeat feeding from one mortal, Dependent on failure).
- [ ] **3.4 Blood bonds and Vitae addiction** (pp.99-100).
  Vinculum item gains a regnant link, a last-drink date (bond lasts a year) and stage effects:
  the regnant gets +1, +2 or +3 on Social and Discipline rolls; harming the regnant is a
  breaking point at Humanity 5, 3 or 1. Add the resist roll (1 Willpower, Blood Potency minus
  Vitae drunk, cumulative -1) and the addiction roll (Resolve + Composure minus Vitae drunk).
- [ ] **3.5 Blood sympathy** (pp.98-99). Sire and lineage fields; Wits + Blood Potency + bonus roll.
- [ ] **3.6 Torpor** (p.105).
  A torpor status with a duration calculator (Humanity base x Blood Potency), the stake rule,
  -1 Blood Potency per 25 years, and the two breaking points (entering; a year or more).
- [ ] **3.7 Anchors** (pp.84-88).
  Mask and Dirge archetype pick-lists, with buttons for "+1 Willpower" and "all Willpower"
  (full refresh once per chapter). Active only when homebrew Willpower is off.
- [ ] **3.8 Diablerie flow** (p.101). Low priority.

## Phase 4: Powers as data

- [ ] **4.1 Structured Discipline power items.**
  Split the free-text cost into Vitae, Willpower and a note (the parser in `module/item.js`
  line 148 can seed a migration). Deduct Willpower as well as Vitae. Warn when the actor's
  dots are below the power's level. Add the Discipline's full dots to the default pool (p.125).
  Add contest fields (contested or resisted, and by what), and a list of Conditions the power
  inflicts, shown as buttons on the chat card.
- [ ] **4.2 Contested versus resisted in the roller** (p.125).
  With a target selected: contested rolls prompt the target to roll resistance with Blood
  Potency added; resisted rolls subtract the target's Attribute. Blood Potency never applies
  to resisted rolls. Ghouls do not add Discipline dots against Kindred (p.297).
- [ ] **4.3 Clash of Wills** (pp.125-126).
  Blood Potency + Discipline dots, ties rerolled, duration bonus of +1 to +4.
  Devotions use the highest prerequisite; sorcery uses Cruac or Theban Sorcery.
- [ ] **4.4 Ritual casting flow** (pp.150-152).
  Default pool by type (Manipulation + Occult + Cruac; Intelligence + Academics + Theban
  Sorcery). Extended action capped at the unmodified pool (the roller already tracks this).
  30 minutes per roll, 15 when the caster's dots exceed the ritual's level. Sacrifice: Vitae
  equal to the rite's level for Cruac; 1 Willpower plus the sacrament for Theban.
  Stumbled on continuing after a failed roll. Potency from successes over the target.
  Gates: Cruac caps Humanity at 10 minus dots; a miracle needs Humanity at least its level.
- [ ] **4.5 Devotion items.** Prerequisite Disciplines and dots, Experience cost, Willpower cost; warn when unmet.
- [ ] **4.6 Coils and Scales** (pp.154-159).
  Mystery select and a chosen Mystery on the actor (it sets the Experience cost). Automate
  the simple tiers, for example The Warm Face (Blush lasts 24 hours) and Leash the Beast
  (riding the wave costs no Willpower).
- [ ] **4.7 Compendiums.**
  Build with the existing `packs-src` script pattern: 35 named Discipline powers, Protean
  adaptation options, 28 Devotions, 10 Cruac rites, 9 Theban miracles, 15 Coils, 10 Scales,
  14 banes, the Merits, 22 Dread Powers. Content is stat fields, an own-words summary and a
  page reference, in the manner of the codex.

## Phase 5: Character lifecycle

- [ ] **5.1 Creation checker** (pp.79-82). Non-blocking warnings for the dot allocations listed in the appendix.
- [ ] **5.2 Experience spending** (p.83). Cost table in the Beats dialog, spend entries in the
  progress log, in-clan versus out-of-clan worked out from the clan field.
- [ ] **5.3 Aspirations.** Three structured entries with a "fulfilled" button that grants a Beat.
- [ ] **5.4 Ghouls** (p.297).
  Regnant link and clan; two dots of the regnant's in-clan Disciplines; monthly Vitae upkeep;
  Deprived when empty; withdrawal disables Disciplines; one aggravated wound takes two
  nights and 5 Vitae. Add the ghoul Merits (pp.298-300).
- [ ] **5.5 Conditions with working effects.**
  First add a pool-only modifier type to item effects. The existing effects change the trait
  itself, which would wrongly move Health or Willpower (Deprived is explicit about this, p.302).
  Then fill in the Conditions that have flat modifiers, and add a "resolve for a Beat" button.
- [ ] **5.6 Merit effects.** Fill in Merits that change derived traits or pools, and add
  roller toggles for Feeding Grounds, Haven and Indomitable.

## Phase 6: Antagonists and cleanup

- [ ] **6.1 Strix actor** (pp.200-211).
  Power, Finesse and Resistance; the Shadow Potency table; Vitae; Corpus; current Embodiment;
  banes; Dread Powers.
- [ ] **6.2 NPC Kindred sheet.** The simple antagonist plus Blood Potency, Vitae and Disciplines.
- [ ] **6.3 Combat extras** (pp.176-178, p.94).
  Heart shot (-3, 5 or more damage stakes the target). Bite as a grapple Damage move (fangs
  are lethal even to Kindred, plus 1 Vitae taken). Feed move (1 Vitae per success, capped at
  Blood Potency). The Kiss applies Swooning. Dodge. Optional: Beaten Down and Surrender.
- [ ] **6.4 Social maneuvering.** Doors exist on the relationship item. Add hard leverage and
  the impression shift from blood bonds.
- [ ] **6.5 Optional rules as settings.** Blood Beats (p.276) is the cheapest to add.
- [ ] **6.6 Remove other-splat remnants.**
  `template.json` still carries mage, changeling, werewolf, demon, hunter, sin-eater, mummy,
  deviant and promethean data on every character, plus dozens of unused item types and sheet
  branches. Do this last and with a migration, since it touches everything.
  Keep Tilts: the core book has no formal Tilt system (p.178), but they do no harm.

---

## Appendix: data to encode

Extracted from the book. Confirm each table against its page before coding.

**Blood Potency** (p.90, p.102). Encoded in `MTA.bloodPotency_levels` and checked against the page.

| Blood Potency | Trait cap | Feeds from | Sunlight interval |
|---|---|---|---|
| 0 | 5 | Animals | none |
| 1-2 | 5 | Animals | every 10 minutes |
| 3 | 5 | Humans | every minute |
| 4-5 | 5 | Humans | every turn |
| 6-7 | 6, 7 | Kindred | twice per turn |
| 8-9 | 8, 9 | Kindred | three times per turn |
| 10 | 10 | Kindred | five times per turn |

**Humanity** (p.102, p.105, pp.106-107). Encoded in `MTA.humanity_levels` and `MTA.breakingPointDice`,
and checked against the pages.

| Humanity | Modifier with mortals | Sunlight damage | Torpor base | Breaking point dice |
|---|---|---|---|---|
| 10 | +2 | 1 lethal | 1 night | 5 |
| 9 | +2 | 1 lethal | see note | 5 |
| 8 | none | 1 lethal | 2 nights | 4 |
| 7 | none | 1 lethal | 1 week | 4 |
| 6 | -1 | 2 lethal | 1 week | 3 |
| 5 | -1 | 3 lethal | 1 month | 3 |
| 4 | -2 | 1 aggravated | 1 year | 2 |
| 3 | -3 | 2 aggravated | 5 years | 2 |
| 2 | -5 | 3 aggravated | 10 years | 1 |
| 1 | chance die | 4 aggravated | 50 years | 0 (chance die) |
| 0 | unplayable | 5 aggravated | 100 years | n/a |

Notes:
- The printed torpor table lists Humanity 9 in two rows ("9-10 one night", "8-9 two nights").
- The breaking point dice column is keyed by the level of the breaking point being faced,
  not by the character's current Humanity. The other columns use current Humanity.

**Clans** (p.80, p.82).

| Clan | Favoured Attribute (pick one) | In-clan Disciplines |
|---|---|---|
| Daeva | Dexterity or Manipulation | Celerity, Majesty, Vigor |
| Gangrel | Composure or Stamina | Animalism, Protean, Resilience |
| Mekhet | Intelligence or Wits | Auspex, Celerity, Obfuscate |
| Nosferatu | Composure or Strength | Nightmare, Obfuscate, Vigor |
| Ventrue | Presence or Resolve | Animalism, Dominate, Resilience |

**Creation allocations** (pp.79-82).
Attributes 5/4/3 plus one free dot each; Skills 11/7/4; three Specialties; one favoured
Attribute dot; three Discipline dots, at least two in-clan; ten Merit dots; Blood Potency 1
(up to two more dots at 5 Merit dots each); Humanity 7; one Touchstone on dot 6; three Aspirations.

**Experience costs** (p.83). Five Beats make one Experience.

| Trait | Cost |
|---|---|
| Attribute | 4 per dot |
| Skill | 2 per dot |
| Skill Specialty | 1 |
| Merit | 1 per dot |
| Clan Discipline | 3 per dot |
| Out-of-clan Discipline | 4 per dot |
| Cruac or Theban Sorcery | 4 per dot |
| Coil in the chosen Mystery | 3 per dot |
| Coil outside it | 4 per dot |
| Blood sorcery ritual | 2 |
| Scale of the Dragon | 2 |
| Humanity | 2 per dot |
| Blood Potency | 5 per dot |
| Lost Willpower dot | 1 |
