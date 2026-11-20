import * as Kindred from "./kindred.js";

const SYSTEM_ID = "vampire-the-requiem-2e";

const int = (v) => Math.round(Number(v) || 0);
const atLeast0 = (v) => Math.max(0, int(v));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Read named inputs back out of an appv1 Dialog's jQuery html. */
const reader = (html) => ({
  num: (name) => int(html.find(`[name="${name}"]`).val()),
  str: (name) => String(html.find(`[name="${name}"]`).val() ?? ""),
  on: (name) => html.find(`[name="${name}"]`).is(":checked"),
  /** The value of the ticked radio button in a group. */
  picked: (name) => String(html.find(`[name="${name}"]:checked`).val() ?? "")
});

/**
 * Whether a character counts as a vampire when fed upon or lashed out at: a
 * Vampire character, or a simple antagonist whose type names one.
 */
export const targetIsKindred = (actor) => actor?.system?.characterVariant === "vampire"
  || /vampire|kindred/i.test(String(actor?.system?.antagonistType ?? ""));

/** A "− n +" number control for dialogs. wireSteppers() makes it work. */
const stepper = (name, value, min, max) => `
  <span class="vtr-stepper">
    <button type="button" class="vtr-step" data-step="-1" aria-label="Less">&minus;</button>
    <input type="number" name="${name}" value="${value}" min="${min}" max="${max}">
    <button type="button" class="vtr-step" data-step="1" aria-label="More">+</button>
  </span>`;

/**
 * Make the steppers in a rendered dialog work, keeping each within its own
 * min and max, and call `changed` after every change.
 */
const wireSteppers = (el, changed) => {
  for (const box of el.querySelectorAll(".vtr-stepper")) {
    const input = box.querySelector("input");
    const keepInRange = () => {
      const min = int(input.min);
      input.value = Math.clamp(int(input.value), min, Math.max(min, int(input.max)));
    };
    for (const button of box.querySelectorAll(".vtr-step")) {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        input.value = int(input.value) + int(button.dataset.step);
        keepInRange();
        changed();
      });
    }
    input.addEventListener("change", () => { keepInRange(); changed(); });
    input.addEventListener("input", () => changed());
  }
};

/**
 * The Kindred body (Vampire: The Requiem 2E, chapter 3): spending Vitae,
 * taking and mending damage, the day's sleep, the physical Disciplines'
 * active effects, and feeding.
 *
 * Each action follows the same shape: a small dialog that reads what it can
 * from the sheet and asks only the rest, then one button carries the whole
 * thing out and posts a card. The rules
 * arithmetic is in kindred.js; this file only gathers input, updates the
 * actor and reports. It is a mixin so that these methods live on the actor
 * (`actor.mendWounds()`) without swelling actor.js.
 */
