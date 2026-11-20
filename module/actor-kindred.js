import { DiceRollerDialogue } from "./dialogue-diceRoller.js";
import * as Kindred from "./kindred.js";

const SYSTEM_ID = "vampire-the-requiem-2e";

const int = (v) => Math.round(Number(v) || 0);
const atLeast0 = (v) => Math.max(0, int(v));
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Read named inputs back out of an appv1 Dialog's jQuery html. */
const reader = (html) => ({
  num: (name) => int(html.find(`[name="${name}"]`).val()),
  str: (name) => String(html.find(`[name="${name}"]`).val() ?? ""),
  on: (name) => html.find(`[name="${name}"]`).is(":checked")
});

/**
 * The Kindred body (Vampire: The Requiem 2E, chapter 3): spending Vitae,
 * taking and mending damage, the day's sleep, the physical Disciplines'
 * active effects, sunlight and fire, and feeding.
 *
 * Each action follows the same shape: a dialog collects every choice, and
 * one button then carries the whole thing out and posts a card. The rules
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
   * at once. An aggravated wound takes 5 Vitae and a full day's sleep, so
   * Vitae can only be set aside towards it here; daysleep() finishes it.
   */
  async mendWounds() {
    const wounds = Kindred.woundCounts(this.system.health);
    if (wounds.bashing + wounds.lethal + wounds.aggravated === 0) {
      ui.notifications.info(`${this.name} has no wounds to mend.`);
      return;
    }
    const vitae = atLeast0(this.system?.vitae?.value);
    const banked = atLeast0(this.getFlag(SYSTEM_ID, "aggravatedMending"));
    const inCombat = !!this._turnKey();
    // Offer the cheapest boxes first, within what can be spent right now.
    const budget = inCombat ? Math.min(vitae, Math.max(0, this.getVitaePerTurn() - this.getVitaeSpentThisTurn())) : vitae;
    const offerBashing = Math.min(wounds.bashing, budget * 2);
    const offerLethal = Math.min(wounds.lethal, Math.max(0, budget - Math.ceil(offerBashing / 2)));

    const body = `
      <p class="vtr-rite-summary">Wounds: <strong>${Kindred.describeDamage(wounds)}</strong> &middot;
        Vitae <strong>${vitae}</strong>${inCombat
          ? `<br>Spent this turn: ${this.getVitaeSpentThisTurn()} of ${this.getVitaePerTurn()}` : ""}</p>
      <dl>
        <dt>Bashing to mend (1 Vitae per two):</dt>
        <dd><input type="number" name="bashing" value="${offerBashing}" min="0" max="${wounds.bashing}"></dd>
        <dt>Lethal to mend (1 Vitae each):</dt>
        <dd><input type="number" name="lethal" value="${offerLethal}" min="0" max="${wounds.lethal}"></dd>
        ${wounds.aggravated ? `
        <dt>Vitae to set aside for an aggravated wound (${Kindred.AGGRAVATED_MEND_COST} each, closed by a
          day's sleep; ${banked} set aside so far):</dt>
        <dd><input type="number" name="bank" value="0" min="0"></dd>` : ""}
      </dl>`;

    this._renderRiteDialog({
      title: `Mend — ${this.name}`,
      variant: "stamina",
      body,
      buttons: {
        mend: {
          icon: '<i class="fas fa-droplet"></i>',
          label: "Mend",
          callback: async (html) => {
            const r = reader(html);
            const bashing = Math.clamp(r.num("bashing"), 0, wounds.bashing);
            const lethal = Math.clamp(r.num("lethal"), 0, wounds.lethal);
            const bank = wounds.aggravated ? atLeast0(r.num("bank")) : 0;
            const cost = Kindred.mendCost({ bashing, lethal }) + bank;
            if (cost === 0) return;

            const health = Kindred.healthCounters({
              max: wounds.max,
              bashing: wounds.bashing - bashing,
              lethal: wounds.lethal - lethal,
              aggravated: wounds.aggravated
            });
            const update = {
              "system.health.value": health.value,
              "system.health.lethal": health.lethal,
              "system.health.aggravated": health.aggravated
            };
            if (bank) update[`flags.${SYSTEM_ID}.aggravatedMending`] = banked + bank;
            if (!(await this.spendVitae(cost, { reason: "mend", update }))) return;

            const mended = Kindred.describeDamage({ bashing, lethal });
            await this._postKindredCard({
              title: "Mending",
              lines: [
                (bashing + lethal) ? `<strong>${this.name}</strong> mends <strong>${mended}</strong>.` : "",
                bank ? `${plural(bank, "Vitae", "Vitae")} set aside towards an aggravated wound `
                  + `(${banked + bank} in all; a day's sleep closes one for every ${Kindred.AGGRAVATED_MEND_COST}).` : "",
                `<em>${plural(cost, "Vitae", "Vitae")} spent.</em>`
              ]
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
   * The day's sleep (p. 91, p. 98). The dialog shows what the sleep will do
   * and takes the two choices there are: wounds to keep (1 Willpower each)
   * and Haven dots. Its buttons are the three things that can happen at
   * dawn: sleep and rise the next night, try to stay awake, or be woken.
   */
  async daysleep() {
    const wounds = Kindred.woundCounts(this.system.health);
    const vitae = atLeast0(this.system?.vitae?.value);
    const banked = atLeast0(this.getFlag(SYSTEM_ID, "aggravatedMending"));
    const haven = this.meritDots(/^haven\b/i);
    const wounded = wounds.bashing + wounds.lethal + wounds.aggravated > 0;
    const plan = Kindred.daysleepPlan({ wounds, vitae, banked });
    const healed = Kindred.describeDamage(plan.healed);

    const forecast = !wounded
      ? `Rising costs 1 Vitae${vitae < 1 ? ", and there is none: <strong>torpor</strong>" : ""}.`
      : `Left alone, the sleep mends <strong>${healed}</strong> for ${plan.vitaeSpent} Vitae`
        + (plan.canWake ? `, leaving ${plan.vitaeAfterWaking} after rising.`
          : `, leaving none to rise with: <strong>torpor</strong>.`);

    const keep = (key, label) => wounds[key] ? `
        <dt>${label} wounds to keep, of ${wounds[key]} (1 Willpower each):</dt>
        <dd><input type="number" name="keep_${key}" value="0" min="0" max="${wounds[key]}"></dd>` : "";

    const body = `
      <p class="vtr-rite-summary">Wounds: <strong>${Kindred.describeDamage(wounds)}</strong> &middot;
        Vitae <strong>${vitae}</strong>${banked ? ` &middot; ${banked} set aside` : ""}<br>${forecast}</p>
      <dl>${keep("bashing", "Bashing")}${keep("lethal", "Lethal")}${keep("aggravated", "Aggravated")}
        <dt>Haven dots, if sleeping in the haven (added to both rolls):</dt>
        <dd><input type="number" name="haven" value="${haven}" min="0" max="5"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: `Daysleep — ${this.name}`,
      variant: "stamina",
      width: 520,
      body,
      buttons: {
        sleep: {
          icon: '<i class="fas fa-moon"></i>',
          label: "Sleep and rise",
          callback: (html) => {
            const r = reader(html);
            return this._sleepAndRise({
              bashing: r.num("keep_bashing"), lethal: r.num("keep_lethal"), aggravated: r.num("keep_aggravated")
            });
          }
        },
        resist: {
          icon: '<i class="fas fa-eye"></i>',
          label: "Stay awake",
          callback: (html) => this._rollStayAwake(atLeast0(reader(html).num("haven")))
        },
        wake: {
          icon: '<i class="fas fa-bell"></i>',
          label: "Woken by danger",
          callback: (html) => this._rollWakeToDanger(atLeast0(reader(html).num("haven")))
        }
      }
    });
  }

  /**
   * Sleep through the day and rise: heal, pay Willpower for kept wounds, then
   * spend the Vitae it costs to wake, or fall into torpor without it.
   * @param {{bashing?:number, lethal?:number, aggravated?:number}} preserve
   */
  async _sleepAndRise(preserve = {}) {
    const wounds = Kindred.woundCounts(this.system.health);
    const vitae = atLeast0(this.system?.vitae?.value);
    const banked = atLeast0(this.getFlag(SYSTEM_ID, "aggravatedMending"));
    const plan = Kindred.daysleepPlan({ wounds, vitae, banked, preserve });

    const willpower = atLeast0(this.system?.willpower?.value);
    if (plan.willpowerCost > willpower) {
      ui.notifications.warn(`${this.name} has ${willpower} Willpower; keeping ${plan.willpowerCost} wounds costs ${plan.willpowerCost}.`);
      return;
    }

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
      [`flags.${SYSTEM_ID}.blushActive`]: false,
      [`flags.${SYSTEM_ID}.aggravatedMending`]: plan.bankedLeft
    };
    let newWillpower = willpower - plan.willpowerCost;
    // Homebrew alternative Willpower: rising for the night restores a point.
    let regained = false;
    if (plan.canWake && game.settings.get(SYSTEM_ID, "homebrewWillpower")
        && newWillpower < atLeast0(this.system?.willpower?.max ?? newWillpower)) {
      newWillpower += 1;
      regained = true;
    }
    if (newWillpower !== willpower) update["system.willpower.value"] = newWillpower;
    await this.update(update);

    const mended = plan.healed.bashing + plan.healed.lethal + plan.healed.aggravated;
    const lines = [
      mended ? `The sleep mends <strong>${Kindred.describeDamage(plan.healed)}</strong> for `
        + `${plan.vitaeSpent} Vitae${plan.bankedUsed ? ` and ${plan.bankedUsed} set aside earlier` : ""}.` : "",
      plan.willpowerCost ? `${plural(plan.willpowerCost, "wound")} kept through the day for `
        + `${plan.willpowerCost} Willpower.` : ""
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

  /** Resist the day's sleep: Stamina + Resolve, plus Haven dots (p. 98). */
  async _rollStayAwake(haven = 0) {
    const sys = this.system;
    const pool = int(sys.attributes_physical?.stamina?.final) + int(sys.attributes_mental?.resolve?.final) + haven;
    const rollReturn = {};
    await DiceRollerDialogue.rollToChat({
      dicePool: pool,
      flavor: `Resisting the day's sleep (Stamina + Resolve${haven ? ` + Haven ${haven}` : ""})`,
      title: "Resisting the day's sleep",
      actorOverride: this,
      hungerDice: 0,
      rollReturn
    });
    const roll = rollReturn.roll;
    const hits = Math.max(0, roll?.total ?? 0);
    if (hits < 1) {
      return this._postKindredCard({
        tone: "messy-failure",
        title: "The day wins",
        lines: [`<strong>${this.name}</strong> cannot hold off the sleep. Use Daysleep again to sleep and rise.`]
      });
    }
    const exceptional = roll?.exceptionalSuccess || hits >= 5;
    return this._postKindredCard({
      title: exceptional ? "Awake &mdash; Exceptional success" : "Awake through the day",
      lines: [exceptional
        ? `<strong>${this.name}</strong> stays alert and active, with no ill effect.`
        : `<strong>${this.name}</strong> stays alert and active, but gains the Lethargic Condition.`],
      buttons: exceptional ? "" : `<button type="button" class="vtr-frenzy-button" `
        + `data-vtr-apply-condition="Lethargic" data-actor-uuid="${this.uuid}">Apply Lethargic Condition</button>`
    });
  }

  /** Something disturbs the sleeper: a Humanity roll, plus Haven dots (p. 98). */
  async _rollWakeToDanger(haven = 0) {
    const humanity = this.getHumanity();
    const rollReturn = {};
    await DiceRollerDialogue.rollToChat({
      dicePool: humanity + haven,
      flavor: `Woken by danger (Humanity${haven ? ` + Haven ${haven}` : ""})`,
      title: "Woken by danger",
      actorOverride: this,
      hungerDice: 0,
      rollReturn
    });
    const hits = Math.max(0, rollReturn.roll?.total ?? 0);
    if (hits < 1) {
      return this._postKindredCard({
        tone: "messy-failure",
        title: "Still asleep",
        lines: [`<strong>${this.name}</strong> does not stir.`]
      });
    }
    return this._postKindredCard({
      title: "Awake",
      lines: [
        `<strong>${this.name}</strong> snaps awake for ${plural(humanity, "turn")} and may act in self-defence, `
          + `then falls back to sleep. Waking this way expends a point of Vitae.`,
        `<em>More than ${5 + this.getBloodPotency()} successes over those turns means staying awake for good.</em>`
      ]
    });
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
  /*  Sunlight and fire                           */
  /* -------------------------------------------- */

  /** Choose which of the great banes is at work, then open its dialog. */
  async exposeToBane() {
    this._renderRiteDialog({
      title: `Banes — ${this.name}`,
      variant: "frenzy",
      body: `<p class="vtr-rite-summary">Which bane touches <strong>${this.name}</strong>?</p>`,
      buttons: {
        sun: { icon: '<i class="fas fa-sun"></i>', label: "Sunlight", callback: () => this.exposeToSunlight() },
        fire: { icon: '<i class="fas fa-fire"></i>', label: "Fire", callback: () => this.exposeToFire() }
      }
    });
  }

  /**
   * Sunlight (p. 102). Humanity sets the damage and Blood Potency how often
   * it lands. Resilience never helps.
   */
  async exposeToSunlight() {
    const humanity = this.getBaneHumanity();
    const bloodPotency = this.getBloodPotency();
    const now = Kindred.sunlightExposure({ humanity, bloodPotency });
    const lowered = humanity !== this.getHumanity();

    const body = `
      <p class="vtr-rite-summary">Humanity <strong>${humanity}</strong>${lowered ? " (Mekhet: one lower)" : ""}
        &middot; Blood Potency <strong>${bloodPotency}</strong><br>
        ${now.times ? `<strong>${now.amount} ${now.type}</strong>, ${now.label}` : "Sunlight does no damage"}</p>
      <dl>
        <dt>Intervals of exposure:</dt>
        <dd><input type="number" name="intervals" value="1" min="1"></dd>
      </dl>
      <div class="vtr-rite-checks">
        <label><input type="checkbox" name="eyesOnly"> Covered but for the eyes (one step slower)</label>
      </div>`;

    this._renderRiteDialog({
      title: `Sunlight — ${this.name}`,
      variant: "frenzy",
      body,
      buttons: {
        burn: {
          icon: '<i class="fas fa-sun"></i>',
          label: "Burn",
          callback: async (html) => {
            const r = reader(html);
            const sun = Kindred.sunlightExposure({
              humanity, bloodPotency, eyesOnly: r.on("eyesOnly"), intervals: Math.max(1, r.num("intervals"))
            });
            if (sun.total < 1) {
              return this._postKindredCard({
                title: "Sunlight",
                lines: [`The sun does <strong>${this.name}</strong> no harm at this pace.`]
              });
            }
            const dealt = { [sun.type]: sun.total };
            const suffered = await this.sufferDamage(dealt, { source: "sunlight" });
            await this._postKindredCard({
              tone: "messy-failure",
              title: "Sunlight",
              lines: [
                `${sun.amount} ${sun.type}, ${sun.label}. ${this._intakeLine(dealt, suffered, "sunlight")}`,
                `<em>Resilience offers nothing against the sun. Sunlight is a provocation to frenzy.</em>`
              ],
              buttons: `<button type="button" class="vtr-frenzy-button" data-vtr-frenzy="1" `
                + `data-actor-id="${this.id}">Resist Frenzy</button>`
            });
          }
        }
      }
    });
  }

  /**
   * Fire (p. 103): aggravated damage each turn, from the fire's size and
   * heat. Resilience turns one point per dot to lethal, and its active
   * effect dismisses its dots outright for a Vitae.
   */
  async exposeToFire() {
    const resilience = this.disciplineDots("resilience");
    const armed = resilience > 0 && this._usedThisTurn("resilienceBane");
    const options = (table) => Object.entries(table).map(([key, row]) =>
      `<option value="${key}">${row.label} (${row.damage ? `+${row.damage}` : "+0"})</option>`).join("");

    const body = `
      <p class="vtr-rite-summary">Fire burns for aggravated damage every turn of exposure.</p>
      <dl>
        <dt>Size of the fire:</dt>
        <dd><select name="size">${options(CONFIG.MTA.fireSizes)}</select></dd>
        <dt>Heat of the fire:</dt>
        <dd><select name="heat">${options(CONFIG.MTA.fireHeats)}</select></dd>
      </dl>
      ${resilience ? `<div class="vtr-rite-checks">
        <label><input type="checkbox" name="soak"${armed ? " checked disabled" : ""}>
          Resilience &mdash; ${armed ? `already dismissing ${resilience} this turn`
            : `spend 1 Vitae to dismiss ${resilience} of it this turn`}</label>
      </div>` : ""}`;

    this._renderRiteDialog({
      title: `Fire — ${this.name}`,
      variant: "frenzy",
      body,
      buttons: {
        burn: {
          icon: '<i class="fas fa-fire"></i>',
          label: "Burn",
          callback: async (html) => {
            const r = reader(html);
            const raw = Kindred.fireDamage({ size: r.str("size"), heat: r.str("heat") });
            let active = armed;
            if (!armed && resilience && r.on("soak")) {
              const update = {};
              this._markUsedThisTurn(["resilienceBane"], update);
              active = await this.spendVitae(1, { reason: "call on Resilience", update });
            }
            const dealt = { aggravated: raw };
            const suffered = await this.sufferDamage(dealt, { source: "fire", resilienceActive: active });
            await this._postKindredCard({
              tone: "messy-failure",
              title: "Fire",
              lines: [
                this._intakeLine(dealt, suffered, "fire"),
                `<em>That is one turn of exposure. Fire is a provocation to frenzy.</em>`
              ],
              buttons: `<button type="button" class="vtr-frenzy-button" data-vtr-frenzy="1" `
                + `data-actor-id="${this.id}">Resist Frenzy</button>`
            });
          }
        }
      }
    });
  }

  /* -------------------------------------------- */
  /*  Feeding                                     */
  /* -------------------------------------------- */

  /** The feeding menu: a line on Kindred senses and one button per action. */
  async openFeeding() {
    const bp = this.getBloodPotency();
    const auspex = this.disciplineDots("auspex");
    const herd = this.meritDots(/^herd\b/i);
    const buttons = {
      feed: { icon: '<i class="fas fa-tint"></i>', label: "Feed from a vessel", callback: () => this.feedFromVessel() },
      hunt: { icon: '<i class="fas fa-search"></i>', label: "Hunt (roll)", callback: () => this.rollHunt() },
      start: { icon: '<i class="fas fa-dice-d10"></i>', label: "Starting Vitae", callback: () => this.rollStartingVitae() }
    };
    if (herd) {
      buttons.herd = { icon: '<i class="fas fa-users"></i>', label: `Draw on the Herd (${herd * 2} Vitae a week)`,
        callback: () => this.drawOnHerd() };
    }
    buttons.taste = { icon: '<i class="fas fa-flask"></i>', label: "A taste of blood (roll)", callback: () => this.rollTasteOfBlood() };

    this._renderRiteDialog({
      title: `Feeding — ${this.name}`,
      variant: "survival",
      stacked: true,
      body: `
        <p class="vtr-rite-summary">Vitae <strong>${atLeast0(this.system?.vitae?.value)}</strong> of
          ${atLeast0(this.system?.vitae?.max)} &middot; nourished by
          <strong>${CONFIG.MTA.bloodPotency_levels[bp].feedsFrom}</strong> and above</p>
        <p class="vtr-rite-note">Kindred senses: hears a heartbeat within ${3 * bp} yards and smells blood within
          ${10 * bp * Math.max(1, auspex)} yards${auspex ? " (with Auspex)" : ""}. Add Blood Potency to rolls
          to track a tasted mortal by scent or to find someone by traces of blood.</p>`,
      buttons
    });
  }

  /**
   * Feed from a vessel (p. 89, p. 95). The vessel is the token targeted when
   * the dialog opens, if there is one: its Health, Stamina, Size and Vitae
   * are filled in and it takes the consequences. Without a target the
   * numbers are typed in and nothing but the feeder changes.
   */
  async feedFromVessel() {
    const targeted = [...(game.user?.targets ?? [])];
    if (targeted.length > 1) {
      ui.notifications.warn("Target a single vessel, or none.");
      return;
    }
    const vessel = targeted[0]?.actor ?? null;
    if (vessel && vessel.uuid === this.uuid) {
      ui.notifications.warn(`${this.name} cannot be their own vessel.`);
      return;
    }
    const vesselUuid = vessel ? (targeted[0].document?.uuid ?? vessel.uuid) : null;
    const vs = vessel?.system ?? {};
    const vesselKind = vessel ? (vs.characterVariant === "vampire" ? "kindred" : "human") : "human";
    const bp = this.getBloodPotency();
    const picked = (kind) => (kind === vesselKind ? " selected" : "");

    const body = `
      <p class="vtr-rite-summary">${vessel ? `Vessel: <strong>${vessel.name}</strong>`
          : "<em>No token targeted &mdash; only the feeder changes</em>"}<br>
        Vitae <strong>${atLeast0(this.system?.vitae?.value)}</strong> of ${atLeast0(this.system?.vitae?.max)}
        &middot; nourished by ${CONFIG.MTA.bloodPotency_levels[bp].feedsFrom} and above</p>
      <dl>
        <dt>The blood is:</dt>
        <dd><select name="vessel">${Object.entries(Kindred.VESSELS).map(([key, v]) =>
          `<option value="${key}"${picked(key)}>${v.label}</option>`).join("")}</select></dd>
        <dt>Vitae to take:</dt>
        <dd><input type="number" name="requested" value="1" min="1"></dd>
        <dt>Living human &mdash; Health dots / Stamina:</dt>
        <dd><input type="number" name="health" value="${atLeast0(vs.health?.max ?? 7)}" min="0">
            <input type="number" name="stamina" value="${atLeast0(vs.attributes_physical?.stamina?.final ?? 2)}" min="0"></dd>
        <dt>Animal &mdash; Size:</dt>
        <dd><input type="number" name="size" value="${atLeast0(vs.derivedTraits?.size?.final ?? 3)}" min="0"></dd>
        <dt>Kindred &mdash; Vitae they hold:</dt>
        <dd><input type="number" name="vesselVitae" value="${atLeast0(vs.vitae?.value ?? 0)}" min="0"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: `Feed — ${this.name}`,
      variant: "survival",
      body,
      buttons: {
        feed: {
          icon: '<i class="fas fa-tint"></i>',
          label: "Feed",
          callback: async (html) => {
            const r = reader(html);
            const kind = Kindred.VESSELS[r.str("vessel")] ? r.str("vessel") : "human";
            const willpower = atLeast0(this.system?.willpower?.value);
            const vitae = atLeast0(this.system?.vitae?.value);
            const plan = Kindred.feedingPlan({
              vessel: kind,
              requested: Math.max(1, r.num("requested")),
              bloodPotency: bp,
              vitae,
              maxVitae: atLeast0(this.system?.vitae?.max),
              willpower,
              health: r.num("health"),
              stamina: r.num("stamina"),
              size: r.num("size"),
              vesselVitae: kind === "kindred" ? r.num("vesselVitae") : undefined
            });
            if (plan.gained < 1) {
              const why = plan.room < 1 ? "the pool is already full"
                : plan.beneath && willpower < 1 ? "this blood is beneath their Blood Potency and there is no Willpower to force it down"
                : "the vessel has nothing to give";
              ui.notifications.warn(`${this.name} gains nothing: ${why}.`);
              return;
            }

            const update = { "system.vitae.value": vitae + plan.gained };
            if (plan.willpowerCost) update["system.willpower.value"] = willpower - plan.willpowerCost;
            await this.update(update);

            // The vessel pays, when there is one and this user may change it.
            let vesselButtons = "";
            const vesselHit = plan.vesselLethal || plan.vesselVitaeLoss;
            if (vessel && vesselHit) {
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

            const who = vessel?.name ?? "the vessel";
            await this._postKindredCard({
              title: "Feeding",
              lines: [
                `<strong>${this.name}</strong> takes <strong>${plural(plan.gained, "Vitae", "Vitae")}</strong> `
                  + `from ${Kindred.VESSELS[kind].label.toLowerCase()}. Vitae now ${vitae + plan.gained}.`,
                plan.willpowerCost ? `This blood is beneath their Blood Potency: ${plan.willpowerCost} Willpower spent.` : "",
                plan.vesselLethal ? `${who} takes ${plan.vesselLethal} lethal damage`
                  + `${plan.drained ? " and is left Drained (more Vitae than Stamina)" : ""}.` : "",
                plan.vesselVitaeLoss ? `${who} loses ${plural(plan.vesselVitaeLoss, "Vitae", "Vitae")}. `
                  + `Kindred Vitae is addictive and builds a blood bond.` : "",
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

  /**
   * The hunting roll (p. 96): any Attribute + Skill that fits the approach,
   * with the suggested modifiers. One Vitae adds a Discipline's dots, at the
   * price that any failure becomes a dramatic one.
   */
  async rollHunt() {
    const M = CONFIG.MTA;
    const groupOptions = (groups) => groups.map(([group, table]) => Object.entries(table).map(([key, label]) =>
      `<option value="${group}.${key}">${game.i18n.localize(label)}</option>`).join("")).join("");
    const attributes = groupOptions([["attributes_physical", M.attributes_physical],
      ["attributes_social", M.attributes_social], ["attributes_mental", M.attributes_mental]]);
    const skills = groupOptions([["skills_physical", M.skills_physical],
      ["skills_social", M.skills_social], ["skills_mental", M.skills_mental]]);
    const disciplines = Object.entries({ ...M.disciplines_common, ...M.disciplines_unique })
      .map(([key, label]) => ({ key, label: game.i18n.localize(label), dots: this.disciplineDots(key) }))
      .filter(d => d.dots > 0);
    const grounds = this.meritDots(/feeding grounds?/i);

    const body = `
      <p class="vtr-rite-summary">One roll covers an hour of hunting.</p>
      <dl>
        <dt>Attribute:</dt>
        <dd><select name="attribute">${attributes.replace('value="attributes_social.manipulation"',
          'value="attributes_social.manipulation" selected')}</select></dd>
        <dt>Skill:</dt>
        <dd><select name="skill">${skills.replace('value="skills_social.persuasion"',
          'value="skills_social.persuasion" selected')}</select></dd>
        <dt>Feeding Grounds dots:</dt>
        <dd><input type="number" name="grounds" value="${grounds}" min="0" max="5"></dd>
        ${M.huntingModifiers.filter(m => m.each).map(m => `
        <dt>${m.label} (${m.value > 0 ? "+" : "&minus;"}${Math.abs(m.value)} each):</dt>
        <dd><input type="number" name="hunt_${m.key}" value="0" min="0"></dd>`).join("")}
        <dt>A very specific vessel (&minus;2 to &minus;5):</dt>
        <dd><input type="number" name="specific" value="0" min="-5" max="0"></dd>
        <dt>Other modifier:</dt>
        <dd><input type="number" name="modifier" value="0"></dd>
        ${disciplines.length ? `
        <dt>Spend 1 Vitae to add a Discipline (failures become dramatic):</dt>
        <dd><select name="discipline"><option value="">None</option>${disciplines.map(d =>
          `<option value="${d.key}">${d.label} (+${d.dots})</option>`).join("")}</select></dd>` : ""}
      </dl>
      <div class="vtr-rite-checks">${M.huntingModifiers.filter(m => !m.each).map(m => `
        <label><input type="checkbox" name="hunt_${m.key}"> ${m.label}
          (${m.value > 0 ? "+" : "&minus;"}${Math.abs(m.value)})</label>`).join("")}
      </div>`;

    this._renderRiteDialog({
      title: `Hunt — ${this.name}`,
      variant: "streetwise",
      width: 520,
      body,
      onRoll: async (html) => {
        const r = reader(html);
        const picked = {};
        for (const m of M.huntingModifiers) picked[m.key] = m.each ? r.num(`hunt_${m.key}`) : r.on(`hunt_${m.key}`);
        const modifiers = Kindred.sumModifiers(M.huntingModifiers, picked)
          + atLeast0(r.num("grounds")) + Math.clamp(r.num("specific"), -5, 0) + r.num("modifier");

        const boost = disciplines.find(d => d.key === r.str("discipline"));
        if (boost && !(await this.spendVitae(1, { reason: `add ${boost.label} to the hunt` }))) return;

        const base = this.assembleDicePool({ traits: [r.str("attribute"), r.str("skill")] });
        const pool = base.dicePool + modifiers + (boost?.dots ?? 0);
        const rollReturn = {};
        await DiceRollerDialogue.rollToChat({
          dicePool: pool,
          flavor: `Hunting: ${base.flavor}${modifiers ? ` ${modifiers > 0 ? "+" : "-"} ${Math.abs(modifiers)}` : ""}`
            + (boost ? ` + ${boost.label} ${boost.dots}, 1 Vitae spent` : ""),
          title: "Hunting",
          actorOverride: this,
          hungerDice: 0,
          rollReturn
        });

        const roll = rollReturn.roll;
        const hits = Math.max(0, roll?.total ?? 0);
        if (hits < 1) {
          const dramatic = roll?.dramaticFailure || !!boost;
          return this._postKindredCard({
            tone: "messy-failure",
            title: dramatic ? "The hunt &mdash; Dramatic failure" : "The hunt &mdash; Failure",
            lines: [dramatic
              ? `Something goes badly wrong: a witness, a rival's claim, a vessel who is not what they seem.`
                + `${boost ? " The Discipline made it so; there is no Beat for this one." : ""} `
                + `Feeding may still be possible, but the scene has to be dealt with first.`
              : `The hour is wasted. The player may take a Beat to make this a dramatic failure instead.`]
          });
        }
        const exceptional = roll?.exceptionalSuccess || hits >= 5;
        return this._postKindredCard({
          title: exceptional ? "The hunt &mdash; Exceptional success" : "The hunt &mdash; Success",
          lines: [exceptional
            ? `A vessel is found, and feeding is safe. The Storyteller names three telling traits of the `
              + `vessel; once, later, the player may call on their involvement in a scene and take a Beat.`
            : `A suitable vessel is found, and feeding is relatively safe.`]
        });
      }
    });
  }

  /** Starting Vitae (p. 95): one die's face value plus Feeding Grounds, up to capacity. */
  async rollStartingVitae() {
    const roll = await new Roll("1d10").roll();
    const grounds = this.meritDots(/feeding grounds?/i);
    const maxVitae = atLeast0(this.system?.vitae?.max);
    const vitae = Kindred.startingVitae({ die: roll.total, feedingGrounds: grounds, maxVitae });
    await this.update({ "system.vitae.value": vitae });
    await this._postKindredCard({
      title: "Starting Vitae",
      lines: [`The die shows <strong>${roll.total}</strong>${grounds ? `, plus Feeding Grounds ${grounds}` : ""}`
        + `${roll.total + grounds > maxVitae ? `, held to the pool's capacity of ${maxVitae}` : ""}. `
        + `<strong>${this.name}</strong> begins with <strong>${vitae} Vitae</strong>.`]
    });
  }

  /** Draw the week's Vitae from the Herd: twice its dots, no roll (p. 111). */
  async drawOnHerd() {
    const herd = this.meritDots(/^herd\b/i);
    const vitae = atLeast0(this.system?.vitae?.value);
    const gained = Math.min(herd * 2, Math.max(0, atLeast0(this.system?.vitae?.max) - vitae));
    if (gained < 1) {
      ui.notifications.info(herd ? `${this.name} can hold no more Vitae.` : `${this.name} has no Herd.`);
      return;
    }
    await this.update({ "system.vitae.value": vitae + gained });
    await this._postKindredCard({
      title: "The Herd",
      lines: [`<strong>${this.name}</strong> draws <strong>${plural(gained, "Vitae", "Vitae")}</strong> from the Herd `
        + `(up to ${herd * 2} a week). Vitae now ${vitae + gained}.`,
        `<em>The system does not count the week; the Storyteller does.</em>`]
    });
  }

  /** A Taste of Blood (p. 91): Wits + Composure, with the suggested modifiers. */
  async rollTasteOfBlood() {
    const M = CONFIG.MTA;
    const body = `
      <p class="vtr-rite-summary">Wits + Composure</p>
      <div class="vtr-rite-checks">${M.tasteOfBloodModifiers.map(m => `
        <label><input type="checkbox" name="taste_${m.key}"> ${m.label}
          (${m.value > 0 ? "+" : "&minus;"}${Math.abs(m.value)})</label>`).join("")}
      </div>
      <dl>
        <dt>Other modifier:</dt>
        <dd><input type="number" name="modifier" value="0"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: `A Taste of Blood — ${this.name}`,
      variant: "wits",
      body,
      onRoll: async (html) => {
        const r = reader(html);
        const picked = {};
        for (const m of M.tasteOfBloodModifiers) picked[m.key] = r.on(`taste_${m.key}`);
        const modifiers = Kindred.sumModifiers(M.tasteOfBloodModifiers, picked) + r.num("modifier");
        const base = this.assembleDicePool({ traits: ["attributes_mental.wits", "attributes_social.composure"] });
        const rollReturn = {};
        await DiceRollerDialogue.rollToChat({
          dicePool: base.dicePool + modifiers,
          flavor: `A Taste of Blood: ${base.flavor}${modifiers ? ` ${modifiers > 0 ? "+" : "-"} ${Math.abs(modifiers)}` : ""}`,
          title: "A Taste of Blood",
          actorOverride: this,
          hungerDice: 0,
          rollReturn
        });
        const roll = rollReturn.roll;
        const hits = Math.max(0, roll?.total ?? 0);
        if (roll?.dramaticFailure) {
          return this._postKindredCard({ tone: "messy-failure", title: "A Taste of Blood &mdash; Dramatic failure",
            lines: ["The Storyteller offers two true things about the blood, and one dangerous lie."] });
        }
        if (hits < 1) {
          return this._postKindredCard({ tone: "messy-failure", title: "A Taste of Blood &mdash; Failure",
            lines: ["The blood says nothing."] });
        }
        const exceptional = roll?.exceptionalSuccess || hits >= 5;
        return this._postKindredCard({
          title: exceptional ? "A Taste of Blood &mdash; Exceptional success" : "A Taste of Blood &mdash; Success",
          lines: [exceptional
            ? "Fine detail: whether it is a ghoul's blood and of which clan, infections, a recent meal, hormones, "
              + "some causes of death, and more at the Storyteller's discretion."
            : "The basics: blood type, clan, common drugs, how long it has been out of the body, disease and poison, "
              + "whether this donor has been tasted before, whether it is human, and how many steps of blood "
              + "sympathy separate the donor from another already tasted."]
        });
      }
    });
  }
};
