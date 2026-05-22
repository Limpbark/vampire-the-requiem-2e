export class DiceRollerDialogue extends Application {
  constructor({ dicePool = 0,
    targetNumber = 8,
    extended = false,
    target_successes = 0,
    penalty = 0,
    flavor = "Skill Check",
    title = "Skill Check",
    blindGMRoll = false,
    actorOverride,
    damageRoll = false,
    weaponDamage = 0,
    armorPiercing = 0,
    itemName = "",
    itemImg = "",
    itemRef = undefined,
    itemDescr = "",
    spendAmmo = false,
    advancedAction = false,
    macro,
    actor,
    comment = "",
    target,
    ignoreArmor = false,
    ignoreBallistic = true,
    noSuccessesToDamage = false,
    defense = 0,
    applyDefense = false,
    ballistic = 0,
    armor = 0,
    exceptionalTarget = 5,
    specialties = [],
    damageType = "lethal",
    attribute = null,
    skill = null,
  }, ...args) {
    super(...args);
    this.targetNumber = +targetNumber;
    this.dicePool = +dicePool;
    this.penalty = penalty;
    this.flavor = flavor;
    this.blindGMRoll = blindGMRoll;
    this.options.title = title;
    this.actorOverride = actorOverride;
    this.damageRoll = damageRoll;
    this.weaponDamage = weaponDamage;
    this.armorPiercing = armorPiercing;
    this.itemName = itemName;
    this.itemImg = itemImg;
    this.itemRef = itemRef;
    this.itemDescr = itemDescr;
    this.spendAmmo = spendAmmo;
    this.accumulatedSuccesses = 0;
    this.extendedRolls = 0;
    this.extended = extended;
    this.advancedAction = advancedAction;
    this.macro = macro;
    this.actor = actor;
    this.comment = comment;
    this.target = target;
    this.ignoreArmor = ignoreArmor;
    this.ignoreBallistic = ignoreBallistic;
    this.noSuccessesToDamage = noSuccessesToDamage;
    this.defense = defense;
    this.applyDefense = applyDefense;
    this.ballistic = ballistic;
    this.armor = armor;
    this.exceptionalTarget = exceptionalTarget;
    this.specialties = specialties;
    this.damageType = damageType;
    this.attribute = attribute;
    this.skill = skill;
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["worldbuilding", "dialogue", "mta-sheet"],
      template: "systems/vampire-the-requiem-2e/templates/dialogues/dialogue-diceRoller.html",
      resizable: true
    });
  }

  getData() {
    const data = super.getData();
    data.targetNumber = this.targetNumber;
    data.dicePool = this.dicePool;
    data.bonusDice = 0;
    data.spendAmmo = this.spendAmmo;
    data.ammoPerShot = 1;
    data.penalty = this.penalty;
    data.extended = this.extended;
    data.advancedAction = this.advancedAction;
    data.ignoreArmor = this.ignoreArmor;
    data.ignoreBallistic = this.ignoreBallistic;
    data.noSuccessesToDamage = this.noSuccessesToDamage;
    data.damageRoll = this.damageRoll;
    data.applyDefense = this.applyDefense;
    data.defense = this.defense;
    data.armor = this.armor;
    data.ballistic = this.ballistic;
    data.exceptionalTarget = this.exceptionalTarget;
    data.specialties = this.specialties.length ? this.specialties : null;
    data.damageType = this.damageType;
    data.config = CONFIG.MTA;

    if (game.settings.get("vampire-the-requiem-2e", "showRollDifficulty")) data.enableDifficulty = true;

    // Hunger dice (homebrew) — Vampires and Ghouls only.
    const hungerActor = this.actorOverride;
    data.hasHunger = !!(hungerActor && hungerActor.system?.characterType === "vampire"
      && game.settings.get("vampire-the-requiem-2e", "hungerDice"));
    data.vitae = hungerActor?.system?.vitae?.value ?? 0;

    // Dice-roller window background: prefer the Attribute texture; if the
    // pool has no Attribute, fall back to the Skill texture; if neither is
    // present (item-only / damage / generic rolls) pick a random neutral.
    const KNOWN_ATTRS = [
      "strength", "dexterity", "stamina",
      "presence", "manipulation", "composure",
      "intelligence", "wits", "resolve"
    ];
    // Skills that have a dice_bg_<skill>.png in ui/. "brawl" is intentionally
    // absent — there's no texture for it yet, so Brawl rolls go neutral.
    const KNOWN_SKILLS = [
      "athletics", "drive", "firearms", "larceny", "stealth", "survival", "weaponry",
      "animal_ken", "empathy", "expression", "intimidation", "persuasion",
      "socialize", "streetwise", "subterfuge",
      "academics", "computer", "crafts", "investigation", "medicine",
      "occult", "politics", "science"
    ];
    // Skill keys are camelCase in the data model (e.g. "animalKen"); the
    // texture filenames are snake_case (dice_bg_animal_ken.png).
    const toSlug = (s) => String(s ?? "")
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .toLowerCase();
    const NEUTRAL_COUNT = 4; // ui/dice_bg_neutral_1.png … _4.png

    const attrSlug = toSlug(this.attribute);
    const skillSlug = toSlug(this.skill);
    let bgName;
    if (attrSlug && KNOWN_ATTRS.includes(attrSlug)) {
      bgName = `dice_bg_${attrSlug}`;
      data.attribute = attrSlug;
    } else if (skillSlug && KNOWN_SKILLS.includes(skillSlug)) {
      bgName = `dice_bg_${skillSlug}`;
      data.attribute = skillSlug;
    } else {
      const pick = 1 + Math.floor(Math.random() * NEUTRAL_COUNT);
      bgName = `dice_bg_neutral_${pick}`;
      data.attribute = "neutral";
    }
    data.diceBgUrl = `systems/vampire-the-requiem-2e/ui/${bgName}.png`;

    // Initial dice visual counts. The live updater in activateListeners
    // recomputes these whenever the pool / bonuses / Willpower change.
    const initialPool = Math.max(0, this.dicePool);
    const initialHunger = data.hasHunger ? Math.max(0, this.dicePool - data.vitae) : 0;
    data.initialNormalDice = Math.max(0, initialPool - initialHunger);
    data.initialHungerDice = initialHunger;

    return data;
  }

  _fetchInputs(html) {
    const dicePool_userMod_input = html.find('[name="dicePoolBonus"]');
    const dicePool_difficulty_input = html.find('[name="dicePoolDifficulty"]');
    const ammoPerShot_input = html.find('[name="ammoPerShot"]');

    let dicePool_userMod = dicePool_userMod_input.length ? +dicePool_userMod_input[0].value : 0;
    let explode_threshold = Math.max(0, +($('input[name=explodeThreshold]:checked').val()));
    let rote_action = $('input[name=rote_action]').prop("checked");
    let advancedAction = $('input[name=advancedAction]').prop("checked");
    let extended = $('input[name=extended]').prop("checked");

    let dicePool_difficulty
    if (game.settings.get("vampire-the-requiem-2e", "showRollDifficulty")) dicePool_difficulty = dicePool_difficulty_input.length ? +dicePool_difficulty_input[0].value : 0;
    else dicePool_difficulty = 8;

    let ammoPerShot = ammoPerShot_input.length ? +ammoPerShot_input[0].value : 0;
    let ignoreArmor = $('input[name=ignoreArmor]').prop("checked");
    let ignoreBallistic = $('input[name=ignoreBallistic]').prop("checked");
    let noSuccessesToDamage = $('input[name=noSuccessesToDamage]').prop("checked");
    let applyDefense = $('input[name=applyDefense]').prop("checked");
    let damageType = $('select[name=damageType]').val();
    let willpower = $('input[name=willpower]').prop("checked");

    // Fetch all specialties
    let specialties = [];
    html.find('input[name^="specialty_"]').each(function () {
      if ($(this).prop("checked")) {
        specialties.push(this.name.replace('specialty_', ''));
      }
    });

    return { dicePool_userMod, explode_threshold, rote_action, dicePool_difficulty, ammoPerShot, advancedAction, extended, ignoreArmor, ignoreBallistic, noSuccessesToDamage, applyDefense, specialties, damageType, willpower };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.niceNumber').click(function (event) {
      let v = $(event.target).text();
      let inputs = $(this).find('input');
      let i;

      if (inputs.length === 2) {
        i = $(this).find('.theNumber input');
      } else {
        // fallback: single input
        i = inputs.first();
      }

      if (v === '+') {
        i.val(parseInt(i.val()) + 1);
      } else if (v === '−') {
        i.val(parseInt(i.val()) - 1);
      }

      i.trigger('change');
    });

    html.find('.niceNumberDouble').click(function (event) {
      let v = $(event.target).text();
      let i = $(this).find('.theNumber input');

      if (v === '+') {
        i.val(parseInt(i.val()) + 1);
      } else if (v === '−') {
        i.val(parseInt(i.val()) - 1);
      }

      i.trigger('change');
    });
    html.find('.roll-execute').click(ev => this._executeRoll(html, ev));

    // Live Hunger dice preview for Vampires/Ghouls: updates as the pool changes.
    const isHungerVamp = this.actorOverride?.system?.characterType === "vampire"
      && game.settings.get("vampire-the-requiem-2e", "hungerDice");
    if (isHungerVamp) {
      const vitae = this.actorOverride.system?.vitae?.value ?? 0;
      const base = this.dicePool;
      const updateHunger = () => {
        const raw = String(html.find('[name="dicePoolBonus"]').val() ?? "0").replace(/[^-\d]/g, "");
        const bonus = (raw === "" || raw === "-") ? 0 : parseInt(raw, 10);
        let specialties = 0;
        html.find('input[name^="specialty_"]').each(function () { if ($(this).prop("checked")) specialties++; });
        const realPool = base + bonus + specialties;
        html.find('.hunger-readout').text(Math.max(0, realPool - vitae));
      };
      html.find('[name="dicePoolBonus"]').on("change", updateHunger);
      html.find('input[name^="specialty_"]').on("change", updateHunger);
      updateHunger();
    }

    // Live dice-pool visualiser: renders one d10 icon per die in the pool,
    // with Hunger dice (if any) rendered as red d10s. Reacts to the pool
    // bonus input, specialty toggles, and the Willpower (+3) toggle.
    const container = html.find('.dice-pool-visual');
    if (container.length) {
      const base = this.dicePool;
      const vitae = this.actorOverride?.system?.vitae?.value ?? 0;
      const updateVisual = () => {
        const raw = String(html.find('[name="dicePoolBonus"]').val() ?? "0").replace(/[^-\d]/g, "");
        const bonus = (raw === "" || raw === "-") ? 0 : parseInt(raw, 10);
        let specialties = 0;
        html.find('input[name^="specialty_"]').each(function () { if ($(this).prop("checked")) specialties++; });
        const wpBonus = html.find('input[name="willpower"]').is(":checked") ? 3 : 0;
        const prePool = Math.max(0, base + bonus + specialties);
        const totalPool = Math.max(0, prePool + wpBonus);
        // Hunger dice apply to the pre-Willpower pool only; Willpower dice
        // always count as normal (white).
        const hunger = isHungerVamp ? Math.max(0, prePool - vitae) : 0;
        const normal = Math.max(0, totalPool - hunger);
        const pieces = [];
        for (let i = 0; i < normal; i++) {
          pieces.push('<img class="dpv-die" src="systems/vampire-the-requiem-2e/icons/gui/d10_white.png" alt="">');
        }
        for (let i = 0; i < hunger; i++) {
          pieces.push('<img class="dpv-die hunger" src="systems/vampire-the-requiem-2e/icons/gui/d10_red_hunger.png" alt="">');
        }
        container.html(pieces.join(""));
      };
      html.find('[name="dicePoolBonus"]').on("change input", updateVisual);
      html.find('input[name^="specialty_"]').on("change", updateVisual);
      html.find('input[name="willpower"]').on("change", updateVisual);
      updateVisual();
    }
  }

  async _executeRoll(html, ev) {
    const modifiers = this._fetchInputs(html);
    modifiers.dicePool_userMod += modifiers.specialties.length;
    const realPool = this.dicePool + modifiers.dicePool_userMod;
    const defenseAdj = (this.damageRoll && modifiers.applyDefense) ? this.defense : 0;
    const willpowerBonus = modifiers.willpower ? 3 : 0;
    const hungerDice = DiceRollerDialogue._hungerDiceCount(this.actorOverride, realPool - defenseAdj);
    const dicePool = realPool + willpowerBonus;
    const roteAction = modifiers.rote_action;
    let flavor = (this.flavor || "Skill Check")
      + (modifiers.dicePool_userMod > 0 ? " + " + modifiers.dicePool_userMod : modifiers.dicePool_userMod < 0 ? " - " + -modifiers.dicePool_userMod : "");
    for (const specialty of modifiers.specialties) {
      flavor += ` [${specialty}]`;
    }
    if (willpowerBonus) flavor += " [Willpower]";
    const explodeThreshold = modifiers.explode_threshold;
    const targetNumber = Math.clamp(modifiers.dicePool_difficulty, 1, 10);
    const rollReturn = {};
    if (this.damageRoll) await DiceRollerDialogue.rollWithDamage({ dicePool: dicePool, targetNumber: targetNumber, rollReturn: rollReturn, tenAgain: explodeThreshold === 10, nineAgain: explodeThreshold === 9, eightAgain: explodeThreshold === 8, roteAction: roteAction, flavor: flavor, blindGMRoll: this.blindGMRoll, actorOverride: this.actorOverride, weaponDamage: this.weaponDamage, armorPiercing: this.armorPiercing, itemImg: this.itemImg, itemName: this.itemName, itemRef: this.itemRef, itemDescr: this.itemDescr, spendAmmo: this.spendAmmo, ammoPerShot: modifiers.ammoPerShot, advancedAction: modifiers.advancedAction, comment: this.comment, target: this.target, ignoreArmor: modifiers.ignoreArmor, ignoreBallistic: modifiers.ignoreBallistic, noSuccessesToDamage: modifiers.noSuccessesToDamage, applyDefense: modifiers.applyDefense, defense: this.defense, ballistic: this.ballistic, armor: this.armor, exceptionalTarget: this.exceptionalTarget, damageType: modifiers.damageType, hungerDice: hungerDice });
    else await DiceRollerDialogue.rollToChat({ dicePool: dicePool, targetNumber: targetNumber, extended: modifiers.extended, extended_accumulatedSuccesses: this.accumulatedSuccesses, extended_rolls: this.extendedRolls, extended_rollsMax: this.dicePool, rollReturn: rollReturn, tenAgain: explodeThreshold === 10, nineAgain: explodeThreshold === 9, eightAgain: explodeThreshold === 8, roteAction: roteAction, flavor: flavor, blindGMRoll: this.blindGMRoll, actorOverride: this.actorOverride, advancedAction: modifiers.advancedAction, comment: this.comment, exceptionalTarget: this.exceptionalTarget, hungerDice: hungerDice });

    if (modifiers.extended) {
      let successes = rollReturn.roll.total;
      if (successes > 0) this.accumulatedSuccesses += successes;
      this.extendedRolls++;
    }

    if (this.actor) await this.actor.setFlag('vampire-the-requiem-2e', 'rollReturn', rollReturn.roll);

    if (this.macro && this.actor) {
      this.macro.execute({ actor: this.actor, token: this.actor.token ?? this.actor.getActiveTokens[0], item: this.itemRef });
    }
  }

  /**
   * Number of Hunger dice (homebrew) for a given pre-Willpower dice pool:
   * the amount by which the pool exceeds the actor's current Vitae.
   * Returns 0 for non-Vampires/Ghouls or when the homebrew rule is disabled.
   */
  static _hungerDiceCount(actor, realPool) {
    if (!actor || !game.settings.get("vampire-the-requiem-2e", "hungerDice")) return 0;
    if (actor.system?.characterType !== "vampire") return 0;
    const vitae = actor.system?.vitae?.value ?? 0;
    return Math.max(0, Math.floor(realPool) - vitae);
  }

  static async _roll({ dicePool = 1, targetNumber = 8, tenAgain = true, nineAgain = false, eightAgain = false, roteAction = false, chanceDie = false, exceptionalTarget = 5, advancedAction = false, hungerDice = 0 }) {
    //Create dice pool qualities
    const roteActionString = roteAction ? "r<8" : "";
    const explodeString = eightAgain ? "x>=8" : nineAgain ? "x>=9" : tenAgain ? "x>=10" : "";
    const targetNumString = chanceDie ? "cs>=10" : "cs>=" + targetNumber;
    const dieString = "d10" + roteActionString + explodeString + targetNumString;

    // Hunger dice (homebrew): roll the Hunger dice as a separate term so the
    // Beast's interference (10s and 1s on those dice) can be detected.
    hungerDice = Math.clamp(hungerDice, 0, dicePool);
    const normalDice = dicePool - hungerDice;
    let formula, hungerTermIndex = -1;
    if (hungerDice <= 0) {
      formula = dicePool + dieString;
    } else if (normalDice <= 0) {
      formula = hungerDice + dieString;
      hungerTermIndex = 0;
    } else {
      formula = normalDice + dieString + " + " + hungerDice + dieString;
      hungerTermIndex = 1;
    }

    let roll = new Roll(formula);
    roll = await roll.roll();
    roll.hungerDiceCount = hungerDice;
    roll.hungerTermIndex = hungerTermIndex;

    if (chanceDie && roteAction && roll.terms[0].results[0].result === 1) {
      //Chance dice don't reroll 1s with Rote quality
      roll.terms[0].results.splice(1);
    }
    if (game.settings.get("vampire-the-requiem-2e", "easierDramaticFailures") && roll.total <= 0 && roll.terms[0].results[0].result === 1) roll.dramaticFailure = true;
    else if (chanceDie && roll.terms[0].results[0].result === 1) roll.dramaticFailure = true;
    if (roll.total >= exceptionalTarget) roll.exceptionalSuccess = true;
    else roll.exceptionalSuccess = false;

    // Messy success (a 10 on a Hunger die) / messy failure (a 1 on a Hunger
    // die when the overall roll fails).
    roll.messySuccess = false;
    roll.messyFailure = false;
    if (hungerTermIndex >= 0 && roll.dice[hungerTermIndex]) {
      // Tag the Hunger term so Dice So Nice renders it in the crimson colourset.
      roll.dice[hungerTermIndex].options.appearance = { colorset: "vtr-hunger" };
      for (const r of roll.dice[hungerTermIndex].results) {
        if (r.active === false) continue;
        if (r.result === 10) roll.messySuccess = true;
        else if (r.result === 1) roll.messyFailure = true;
      }
      if (roll.total > 0) roll.messyFailure = false;
      else roll.messySuccess = false;
    }

    if (advancedAction) {
      const roll2 = await DiceRollerDialogue._roll({ dicePool: dicePool, targetNumber: targetNumber, tenAgain: tenAgain, nineAgain: nineAgain, eightAgain: eightAgain, roteAction: roteAction, chanceDie: chanceDie, exceptionalTarget: exceptionalTarget, advancedAction: false, hungerDice: hungerDice });
      if (roll2.total > roll.total) {
        roll2.advancedRoll = roll;
        roll = roll2;
      }
      else {
        roll.advancedRoll = roll2;
      }
    }
    return roll;
  }


  static async rollToHtml({ dicePool = 1, targetNumber = 8, extended = false, extended_accumulatedSuccesses = 0, extended_rolls = 0, extended_rollsMax = 0, tenAgain = true, nineAgain = false, eightAgain = false, roteAction = false, flavor = "Skill Check", showFlavor = true, exceptionalTarget = 5, blindGMRoll = false, rollReturn, advancedAction = false, comment = "", hungerDice = 0, actorId = null }) {
    //Is the roll a chance die?
    let chanceDie = false;
    if (dicePool < 1) {
      tenAgain = false;
      chanceDie = true;
      dicePool = 1;
      hungerDice = 0;
    }

    let roll = await DiceRollerDialogue._roll({ dicePool: dicePool, targetNumber: targetNumber, tenAgain: tenAgain, nineAgain: nineAgain, eightAgain: eightAgain, roteAction: roteAction, chanceDie: chanceDie, exceptionalTarget: exceptionalTarget, advancedAction, hungerDice: hungerDice });
    if (rollReturn) rollReturn.roll = roll;
    //Create Roll Message
    let speaker = ChatMessage.getSpeaker();

    if (chanceDie) flavor += " [Chance die]";
    if (roteAction) flavor += " [Rote quality]";
    if (eightAgain) flavor += " [8-again]";
    else if (nineAgain) flavor += " [9-again]";
    else if (tenAgain) flavor += " [10-again]";
    if (!showFlavor) flavor = undefined;

    let chatData = {
      user: game.user.id,
      speaker: speaker,
      flavor: flavor
    };
    let rollMode = blindGMRoll ? "blindroll" : game.settings.get("core", "rollMode");
    chatData = ChatMessage.applyRollMode(chatData, rollMode);

    extended_accumulatedSuccesses += Math.max(0, roll.total);
    extended_rolls++;


    let html = await roll.render(chatData);

    // Build a full-sentence result from the success count.
    const hits = Math.max(0, roll.total);
    const hitWord = hits === 1 ? "hit" : "hits";
    let resultText, resultClass = "";
    if (roll.dramaticFailure) {
      resultClass = "dramaticFailure";
      resultText = chanceDie ? "1 on chance die - Dramatic failure!" : `${hits} ${hitWord} - Dramatic failure!`;
    } else if (roll.exceptionalSuccess) {
      resultClass = "exceptionalSuccess";
      resultText = `${hits} ${hitWord} - Exceptional success!`;
    } else if (hits >= 1) {
      resultText = `${hits} ${hitWord} - Success.`;
    } else {
      resultText = "0 hits - Failure.";
    }

    // Reorganise the card (dice graphic first, formula behind a click), restate
    // the result as a sentence, and surface Hunger dice and messy outcomes.
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    const diceRoll = wrap.querySelector(".dice-roll");
    if (diceRoll) {
      diceRoll.classList.add("vtr-roll");
      if (roll.hungerTermIndex >= 0) {
        const parts = wrap.querySelectorAll(".dice-tooltip .tooltip-part");
        const hungerPart = parts[roll.hungerTermIndex];
        if (hungerPart) {
          hungerPart.classList.add("hunger-part");
          hungerPart.querySelectorAll(".dice-rolls .die").forEach(d => d.classList.add("hunger-die"));
        }
      }
      const total = wrap.querySelector(".dice-total");
      if (total) {
        total.textContent = resultText;
        if (resultClass) total.classList.add(resultClass);
      }
      if (roll.messySuccess || roll.messyFailure) {
        const notice = document.createElement("div");
        if (roll.messySuccess) {
          notice.className = "hunger-messy messy-success";
          notice.innerHTML = `<span class="hunger-messy-title">Messy success</span>`
            + `<span class="hunger-messy-text">The Beast shows through &mdash; the Storyteller assigns a Condition.</span>`;
        } else {
          notice.className = "hunger-messy messy-failure";
          notice.innerHTML = `<span class="hunger-messy-title">Messy failure</span>`
            + `<span class="hunger-messy-text">The Beast is loose on a failed roll.</span>`
            + (actorId ? `<button type="button" class="vtr-frenzy-button" data-vtr-frenzy data-actor-id="${actorId}">Roll Frenzy Resistance</button>` : "");
        }
        diceRoll.appendChild(notice);
      }
      html = wrap.innerHTML;
    }

    if (roll.advancedRoll) {
      let advHtml = await roll.advancedRoll.render(chatData);
      advHtml = advHtml.replace('class="dice-roll"', 'class="dice-roll vtr-roll advancedRoll"');
      html += advHtml;
    }

    if (extended) html += `<div class="roll-extended">
      <div class="roll-extended-header">Extended roll</div>
      <div>${extended_accumulatedSuccesses} successes</div>
      <div>${extended_rolls} / ${extended_rollsMax} rolls</div>
    </div>`;

    if (comment) html += `<div class="comment">${comment.replaceAll('\n', '<br>')}</div>`;

    return html;
  }


  static async rollToChat({
    dicePool = 1,
    targetNumber = 8,
    extended = false,
    extended_accumulatedSuccesses = 0,
    extended_rolls = 0,
    extended_rollsMax = 0,
    tenAgain = true,
    nineAgain = false,
    eightAgain = false,
    roteAction = false,
    exceptionalTarget = 5,
    flavor = "Skill Check",
    blindGMRoll = false,
    actorOverride,
    rollReturn = {},
    advancedAction = false,
    comment = "",
    macro,
    actor,
    hungerDice
  }) {

    // Quick rolls don't pass a Hunger count; derive it from the actor's Vitae.
    if (hungerDice === undefined) hungerDice = DiceRollerDialogue._hungerDiceCount(actorOverride, dicePool);

    const templateData = {
      roll: await DiceRollerDialogue.rollToHtml({
        dicePool: dicePool,
        targetNumber: targetNumber,
        tenAgain: tenAgain,
        nineAgain: nineAgain,
        eightAgain: eightAgain,
        roteAction: roteAction,
        exceptionalTarget: exceptionalTarget,
        showFlavor: false,
        blindGMRoll: blindGMRoll,
        rollReturn: rollReturn,
        extended: extended,
        extended_accumulatedSuccesses: extended_accumulatedSuccesses,
        extended_rolls: extended_rolls,
        extended_rollsMax: extended_rollsMax,
        advancedAction,
        comment,
        hungerDice: hungerDice,
        actorId: actorOverride?.id
      })
    };

    //Create Roll Message
    let rollMode = blindGMRoll ? "blindroll" : game.settings.get("core", "rollMode");
    let speaker = actorOverride ? ChatMessage.getSpeaker({ actor: actorOverride }) : ChatMessage.getSpeaker();

    // Render the chat card template
    const template = `systems/vampire-the-requiem-2e/templates/chat/roll-template.html`;
    const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Basic chat message data
    let chatData = {
      user: game.user.id,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      content: html,
      speaker: speaker,
      flavor: flavor,
      sound: CONFIG.sounds.dice,
      roll: rollReturn.roll,
      rolls: [rollReturn.roll],
      rollMode: rollMode
    };

    // Toggle default roll mode
    /* if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");*/
    //if ( rollMode === "blindroll" ) chatData["blind"] = true; 
    chatData = ChatMessage.applyRollMode(chatData, rollMode);

    const msg = await ChatMessage.create(chatData);
    if (actor) await actor.setFlag('vampire-the-requiem-2e', 'rollReturn', rollReturn.roll);

    if (macro && actor) {
      macro.execute({ actor, token: actor.token ?? actor.getActiveTokens[0], item: this.itemRef });
    }

    // Create the chat message
    return msg;
  }


  /**
   * @param {Object} param0 
   * @param {number} [param0.dicePool=1] 
   * @param {number} [param0.targetNumber=8] 
   * @param {boolean} [param0.tenAgain=true] 
   * @param {boolean} [param0.nineAgain=false] 
   * @param {boolean} [param0.eightAgain=false] 
   * @param {boolean} [param0.roteAction=false] 
   * @param {number} [param0.exceptionalTarget=5] 
   * @param {string} [param0.flavor="Attack"] 
   * @param {boolean} [param0.blindGMRoll=false] 
   * @param {*} param0.actorOverride 
   * @param {string} [param0.itemImg=""] 
   * @param {string} [param0.itemName=""] 
   * @param {string} [param0.itemDescr=""] 
   * @param {number} [param0.weaponDamage=0] 
   * @param {number} [param0.armorPiercing=0] 
   * @param {*} [param0.itemRef=undefined] 
   * @param {boolean} [param0.spendAmmo=false] 
   * @param {number} [param0.ammoPerShot=0] 
   * @param {boolean} [param0.advancedAction=false] 
   * @param {{}} [param0.rollReturn={}] 
   * @param {string} [param0.comment=""] 
   * @param {*} param0.target 
   * @param {boolean} [param0.ignoreArmor=false] 
   * @param {boolean} [param0.ignoreBallistic=true] 
   * @param {boolean} [param0.noSuccessesToDamage=false] 
   * @param {number} [param0.ballistic=0] 
   * @param {number} [param0.armor=0] 
   * @param {boolean} [param0.applyDefense=false] 
   * @param {number} [param0.defense=0] 
   * @param {*} param0.macro 
   * @param {*} param0.actor 
   * @param {"lethal" | "bashing" | "aggravated"} [param0.damageType="lethal"] 
   */
  static async rollWithDamage({
    dicePool = 1,
    targetNumber = 8,
    tenAgain = true,
    nineAgain = false,
    eightAgain = false,
    roteAction = false,
    exceptionalTarget = 5,
    flavor = "Attack",
    blindGMRoll = false,
    actorOverride,
    itemImg = "",
    itemName = "",
    itemDescr = "",
    weaponDamage = 0,
    armorPiercing = 0,
    itemRef = undefined, // for reloading of firearms
    spendAmmo = false,
    ammoPerShot = 0,
    advancedAction = false,
    rollReturn = {},
    comment = "",
    target,
    ignoreArmor = false,
    ignoreBallistic = true,
    noSuccessesToDamage = false,
    ballistic = 0,
    armor = 0,
    applyDefense = false,
    defense = 0,
    macro,
    actor,
    damageType = "lethal",
    hungerDice
  }) {
    if (applyDefense) dicePool -= defense;

    // Derive the Hunger count from the actor's Vitae if it wasn't supplied.
    if (hungerDice === undefined) hungerDice = DiceRollerDialogue._hungerDiceCount(actorOverride, dicePool);

    const templateData = {
      data: {
        description: itemDescr,
        rolls: [{
          title: game.i18n.localize('MTA.HitRoll'),
          html: await DiceRollerDialogue.rollToHtml({
            dicePool: dicePool,
            targetNumber: targetNumber,
            tenAgain: tenAgain,
            nineAgain: nineAgain,
            eightAgain: eightAgain,
            roteAction: roteAction,
            exceptionalTarget: exceptionalTarget,
            showFlavor: false,
            blindGMRoll: blindGMRoll,
            rollReturn: rollReturn,
            advancedAction,
            comment,
            hungerDice: hungerDice,
            actorId: actorOverride?.id
          })
        }],
      },
      item: {
        img: itemImg,
        name: itemName
      }
    };

    // Calculate damage
    let damageInflicted = noSuccessesToDamage ? weaponDamage : rollReturn.roll.total + weaponDamage;
    if (rollReturn.roll.total <= 0) damageInflicted = 0; // Miss

    let bashingDamageInflicted = 0;

    // Calculate armor-piercing (subtracted from ballistic first)
    const ballisticAdj = Math.max(0, ballistic - armorPiercing);
    const armorAdj = ignoreBallistic ? Math.max(0, armor - armorPiercing)
      : (armorPiercing > ballistic ?
        Math.max(0, armor - (armorPiercing - ballistic)) :
        armor);

    if (!ignoreArmor) {
      damageInflicted = Math.max(0, damageInflicted - armorAdj);
    }

    if (!ignoreBallistic) {
      bashingDamageInflicted = Math.min(ballisticAdj, damageInflicted);
      if (bashingDamageInflicted) damageInflicted = Math.max(0, damageInflicted - bashingDamageInflicted);
    }

    // minimum damage
    if (damageInflicted <= 0) bashingDamageInflicted = Math.max(1, bashingDamageInflicted);

    // Apply damage type: lethal is default, bashing is converted, and aggravated is a flag
    if (damageType === "bashing") {
      bashingDamageInflicted += damageInflicted;
      damageInflicted = 0;
    }

    templateData.data.summary = rollReturn.roll.total ?
      (damageInflicted ? damageInflicted + ` ${damageType === "aggravated" ? game.i18n.localize('MTA.Aggravated') : game.i18n.localize('MTA.Lethal')} ` : "")
      + (bashingDamageInflicted ? bashingDamageInflicted + ` ${game.i18n.localize('MTA.Bashing')}` : "")
      : game.i18n.localize('MTA.AttackMissed');

    //game.i18n.localize('MTA.DamageInflicted') 

    if (armorPiercing && rollReturn.roll.total) templateData.data.summary += " (" + armorPiercing + " AP)";
    if (spendAmmo) templateData.data.summaryAddendum = ammoPerShot + " " + game.i18n.localize('MTA.AmmoSpent');
    if (rollReturn.roll.total) {
      templateData.data.showDamageButton = true;
      templateData.data.damageInflicted = damageInflicted;
      templateData.data.bashingDamageInflicted = bashingDamageInflicted;
      templateData.data.damageIsAggravated = damageType === "aggravated";
      const tokenObj = target?.object ? target?.object : target;

      templateData.data.damageTargetId = target?.actor?.id;

      templateData.data.damageTokenId = tokenObj ? (tokenObj.scene ? `${tokenObj.scene.id}.${tokenObj.id}` : `${tokenObj.id}`) : null;
    }

    if (spendAmmo && ammoPerShot) {
      if (itemRef) {
        if (!itemRef.system.magazine) {
          ui.notifications.error(`No magazine inside the weapon!`);
          return;
        }
        let ammo = itemRef.system.magazine.system.quantity;
        ammo -= ammoPerShot;
        if (ammo < 0) {
          ui.notifications.error(`Not enough ammo available inside the weapon to shoot!`);
          return;
        } else {
          itemRef.update({
            _id: itemRef.id,
            'system.magazine.system.quantity': ammo
          });
        }
      } else {
        ui.notifications.warn(`No weapon reference was given (no ammo subtracted).`);
      }
    }

    //Create Roll Message
    let rollMode = blindGMRoll ? "blindroll" : game.settings.get("core", "rollMode");
    let speaker = actorOverride ? ChatMessage.getSpeaker({ actor: actorOverride }) : ChatMessage.getSpeaker();

    // Render the chat card template
    const template = `systems/vampire-the-requiem-2e/templates/chat/item-card.html`;
    const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Basic chat message data
    let chatData = {
      user: game.user.id,
      //type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      content: html,
      speaker: speaker,
      flavor: flavor,
      sound: CONFIG.sounds.dice,
      roll: rollReturn.roll,
      rolls: [rollReturn.roll],
      rollMode: rollMode,
      /*       system: {
              targetId: templateData.data.damageTokenId,
              isAttack: true,
              actor: actor?.id
            } */
    };

    chatData = ChatMessage.applyRollMode(chatData, rollMode);
    const msg = await ChatMessage.create(chatData);

    if (actor) await actor.setFlag('vampire-the-requiem-2e', 'rollReturn', rollReturn.roll);

    if (macro && actor) {
      macro.execute({ actor, token: actor.token ?? actor.getActiveTokens[0], item: this.itemRef });
    }
    // Create the chat message
    return msg;
  }
}