export const KindredActorMixin = (Base) => class extends Base {

  /* -------------------------------------------- */
  /*  Readings                                    */
  /* -------------------------------------------- */

  /** True for a Vampire; Ghouls and Mortals have living bodies. */
  get isKindred() {
    return this.system?.characterVariant === "vampire";
  }

  getBloodPotency() {
    return Math.clamp(int(this.system?.vampire_traits?.bloodPotency?.final), 0, 10);
  }

  /** Dots in a Discipline, by its key in disciplines_common / disciplines_unique. */
  disciplineDots(key) {
    const sys = this.system ?? {};
    const trait = sys.disciplines_common?.[key] ?? sys.disciplines_unique?.[key];
    return atLeast0(trait?.final ?? trait?.value);
  }

  /** Dots in the first Merit whose name matches, or 0. */
  meritDots(pattern) {
    const merit = this.items.find(i => i.type === "merit" && pattern.test(i.name ?? ""));
    return atLeast0(merit?.system?.rating);
  }

  getVitaePerTurn() {
    return CONFIG.MTA.bloodPotency_levels[this.getBloodPotency()].vitae_per_turn;
  }

  /**
   * Humanity as the Humanity-based banes read it. A Mekhet's counts one dot
   * lower for sunlight and torpor once the clan bane has woken (p. 103).
   */
  getBaneHumanity() {
    const humanity = this.getHumanity();
    const mekhet = String(this.system?.clan ?? "").toLowerCase() === "mekhet";
    return Math.max(0, mekhet && this.isClanBaneAwake() ? humanity - 1 : humanity);
  }

  /** Post one of the system's coloured outcome cards as this actor. */
  _postKindredCard({ tone = "messy-success", title, lines = [], buttons = "" }) {
    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="vtr-roll"><div class="hunger-messy ${tone}">`
        + `<span class="hunger-messy-title">${title}</span>`
        + lines.filter(Boolean).map(l => `<span class="hunger-messy-text">${l}</span>`).join("")
        + buttons
        + `</div></div>`
    });
  }

  /* -------------------------------------------- */
  /*  Vitae per turn                              */
  /* -------------------------------------------- */

  /**
   * "<combat id>.<round>" while this character is in a running combat, else
   * null. A turn only has edges inside combat, so per-turn limits and
   * once-per-turn effects are only tracked there.
   */
  _turnKey() {
    const combat = game.combat;
    if (!combat?.started) return null;
    const fighting = combat.combatants?.some(c => c.actor === this || c.actor?.uuid === this.uuid);
    return fighting ? `${combat.id}.${combat.round}` : null;
  }

  getVitaeSpentThisTurn() {
    const key = this._turnKey();
    const record = this.getFlag(SYSTEM_ID, "vitaeTurn");
    return key && record?.key === key ? atLeast0(record.spent) : 0;
  }

  /** Whether a once-per-turn effect has already been paid for this turn. */
  _usedThisTurn(effect) {
    const key = this._turnKey();
    return !!key && this.getFlag(SYSTEM_ID, "turnEffects")?.[effect] === key;
  }

  /** Add "paid for this turn" marks for the given effects to an update. */
  _markUsedThisTurn(effects, update) {
    const key = this._turnKey();
    if (!key) return;
    for (const effect of effects) update[`flags.${SYSTEM_ID}.turnEffects.${effect}`] = key;
  }

  /**
   * Spend Vitae. Refuses, with a warning, when the pool is too low. In combat
   * it keeps a running total for the turn and warns once that passes the
   * Blood Potency limit (p. 90); it warns rather than refuses, because the
   * Storyteller may be resolving something that spans turns.
   * @param {number} amount
   * @param {object} [o]
   * @param {string} [o.reason]  Finishes "needs N Vitae to ...".
   * @param {object} [o.update]  Further changes to make in the same update.
   * @returns {Promise<boolean>} Whether the Vitae was spent.
   */
  async spendVitae(amount, { reason = "", update = {} } = {}) {
    amount = atLeast0(amount);
    const current = atLeast0(this.system?.vitae?.value);
    if (current < amount) {
      ui.notifications.warn(`${this.name} needs ${amount} Vitae${reason ? ` to ${reason}` : ""} but has ${current}.`);
      return false;
    }
    const changes = { ...update };
    if (amount > 0) {
      changes["system.vitae.value"] = current - amount;
      const key = this._turnKey();
      if (key) {
        const spent = this.getVitaeSpentThisTurn() + amount;
        const limit = this.getVitaePerTurn();
        changes[`flags.${SYSTEM_ID}.vitaeTurn`] = { key, spent };
        if (spent > limit) {
          ui.notifications.warn(`${this.name} has spent ${spent} Vitae this turn; Blood Potency allows ${limit}.`);
        }
      }
    }
    if (Object.keys(changes).length) await this.update(changes);
    return true;
  }

  /* -------------------------------------------- */
  /*  Taking damage                               */
  /* -------------------------------------------- */

  _kindredTrackState() {
    return this.isKindred ? Kindred.kindredTrackState(this.system.health) : null;
  }

  /**
   * After damage, say what a newly full Health track means for a vampire
   * (p. 90): bashing leaves them standing, lethal means torpor at the end of
   * the turn unless some is mended, aggravated is Final Death.
   * @param {string|null} before  _kindredTrackState() from before the damage.
   */
  async _announceTrackOutcome(before) {
    if (!this.isKindred) return;
    const after = Kindred.kindredTrackState(this.system.health);
    if (after === before || after === "ok") return;

    if (after === "bashingFull") {
      await this._postKindredCard({
        tone: "messy-failure",
        title: "Health track full",
        lines: [`<strong>${this.name}</strong>'s last Health box holds bashing damage. A vampire stays `
          + `conscious, though wound penalties apply. Further harm turns the bashing to lethal.`]
      });
    } else if (after === "torpor") {
      const base = CONFIG.MTA.humanity_levels[Math.clamp(this.getBaneHumanity(), 0, 10)].torpor;
      await this._postKindredCard({
        tone: "messy-failure",
        title: "On the edge of torpor",
        lines: [
          `<strong>${this.name}</strong>'s last Health box holds lethal damage. Unless some of it is mended `
            + `before the end of the turn, torpor follows.`,
          `<em>Torpor would last about ${base}, multiplied by Blood Potency ${this.getBloodPotency()}.</em>`
        ]
      });
    } else if (after === "finalDeath") {
      await this.update({ "system.isDead": true });
      await this._postKindredCard({
        tone: "messy-failure",
        title: "Final Death",
        lines: [`<strong>${this.name}</strong>'s last Health box holds aggravated damage. The body returns `
          + `to its true age within a minute.`]
      });
    }
  }

  /**
   * Suffer damage from a named source. A vampire's body converts it first
   * (see Kindred.kindredIntake); Resilience also helps a Ghoul who has it.
   * @param {{bashing?:number, lethal?:number, aggravated?:number}} damage
   *        As the source would deal it to a mortal.
   * @param {object} [o]
   * @param {string}  [o.source="mundane"]  One of Kindred.DAMAGE_SOURCES.
   * @param {boolean} [o.resilienceActive=false]
   * @returns {Promise<object>} What was actually suffered.
   */
  async sufferDamage(damage, { source = "mundane", resilienceActive = false } = {}) {
    const resilience = this.disciplineDots("resilience");
    // A living body takes mundane harm at face value, so only Resilience applies.
    const asSource = this.isKindred || source !== "mundane" ? source : "supernatural";
    const suffered = Kindred.kindredIntake(damage, { source: asSource, resilience, resilienceActive });

    const before = this._kindredTrackState();
    if (suffered.bashing) await this.damage(suffered.bashing, "bashing", false, { quiet: true });
    if (suffered.lethal) await this.damage(suffered.lethal, "lethal", false, { quiet: true });
    if (suffered.aggravated) await this.damage(suffered.aggravated, "aggravated", false, { quiet: true });
    await this._announceTrackOutcome(before);
    return suffered;
  }

  /** One line saying what incoming damage became, for the cards below. */
  _intakeLine(incoming, suffered, source) {
    const dealt = Kindred.describeDamage(incoming);
    const taken = Kindred.describeDamage(suffered);
    const notes = [];
    if (this.isKindred && source === "mundane" && dealt !== taken) notes.push("a Kindred body shrugs off mundane harm");
    if (suffered.soaked) notes.push(`Resilience dismisses ${suffered.soaked}`);
    if (suffered.downgraded) notes.push(`Resilience turns ${suffered.downgraded} aggravated to lethal`);
    return `<strong>${this.name}</strong> suffers <strong>${taken}</strong>`
      + (dealt !== taken ? ` (from ${dealt}${notes.length ? `: ${notes.join("; ")}` : ""})` : "") + ".";
  }

  /**
   * Take the damage from a weapon card's "Apply damage" button. Mortals take
   * it as rolled. A vampire's body converts it, and one with Resilience and
   * Vitae to spare is asked first whether to dismiss part of it, since that
   * choice is reflexive and belongs to the one being hit.
   * @param {{bashing?:number, lethal?:number, aggravated?:number}} damage
   * @param {object} [o]
   * @param {boolean} [o.fullToKindred=false]  The weapon harms Kindred fully.
   */
  async receiveAttack(damage, { fullToKindred = false } = {}) {
    const source = fullToKindred ? "supernatural" : "mundane";
    const resilience = this.disciplineDots("resilience");
    const armed = resilience > 0 && this._usedThisTurn("resilienceSoak");
    const canPay = atLeast0(this.system?.vitae?.value) >= 1;

    const apply = async (resilienceActive) => {
      const suffered = await this.sufferDamage(damage, { source, resilienceActive });
      if (this.isKindred || suffered.soaked || suffered.downgraded) {
        await this._postKindredCard({
          tone: "messy-failure",
          title: "Damage taken",
          lines: [this._intakeLine(damage, suffered, source)]
        });
      }
    };

    // Nothing to decide: no Resilience, already paid for this turn, or no Vitae.
    if (resilience < 1 || armed || !canPay) return apply(armed);

    const preview = this.isKindred ? Kindred.kindredIntake(damage, { source, resilience }) : damage;
    this._renderRiteDialog({
      title: `Damage — ${this.name}`,
      variant: "stamina",
      body: `
        <p class="vtr-rite-summary">Incoming: <strong>${Kindred.describeDamage(damage)}</strong><br>
          As it stands: <strong>${Kindred.describeDamage(preview)}</strong></p>
        <div class="vtr-rite-checks">
          <label><input type="checkbox" name="soak">
            Resilience &mdash; spend 1 Vitae to dismiss ${resilience + 1} of it this turn</label>
        </div>`,
      buttons: {
        take: {
          icon: '<i class="fas fa-heart-crack"></i>',
          label: "Take the damage",
          callback: async (html) => {
            let active = reader(html).on("soak");
            if (active) {
              const update = {};
              this._markUsedThisTurn(["resilienceSoak"], update);
              active = await this.spendVitae(1, { reason: "call on Resilience", update });
            }
            await apply(active);
          }
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  Mending                                     */
  /* -------------------------------------------- */

  /**
   * Mend wounds with Vitae (p. 91): 1 Vitae closes two bashing or one lethal,
   * at once. The dialog asks only how much Vitae to spend and shows what that
   * heals (Kindred.mendPlan picks the wounds). Aggravated wounds take a day's
   * sleep, so daysleep() heals those.
   */
  async mendWounds() {
    const wounds = Kindred.woundCounts(this.system.health);
    const fullCost = Kindred.mendCost(wounds);
    if (fullCost === 0) {
      ui.notifications.info(wounds.aggravated
        ? `${this.name}'s aggravated wounds can only heal during Daysleep.`
        : `${this.name} has no wounds to mend.`);
      return;
    }
    const vitae = atLeast0(this.system?.vitae?.value);
    if (vitae < 1) {
      ui.notifications.warn(`${this.name} has no Vitae to mend with.`);
      return;
    }

    const most = Math.min(vitae, fullCost);
    // In combat, start at what Blood Potency still allows this turn.
    const inCombat = !!this._turnKey();
    const perTurn = this.getVitaePerTurn();
    const spentThisTurn = this.getVitaeSpentThisTurn();
    const start = inCombat ? Math.clamp(perTurn - spentThisTurn, 1, most) : most;

    const preview = (spend) => {
      const plan = Kindred.mendPlan(wounds, Math.clamp(int(spend), 1, most));
      // Aggravated wounds have their own line below.
      const left = { bashing: wounds.bashing - plan.bashing, lethal: wounds.lethal - plan.lethal };
      return `Heals <strong>${Kindred.describeDamage(plan)}</strong> &middot; Vitae ${vitae} &rarr; ${vitae - plan.cost}`
        + (left.bashing + left.lethal ? `<br>Still hurt: ${Kindred.describeDamage(left)}` : "");
    };

    const body = `
      <p class="vtr-rite-summary">Wounds: <strong>${Kindred.describeDamage(wounds)}</strong></p>
      <div class="vtr-amount"><span>Vitae to spend</span>${stepper("spend", start, 1, most)}</div>
      <p class="vtr-rite-preview">${preview(start)}</p>
      ${inCombat ? `<p class="vtr-rite-note vtr-center">Spent this turn: ${spentThisTurn} of ${perTurn}
        (Blood Potency limit)</p>` : ""}
      ${wounds.aggravated ? `<p class="vtr-rite-note vtr-center">Aggravated wounds heal during Daysleep.</p>` : ""}`;

    this._renderRiteDialog({
      title: `Mend — ${this.name}`,
      variant: "stamina",
      width: 380,
      body,
      onRender: (el) => {
        const input = el.querySelector('[name="spend"]');
        const out = el.querySelector(".vtr-rite-preview");
        wireSteppers(el, () => { out.innerHTML = preview(input.value); });
      },
      buttons: {
        mend: {
          icon: '<i class="fas fa-droplet"></i>',
          label: "Mend",
          callback: async (html) => {
            // Re-read the wounds, in case damage landed while the window was open.
            const now = Kindred.woundCounts(this.system.health);
            const plan = Kindred.mendPlan(now, Math.max(1, reader(html).num("spend")));
            if (plan.cost === 0) return;
            const health = Kindred.healthCounters({
              max: now.max,
              bashing: now.bashing - plan.bashing,
              lethal: now.lethal - plan.lethal,
              aggravated: now.aggravated
            });
            const update = {
              "system.health.value": health.value,
              "system.health.lethal": health.lethal,
              "system.health.aggravated": health.aggravated
            };
            if (!(await this.spendVitae(plan.cost, { reason: "mend", update }))) return;
            await this._postKindredCard({
              title: "Mending",
              lines: [`<strong>${this.name}</strong> spends ${plural(plan.cost, "Vitae", "Vitae")} and mends `
                + `<strong>${Kindred.describeDamage(plan)}</strong>.`]
            });
          }
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  Daysleep                                    */
  /* -------------------------------------------- */

  /**
   * The day's sleep (p. 91, p. 98), as a pop-up that says what the sleep will
   * do (heal, what it costs, the Vitae left after rising, or torpor) and one
   * Sleep button.
   *
   * Vitae set aside towards an aggravated wound in v1.0.83 (flag
   * `aggravatedMending`) is still used up here, so none is lost.
   */
  async daysleep() {
    const wounds = Kindred.woundCounts(this.system.health);
    const vitae = atLeast0(this.system?.vitae?.value);
    const banked = atLeast0(this.getFlag(SYSTEM_ID, "aggravatedMending"));
    const plan = Kindred.daysleepPlan({ wounds, vitae, banked });
    const healed = plan.healed.bashing + plan.healed.lethal + plan.healed.aggravated;
    const left = {
      bashing: wounds.bashing - plan.healed.bashing,
      lethal: wounds.lethal - plan.healed.lethal,
      aggravated: wounds.aggravated - plan.healed.aggravated
    };
    const willpower = atLeast0(this.system?.willpower?.value);
    const regains = plan.canWake && game.settings.get(SYSTEM_ID, "homebrewWillpower")
      && willpower < atLeast0(this.system?.willpower?.max ?? willpower);

    const lines = [
      healed ? `The sleep heals <strong>${Kindred.describeDamage(plan.healed)}</strong>`
        + ` for ${plural(plan.vitaeSpent, "Vitae", "Vitae")}.` : "",
      left.bashing + left.lethal + left.aggravated
        ? `Not enough Vitae to heal ${Kindred.describeDamage(left)}.` : "",
      plan.canWake
        ? `Rising costs 1 Vitae: ${this.name} wakes with <strong>${plan.vitaeAfterWaking} Vitae</strong>`
          + `${regains ? " and recovers 1 Willpower" : ""}.`
        : `<span class="vtr-warn">No Vitae left to rise with: ${this.name} falls into <strong>torpor</strong>.</span>`
    ].filter(Boolean);

    this._renderRiteDialog({
      title: `Daysleep — ${this.name}`,
      variant: "stamina",
      width: 380,
      body: `<p class="vtr-rite-summary">${lines.join("<br>")}</p>`,
      buttons: {
        sleep: {
          icon: '<i class="fas fa-moon"></i>',
          label: "Sleep",
          callback: () => this._sleepAndRise()
        }
      }
    });
  }

  /**
   * Sleep through the day and rise: heal, then spend the Vitae it costs to
   * wake, or fall into torpor without it.
   */
  async _sleepAndRise() {
    const wounds = Kindred.woundCounts(this.system.health);
    const vitae = atLeast0(this.system?.vitae?.value);
    const banked = atLeast0(this.getFlag(SYSTEM_ID, "aggravatedMending"));
    const plan = Kindred.daysleepPlan({ wounds, vitae, banked });
    const willpower = atLeast0(this.system?.willpower?.value);

    const health = Kindred.healthCounters({
      max: wounds.max,
      bashing: wounds.bashing - plan.healed.bashing,
      lethal: wounds.lethal - plan.healed.lethal,
      aggravated: wounds.aggravated - plan.healed.aggravated
    });
    const update = {
      "system.health.value": health.value,
      "system.health.lethal": health.lethal,
      "system.health.aggravated": health.aggravated,
      "system.vitae.value": plan.vitaeAfterWaking,
      // The night is over: the Phases of Night marker returns to Early Dawn
      // and the Blush of Life wears off.
      "system.phaseOfNight": 0,
      [`flags.${SYSTEM_ID}.blushActive`]: false
    };
    if (banked) update[`flags.${SYSTEM_ID}.aggravatedMending`] = plan.bankedLeft;
    // Homebrew alternative Willpower: rising for the night restores a point.
    const regained = plan.canWake && game.settings.get(SYSTEM_ID, "homebrewWillpower")
      && willpower < atLeast0(this.system?.willpower?.max ?? willpower);
    if (regained) update["system.willpower.value"] = willpower + 1;
    await this.update(update);

    const mended = plan.healed.bashing + plan.healed.lethal + plan.healed.aggravated;
    const lines = [
      mended ? `The sleep heals <strong>${Kindred.describeDamage(plan.healed)}</strong> for `
        + `${plan.vitaeSpent} Vitae${plan.bankedUsed ? ` and ${plan.bankedUsed} set aside earlier` : ""}.` : ""
    ];
    if (plan.canWake) {
      await this._postKindredCard({
        title: "Daysleep",
        lines: [...lines, `<strong>${this.name}</strong> wakes and expends a point of Vitae`
          + `${regained ? " and recovers 1 Willpower" : ""}. Vitae now ${plan.vitaeAfterWaking}.`]
      });
    } else {
      const base = CONFIG.MTA.humanity_levels[Math.clamp(this.getBaneHumanity(), 0, 10)].torpor;
      await this._postKindredCard({
        tone: "messy-failure",
        title: "Daysleep &mdash; torpor",
        lines: [...lines,
          `<strong>${this.name}</strong> has no Vitae to rise with and drifts into torpor.`,
          `<em>It lasts about ${base}, multiplied by Blood Potency ${this.getBloodPotency()}.</em>`]
      });
    }
  }

  /* -------------------------------------------- */
  /*  Physical Disciplines: active effects        */
  /* -------------------------------------------- */

  /**
   * Call on the active effects of Celerity, Resilience and Vigor (p. 130-142).
   * Each costs 1 Vitae, is reflexive, lasts the turn and may be used once a
   * turn. Tick every effect wanted, then one button pays for them together.
   *
   * Vigor's weapon bonus is not here: it is a toggle on the attack roll, next
   * to Physical Intensity. Resilience is offered here only in combat, where
   * "this turn" has edges; otherwise it is asked for when damage arrives.
   */
  async usePhysicalDisciplines() {
    const celerity = this.disciplineDots("celerity");
    const resilience = this.disciplineDots("resilience");
    const vigor = this.disciplineDots("vigor");
    if (celerity + resilience + vigor === 0) {
      ui.notifications.info(`${this.name} has no dots in Celerity, Resilience or Vigor.`);
      return;
    }
    const inCombat = !!this._turnKey();
    const speed = int(this.system?.derivedTraits?.speed?.final);
    const strength = int(this.system?.attributes_physical?.strength?.final);
    const sceneKey = game.combat?.id ?? "open";
    const record = this.getFlag(SYSTEM_ID, "celerityInterrupts");
    const interrupts = record?.scene === sceneKey ? atLeast0(record.used) : 0;

    const effects = [];
    if (celerity) {
      effects.push(
        { key: "celerityInitiative", text: "Celerity &mdash; act first this turn, ahead of the Initiative order",
          card: "moves to the head of the Initiative order for this turn" },
        { key: "celerityInterrupt", blocked: interrupts >= celerity,
          text: `Celerity &mdash; interrupt another's declared action (${interrupts} of ${celerity} used this scene)`,
          card: "interrupts a declared action with one instant action" },
        { key: "celeritySpeed", text: `Celerity &mdash; Speed &times; ${celerity + 1} this turn (${speed * (celerity + 1)})`,
          card: `moves at Speed ${speed * (celerity + 1)} this turn` });
    }
    if (resilience && inCombat) {
      effects.push(
        { key: "resilienceSoak", text: `Resilience &mdash; dismiss ${resilience + 1} of each ordinary source of damage this turn`,
          card: `dismisses ${resilience + 1} damage from each ordinary source this turn` },
        { key: "resilienceBane", text: `Resilience &mdash; dismiss ${resilience} of fire and bane damage this turn (never sunlight)`,
          card: `dismisses ${resilience} damage from fire and banes this turn` });
    }
    if (vigor) {
      effects.push(
        { key: "vigorHurl", text: `Vigor &mdash; lift and hurl an object of up to Size ${strength}`,
          card: `can lift and hurl an object of up to Size ${strength} as a weapon this turn` });
    }
    for (const e of effects) e.used = this._usedThisTurn(e.key);

    const body = `
      <p class="vtr-rite-summary">Each effect costs 1 Vitae and lasts this turn &middot;
        Vitae <strong>${atLeast0(this.system?.vitae?.value)}</strong>${inCombat
          ? `<br>Spent this turn: ${this.getVitaeSpentThisTurn()} of ${this.getVitaePerTurn()}` : ""}</p>
      <div class="vtr-rite-checks">${effects.map(e => `
        <label${e.used || e.blocked ? ' class="vtr-rite-disabled"' : ""}>
          <input type="checkbox" name="${e.key}"${e.used || e.blocked ? " disabled" : ""}>
          ${e.text}${e.used ? " <em>(already used this turn)</em>" : ""}</label>`).join("")}
      </div>
      ${vigor ? `<p class="vtr-rite-note">Vigor's +${vigor} weapon bonus is a toggle on the attack roll.</p>` : ""}`;

    this._renderRiteDialog({
      title: `Physical Disciplines — ${this.name}`,
      variant: "strength",
      width: 520,
      body,
      buttons: {
        use: {
          icon: '<i class="fas fa-bolt"></i>',
          label: "Spend Vitae",
          callback: async (html) => {
            const r = reader(html);
            const chosen = effects.filter(e => !e.used && !e.blocked && r.on(e.key));
            if (!chosen.length) return;
            const update = {};
            this._markUsedThisTurn(chosen.map(e => e.key), update);
            if (chosen.some(e => e.key === "celerityInterrupt")) {
              update[`flags.${SYSTEM_ID}.celerityInterrupts`] = { scene: sceneKey, used: interrupts + 1 };
            }
            if (!(await this.spendVitae(chosen.length, { reason: "call on those Disciplines", update }))) return;
            await this._postKindredCard({
              title: "Physical Disciplines",
              lines: [
                `<strong>${this.name}</strong> ${chosen.map(e => e.card).join("; ")}.`,
                `<em>${plural(chosen.length, "Vitae", "Vitae")} spent.</em>`
              ]
            });
          }
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  Feeding                                     */
  /* -------------------------------------------- */

  /**
   * Feed (p. 89, p. 95). The dialog asks only what kind of blood it is and
   * how much to take, and says what that will do first. The game is mostly
   * played without a map, so the normal case has nothing targeted: only the
   * feeder's sheet changes, and the card states what the vessel suffers for
   * the Storyteller to apply. When the vessel does have a token, targeting it
   * first picks the kind of blood, reads their Health, Stamina, Size or Vitae,
   * and makes their sheet pay too.
   */
  async openFeeding() {
    const targeted = [...(game.user?.targets ?? [])];
    if (targeted.length > 1) {
      ui.notifications.warn("Target one character to drink from, or none.");
      return;
    }
    const vessel = targeted[0]?.actor ?? null;
    if (vessel && vessel.uuid === this.uuid) {
      ui.notifications.warn(`${this.name} cannot drink from themself.`);
      return;
    }
    // A token's own UUID resolves to the right actor for linked and unlinked
    // tokens alike, so prefer it over the actor's.
    const vesselUuid = vessel ? (targeted[0].document?.uuid ?? vessel.uuid) : null;
    const vs = vessel?.system ?? {};
    const kinds = { human: "Person", animal: "Animal", kindred: "Vampire" };
    if (!vessel) kinds.cold = "Bagged blood";
    const guess = !vessel ? "human"
      : targetIsKindred(vessel) ? "kindred"
      : /animal|beast/i.test(String(vs.antagonistType ?? "")) ? "animal" : "human";
    const sourceName = { human: "a person", animal: "an animal", kindred: "another vampire", cold: "bagged blood" };

    const bp = this.getBloodPotency();
    // Read live, so the button acts on the sheet as it is when pressed.
    const vitae = () => atLeast0(this.system?.vitae?.value);
    const willpower = () => atLeast0(this.system?.willpower?.value);
    const maxVitae = atLeast0(this.system?.vitae?.max);
    const known = (v) => (v == null ? undefined : atLeast0(v));

    // What a feeding comes to. A targeted vessel's own numbers limit it;
    // without one, only the feeder's pool and Willpower do.
    const planFor = (kind, requested) => Kindred.feedingPlan({
      vessel: kind, requested, bloodPotency: bp, vitae: vitae(), maxVitae, willpower: willpower(),
      health: vessel ? known(vs.health?.max) : undefined,
      stamina: vessel ? known(vs.attributes_physical?.stamina?.final ?? vs.attributes_physical?.stamina?.value) : undefined,
      size: vessel ? known(vs.derivedTraits?.size?.final ?? vs.size) : undefined,
      vesselVitae: vessel && kind === "kindred" ? known(vs.vitae?.value) : undefined
    });
    const most = (kind) => planFor(kind, 999).gained;
    const whyNothing = (kind) => {
      const plan = planFor(kind, 1);
      return plan.room < 1 ? `${this.name}'s Vitae is already full.`
        : plan.beneath && willpower() < 1
          ? `This blood is too weak for Blood Potency ${bp}, and there is no Willpower to force it down.`
          : `${vessel?.name ?? "The vessel"} has no blood to give.`;
    };

    const preview = (kind, requested) => {
      const top = most(kind);
      if (top < 1) return `<span class="vtr-warn">${whyNothing(kind)}</span>`;
      const plan = planFor(kind, Math.clamp(int(requested), 1, top));
      const them = vessel?.name ?? "They";
      const s = vessel ? "s" : "";
      return [
        `${this.name} gains <strong>${plural(plan.gained, "Vitae", "Vitae")}</strong>`
          + ` (${vitae()} &rarr; ${vitae() + plan.gained} of ${maxVitae}).`,
        plan.willpowerCost ? `This blood is too weak for Blood Potency ${bp}: it costs `
          + `${plan.willpowerCost} Willpower.` : "",
        plan.vesselLethal ? `${them} take${s} ${plan.vesselLethal} lethal damage`
          + `${plan.drained ? ` and ${vessel ? "is" : "are"} left Drained` : ""}.` : "",
        plan.vesselVitaeLoss ? `${them} lose${s} ${plural(plan.vesselVitaeLoss, "Vitae", "Vitae")}. `
          + `Vampire blood is addictive and builds a blood bond.` : ""
      ].filter(Boolean).join("<br>");
    };

    const body = `
      <p class="vtr-rite-summary">Drink from${vessel ? ` <strong>${vessel.name}</strong>` : ""}</p>
      <div class="vtr-pills">${Object.entries(kinds).map(([key, label]) => `
        <label><input type="radio" name="kind" value="${key}"${key === guess ? " checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
      <div class="vtr-amount"><span>Vitae to take</span>${stepper("amount", 1, 1, Math.max(1, most(guess)))}</div>
      <p class="vtr-rite-preview">${preview(guess, 1)}</p>`;

    this._renderRiteDialog({
      title: `Feed — ${this.name}`,
      variant: "feeding",
      background: "dark_mouth_wipe.png",
      width: 400,
      body,
      onRender: (el) => {
        const amount = el.querySelector('[name="amount"]');
        const out = el.querySelector(".vtr-rite-preview");
        const kind = () => el.querySelector('[name="kind"]:checked')?.value ?? guess;
        const refresh = () => { out.innerHTML = preview(kind(), amount.value); };
        wireSteppers(el, refresh);
        for (const radio of el.querySelectorAll('[name="kind"]')) {
          radio.addEventListener("change", () => {
            amount.max = Math.max(1, most(kind()));
            amount.value = Math.clamp(int(amount.value), 1, int(amount.max));
            refresh();
          });
        }
      },
      buttons: {
        drink: {
          icon: '<i class="fas fa-tint"></i>',
          label: "Drink",
          callback: async (html) => {
            const r = reader(html);
            const kind = kinds[r.picked("kind")] ? r.picked("kind") : guess;
            const top = most(kind);
            if (top < 1) {
              ui.notifications.warn(whyNothing(kind));
              return;
            }
            const plan = planFor(kind, Math.clamp(r.num("amount"), 1, top));
            const before = vitae();

            const update = { "system.vitae.value": before + plan.gained };
            if (plan.willpowerCost) update["system.willpower.value"] = willpower() - plan.willpowerCost;
            await this.update(update);

            // The vessel pays, when there is one and this user may change it.
            let vesselButtons = "";
            if (vessel && (plan.vesselLethal || plan.vesselVitaeLoss)) {
              if (vessel.isOwner) {
                await vessel.sufferFeeding({ lethal: plan.vesselLethal, vitae: plan.vesselVitaeLoss });
              } else {
                vesselButtons += `<button type="button" class="vtr-frenzy-button" data-vtr-vessel="${vesselUuid}" `
                  + `data-lethal="${plan.vesselLethal}" data-vitae="${plan.vesselVitaeLoss}">`
                  + `Apply to ${vessel.name}</button>`;
              }
            }
            if (vessel && plan.drained) {
              vesselButtons += `<button type="button" class="vtr-frenzy-button" data-vtr-apply-condition="Drained" `
                + `data-actor-uuid="${vessel.uuid}">Apply Drained to ${vessel.name}</button>`;
            }

            const who = vessel?.name ?? "The vessel";
            await this._postKindredCard({
              title: "Feeding",
              lines: [
                `<strong>${this.name}</strong> drinks <strong>${plural(plan.gained, "Vitae", "Vitae")}</strong> `
                  + `from ${vessel?.name ?? sourceName[kind]}. Vitae now ${before + plan.gained}.`,
                plan.willpowerCost ? `The blood is too weak for their Blood Potency: `
                  + `${plan.willpowerCost} Willpower spent.` : "",
                plan.vesselLethal ? `${who} takes ${plan.vesselLethal} lethal damage`
                  + `${plan.drained ? " and is left Drained" : ""}.` : "",
                plan.vesselVitaeLoss ? `${who} loses ${plural(plan.vesselVitaeLoss, "Vitae", "Vitae")}. `
                  + `Vampire blood is addictive and builds a blood bond.` : "",
                plan.coldPints ? `That takes ${plural(plan.coldPints, "pint")} of cold blood.` : ""
              ],
              buttons: vesselButtons
            });
          }
        }
      }
    });
  }

  /**
   * What being fed upon costs this character: lethal damage for a living
   * vessel, Vitae for a Kindred one. A bite's damage is not mundane harm, so
   * it is not softened.
   */
  async sufferFeeding({ lethal = 0, vitae = 0 } = {}) {
    if (atLeast0(vitae)) {
      await this.update({ "system.vitae.value": Math.max(0, atLeast0(this.system?.vitae?.value) - atLeast0(vitae)) });
    }
    if (atLeast0(lethal)) await this.sufferDamage({ lethal: atLeast0(lethal) }, { source: "supernatural" });
  }
};
