import {
  DiceRollerDialogue
} from "./dialogue-diceRoller.js";
import {
  ActorMtA
} from "./actor.js";
/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemMtA extends Item {

  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData(); //TODO: Put this functionality in where the item is initialised to avoid problems. Alternative: isImgInitialised flag
    if (!this.img || this.img === "icons/svg/item-bag.svg" || this.img.startsWith('systems/vampire-the-requiem-2e/icons/placeholders')) {

      let img = 'systems/vampire-the-requiem-2e/icons/placeholders/item-placeholder.svg';
      let type = this.type;
      if (type === "melee") {
        if (this.system.weaponType === "Unarmed") type = "unarmed";
        else if (this.system.weaponType === "Thrown") type = "thrown";
      }
      else if (type === "tilt") {
        if (this.system.isEnvironmental) type = "environmental";
      }
      else if (this.type === "rite") {
        if (this.system.riteType !== "rite") type = "miracle";
      }
      else if (this.type === "spell" || this.type === "attainment" || this.type === "activeSpell" || this.type === "spellTemplate" || this.type === "spellEffect") {
        type = this.system.arcanum;
      }
      else if (this.type === "facet") {
        if (this.system.giftType === "moon") type = "moonGift";
        else if (this.system.giftType === "shadow") type = "shadowGift";
        else if (this.system.giftType === "wolf") type = "wolfGift";
      }
      else if (this.type === "werewolf_rite") {
        if (this.system.riteType === "Wolf Rite") type = "werewolf_rite";
        else type = "pack_rite";
      }
      else if (this.type === "demonPower") {
        if (this.system.lore) {
          this.img = `systems/vampire-the-requiem-2e/icons/placeholders/${this.system.lore.replace(/\s+/g, '')}.svg`;
          return;
        }
      }

      if (this.type === "spellTemplate" || this.type === "spellEffect") {
        this.system.templateName = this.name;
        for (const combSpell of this.system.combinedSpells) {
          //spellData.system.description += " <hr> " + combSpell.description;
          this.system.templateName += " & " + combSpell.name;
        }
      }

      img = CONFIG.MTA.placeholders.get(type);
      if (!img) img = 'systems/vampire-the-requiem-2e/icons/placeholders/item-placeholder.svg';

      this.img = img;

      if(this.type === "variation" && this.actor && this.system.scarId) {
        this.system.entangledScar = this.actor.items.get(this.system.scarId);
        if(this.system.entangledScar) {
          this.system.attribute = this.system.entangledScar.system.type;
        }
      }
      else if(this.type === "variation")
        this.system.entangledScar = null;
      
    }
  }

  /* -------------------------------------------- */

  getRollTraits() {
    // FIXME: Currently this will only get the default traits if no dice bonus is defined.
    // Not sure if that is good behaviour..

    if (this.system.dicePool && (this.system.dicePool?.attributes?.length > 0 || this.system.dicePool.value)) {
      return { traits: this.system.dicePool.attributes, diceBonus: this.system.dicePool.value };
    }
    const defaultTraits = { // TODO: Move this into Config?
      firearm: ["attributes_physical.dexterity", "skills_physical.firearms"],
      melee: {
        Unarmed: ["attributes_physical.strength", "skills_physical.brawl"],
        Thrown: ["attributes_physical.dexterity", "skills_physical.athletics"],
        default: ["attributes_physical.strength", "skills_physical.weaponry"],
      },
      explosive: ["attributes_physical.dexterity", "skills_physical.athletics"],
      influence: ["eph_physical.power", "eph_social.finesse"],
      manifestation: ["eph_physical.power", "eph_social.finesse"],
      vehicle: ["attributes_physical.dexterity", "skills_physical.drive"],
      numen: ["eph_physical.power", "eph_social.finesse"]
    };

    if (this.system.haunt && this.system.rating === 1) {
      defaultTraits.haunt_power = ["sineater_traits.synergy", `haunts.${this.system.haunt}`]
    }

    let traits = [];

    if (this.type in defaultTraits) {
      const typeData = defaultTraits[this.type];
      if (Array.isArray(typeData)) {
        traits = typeData;
      } else if (this.system.weaponType in typeData) {
        traits = typeData[this.system.weaponType];
      } else {
        traits = typeData.default;
      }
    }

    if(this.type === 'variation' && (this.system.activationMethod === "controlled" || this.system.activationMethod === "involuntary")) {
      traits = ["deviant_traits.acclimation"];
      if(this.system.attribute === "physical") traits.push("attributes_physical.dexterity");
      else if(this.system.attribute === "social") traits.push("attributes_social.manipulation");
      else if(this.system.attribute === "mental") traits.push("attributes_mental.wits");
    }

    if(this.type === "scar") {
      traits = ["deviant_traits.acclimation"];
      if(this.system.attribute === "physical") traits.push("attributes_physical.stamina");
      else if(this.system.attribute === "social") traits.push("attributes_social.composure");
      else if(this.system.attribute === "mental") traits.push("attributes_mental.resolve");
    }

    return { traits, diceBonus: 0 };
  }

  isWeapon() {
    return this.system.damage != undefined && this.system.isWeapon !== false /* this.type === "firearm" || this.type === "melee" || this.system.isWeapon || this.type === "explosive" || this.type === "combat_dice_pool" */;
  }

  /**
   * Best-effort Vitae cost for a Discipline Power or Devotion.
   * Devotion cost is structured ({value, perTurn}); Discipline Power cost is
   * free text ("1 Vitae", "3-9 Vitae and 1 Willpower", "None", "Varies; …"),
   * so the first integer in a string that mentions Vitae is used as a guess.
   * @returns {number} The guessed cost, 0 if none.
   */
  _parseVitaeCost() {
    const cost = this.system?.cost;
    if (this.type === "devotion") return Math.max(0, Number(cost?.value) || 0);
    if (typeof cost === "string") {
      if (!/vitae/i.test(cost)) return 0;
      const m = cost.match(/\d+/);
      return m ? Number(m[0]) : 0;
    }
    return 0;
  }

  /**
   * If the autoVitaeSpend setting is on and this is a Discipline Power or
   * Devotion with a Vitae cost, prompt to deduct it from the actor's Vitae
   * pool. The amount is pre-filled (a guess for free-text costs) and editable.
   * Resolves once the prompt is dismissed so roll() can continue.
   * @param {Actor} actor  The actor activating the power.
   */
  async _maybeSpendVitae(actor) {
    if (!game.settings.get("vampire-the-requiem-2e", "autoVitaeSpend")) return;
    if (this.type !== "discipline_power" && this.type !== "devotion") return;
    if (!actor?.system?.vitae) return;

    const cost = this._parseVitaeCost();
    if (cost <= 0) return;

    const current = Number(actor.system.vitae.value ?? 0);
    const costLabel = typeof this.system.cost === "string" && this.system.cost.trim()
      ? this.system.cost : `${cost} Vitae`;

    await new Promise((resolve) => {
      new foundry.appv1.api.Dialog({
        title: `Spend Vitae — ${this.name}`,
        content: `
          <form class="vtr-vitae-spend-form">
            <p>Listed cost: <strong>${costLabel}</strong></p>
            <p>Current Vitae: <strong>${current}</strong></p>
            <div class="form-group">
              <label>Vitae to spend</label>
              <input type="number" name="vitae" value="${cost}" min="0" autofocus>
            </div>
          </form>`,
        buttons: {
          spend: {
            icon: '<i class="fas fa-tint"></i>',
            label: "Spend",
            callback: async (html) => {
              const n = Math.max(0, Math.round(Number(html.find('[name="vitae"]').val()) || 0));
              if (n > 0) {
                if (n > current) ui.notifications.warn(`${actor.name}: not enough Vitae — pool emptied.`);
                await actor.update({ "system.vitae.value": Math.max(0, current - n) });
              }
              resolve();
            }
          },
          skip: { icon: '<i class="fas fa-times"></i>', label: "Skip", callback: () => resolve() }
        },
        default: "spend",
        close: () => resolve()
      }).render(true);
    });
  }

  async showChatCard() {
    const token = this.actor.token;
    const templateData = {
      item: this,
      actor: this.actor,
      tokenId: token ? `${token.object.scene.id}.${token.id}` : null, //token ? `${token.scene.id}.${token.id}` : null,
      isSpell: this.type === "spell",
      data: await this.getChatData()
    };

    // Render the chat card template
    const template = `systems/vampire-the-requiem-2e/templates/chat/item-card.html`;
    const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      content: html,
      speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.actor.token }),
      flavor: ""
    };

    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if (rollMode === "blindroll") chatData["blind"] = true;
    ChatMessage.create(chatData);
  }

  /**
   * Rolls the item with the default dice pools, or its custom dice pools if any are defined.
   * @param {*} [target] - The target token for an attack roll.
   * @param {boolean} [quickRoll=false] - If set to true, no dice roller will be shown, and the roll will be executed directly.
   * @param {Object} [options={}] 
   * @param {*} options.actorOverride - Override for the actor used to roll.
   */
  async roll(target, quickRoll = false, { actorOverride, diceRollBonus = 0, exceptionalTarget = 5, additionalFlavor = "" } = {}) {
    // TODO: Combine item description and roll

    if (this.type !== "combat_dice_pool") this.showChatCard();

    const actor = actorOverride ? actorOverride : this.actor;

    if (!actor) {
      ui.notifications.error(`CofD: An item can only be rolled if an actor owns it!`);
      return;
    }

    if (!target) { // Infer a target from the selected targets
      const targets = game.user.targets;
      target = targets ? targets.values().next().value : undefined;
    }

    let macro;
    if (this.system.dicePool?.macro) {
      macro = game.macros.get(this.system.dicePool.macro);
    }

    await actor.setFlag('vampire-the-requiem-2e', 'lastRolledItem', this.id);

    // Discipline Power / Devotion: offer to deduct the Vitae cost. Runs before
    // the no-dice-pool early return below so powers with no roll still prompt.
    await this._maybeSpendVitae(actor);

    let { traits, diceBonus } = this.getRollTraits();

    let ignoreUnskilled = this.system.dicePool?.ignoreUnskilled;

    if (actor.type === "ephemeral" && this.type === "haunt_power") {
      traits = ["eph_physical.power", "rank", `haunts.${this.system.haunt}`];
    }

    if (!traits.length && !diceBonus && this.type !== "combat_dice_pool" && this.type !== "general_dice_pool") {
      if (macro) macro.execute({ actor: actor, token: actor.token ?? actor.getActiveTokens[0], item: this });
      return;
    }

    let { dicePool, flavor, specialties } = actor.assembleDicePool({ traits, diceBonus, ignoreUnskilled });
    if (!flavor) flavor = "Skill Check";


    if(this.type === 'variation' && (this.system.activationMethod === "controlled" || this.system.activationMethod === "involuntary")) {
      let magnitudeBonus = this.system.magnitude;
      flavor += " + " + game.i18n.localize('MTA.Magnitude')
      if(this.system.magnitudeDeviations) {
        magnitudeBonus += this.system.magnitudeDeviations;
        flavor += " + " + game.i18n.localize('MTA.MagnitudeFromDeviations')
      }
      dicePool += Math.min(5,magnitudeBonus);
    }

    let extended = false,
      defense = 0;

    if (this.system.diceBonus) {
      dicePool += this.system.diceBonus;
      flavor += this.system.diceBonus >= 0 ? ' (+' : ' (';
      flavor += this.system.diceBonus + ' equipment bonus)';
    }

    dicePool += diceRollBonus;

    if (this.type === "combat_dice_pool" || this.type === "general_dice_pool") {
      dicePool = +this.system.value;
    }

    if (this.system.dicePool?.extended) {
      extended = true;
    }

    const damageRoll = this.isWeapon();
    if (damageRoll) {
      if (target?.actor?.system.derivedTraits) { // Remove target defense
        const def = target.actor.system.derivedTraits.defense;
        defense = (def.final ? def.final : def.value);
      }
      if (target) {
        flavor += " vs target " + target.name;
      }
    }

    if (this.type === "explosive") { // Create measured templates for explosives
      const distance = this.system.blastArea > 0 ? this.system.blastArea : 1;
      const pos = target ? { x: target.center.x, y: target.center.y } : canvas.scene._viewPosition; // Default is middle of the screen

      const getSurroundingTokens = (origin, distance = 1) => {
        return canvas.scene.tokens.filter(t => canvas.grid.measureDistance(origin, t, { gridSpaces: true }) <= distance);
      }

      // Note: blast-radius MeasuredTemplate visuals were removed for Foundry v14
      // compatibility (the MeasuredTemplate document type was removed in v14).
      // Damage to surrounding tokens is still calculated below.

      const rollDiceAndCalculateDamage = async (tokensAffected, damageType) => {
        let acc = '';

        for (const cur of tokensAffected) {
          const roll = await DiceRollerDialogue._roll(this.system.force);
          const damage = roll.total > 0 ? this.system.damage * 2 : this.system.damage;
          acc += `<li>@UUID[${cur.uuid}]{${cur.name}}: ${damage} ${damageType} damage (Force: ${roll.total} successes)</li>`;
        }

        return acc;
      };

      const surr_aggravated = getSurroundingTokens(pos, 1);
      const string_aggr = await rollDiceAndCalculateDamage(surr_aggravated, 'aggravated');

      /*       surr_aggravated.reduce((acc, cur) => {
              const roll = DiceRollerDialogue._roll(this.system.force);
              const damage = roll.total > 0 ? this.system.damage*2 : this.system.damage;
              return acc + `<li>@UUID[${cur.uuid}]{${cur.name}}: ${damage} aggravated damage (Force: ${roll.total} successes)</li>`
            }, ''); */

      const surr_lethal = getSurroundingTokens(pos, distance).filter(t => !surr_aggravated.includes(t));
      const string_lethal = await rollDiceAndCalculateDamage(surr_lethal, 'lethal');
      /*       const string_lethal = await surr_lethal.reduce(async (acc, cur) => {
              const roll = await DiceRollerDialogue._roll(this.system.force);
              const damage = roll.total > 0 ? this.system.damage*2 : this.system.damage;
              return acc + `<li>@UUID[${cur.uuid}]{${cur.name}}: ${damage} lethal damage (Force: ${roll.total} successes)</li>`
            }, ''); */


      const surr_bashing = getSurroundingTokens(pos, distance * 2).filter(t => !surr_lethal.includes(t) && !surr_aggravated.includes(t));
      const string_bashing = await rollDiceAndCalculateDamage(surr_bashing, 'bashing');
      /*       const string_bashing = await surr_bashing.reduce(async (acc, cur) => {
              const roll = await DiceRollerDialogue._roll(this.system.force);
              const damage = roll.total > 0 ? this.system.damage*2 : this.system.damage;
              return acc + `<li>@UUID[${cur.uuid}]{${cur.name}}: ${damage} bashing damage (Force: ${roll.total} successes)</li>`
            }, ''); */

      ChatMessage.create({
        content: `<ul>
          ${string_aggr + string_lethal + string_bashing}
        </ul>`,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
      });
    }

    const ballistic = target ? target.actor?.system.derivedTraits.ballistic.final : 0;
    const armor = target ? target.actor?.system.derivedTraits.armor.final : 0;
    let applyDefense = this.type === "melee" || this.type === "explosive" || (this.type === "firearm" && target?.actor?.type === "ephemeral") || this.system.applyDefense;

    flavor += " " + additionalFlavor;

    if (quickRoll) {
      if (!damageRoll) {
        return DiceRollerDialogue.rollToChat({
          dicePool,
          flavor,
          title: this.name + " - " + flavor,
          actorOverride: actor,
          macro,
          actor: actor,
          comment: this.system.dicePool?.comment,
          exceptionalTarget
        });
      }
      else {
        return DiceRollerDialogue.rollWithDamage({
          dicePool,
          flavor,
          title: this.name + " - " + flavor,
          itemName: this.name,
          itemImg: this.img,
          itemDescr: this.system.description,
          itemRef: this,
          weaponDamage: +this.system.damage,
          armorPiercing: this.system.penetration,
          spendAmmo: this.type === "firearm",
          actorOverride: actor,
          macro,
          actor: actor,
          comment: this.system.dicePool?.comment,
          noSuccessesToDamage: this.type !== "explosive",
          target,
          defense,
          applyDefense,
          ignoreBallistic: this.type !== "firearm",
          armor,
          ballistic,
          exceptionalTarget,
          damageType: this.system.damageType
        });
      }

    }
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool,
        extended,
        flavor,
        title: this.name + " - " + flavor,
        damageRoll,
        itemName: this.name,
        itemImg: this.img,
        itemDescr: this.system.description,
        itemRef: this,
        weaponDamage: +this.system.damage,
        armorPiercing: this.system.penetration,
        spendAmmo: this.type === "firearm",
        actorOverride: actor,
        macro,
        actor: actor,
        comment: this.system.dicePool?.comment,
        noSuccessesToDamage: this.type === "explosive" || this.system.noSuccessesToDamage,
        target,
        defense,
        applyDefense,
        ignoreBallistic: this.type !== "firearm",
        armor,
        ballistic,
        exceptionalTarget,
        specialties,
        damageType: this.system.damageType
      });
      diceRoller.render(true);
    }

  }




  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log
   * @return {Object}               An object of chat data to render
   */
  async getChatData() {
    let secrets = this.isOwner;
    if (game.user.isGM) secrets = true;
    //enrichHTML(content, secrets, entities, links, rolls, rollData) → {string}

    let desc = null;
    if (this.type == 'utterance') {desc = "<h3>" + game.i18n.localize('MTA.Mummy.Utterance.tabTier1') + "</h3>" + this.system.tier1_desc+this.system.tier1_pillar_effect
      +"<h3>" + game.i18n.localize('MTA.Mummy.Utterance.tabTier2') + "</h3>" + this.system.tier2_desc+this.system.tier2_pillar_effect
      +"<h3>" + game.i18n.localize('MTA.Mummy.Utterance.tabTier3') + "</h3>" + this.system.tier3_desc+this.system.tier3_pillar_effect;
    }
    else if (this.system.description) {desc = this.system.description}
    else if (this.system.desc) {desc = this.system.desc}

    const data = {description: await foundry.applications.ux.TextEditor.implementation.enrichHTML(desc, {secrets:secrets, entities:true})}

    return data;
  }

  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  static chatListeners(html) {
    html.querySelectorAll('.button')?.forEach(e => e.addEventListener('click', this._onChatCardAction.bind(this)))
    html.querySelectorAll('.item-name')?.forEach(e => e.addEventListener('click', this._onChatCardToggleContent.bind(this)))
  }

  /* -------------------------------------------- */

  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
  static async _onChatCardAction(event) {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;

    const card = button.closest(".chat-card");
    if (!card) return;
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    if (action === "addActiveSpell") {
      // Validate permission to proceed with the roll
      if (!(game.user.isGM || message.isAuthor)) return;

      // Get the Actor from a synthetic Token
      const actor = this._getChatCardActor(card.dataset.tokenId, card.dataset.actorId);
      if (!actor) return;

      //Get spell data
      let description = $(card).find(".card-description");
      description = description[0].innerHTML;

      let spellName = $(card).find(".item-name");
      spellName = spellName[0].innerText;

      //let image = $(card).find(".item-img");
      //image = image[0].src;
      let image = card.dataset.img;

      let spellFactorsArray = $(card).find(".spell-factors > li");
      spellFactorsArray = $.makeArray(spellFactorsArray);
      spellFactorsArray = spellFactorsArray.map(ele => {
        let text = ele.innerText;
        let advanced = ele.dataset.advanced === "true";
        let splitText = text.split(":", 2);

        return [splitText[0], splitText[1], advanced];
      });
      let spellFactors = {};
      for (let i = 0; i < spellFactorsArray.length; i++) {
        spellFactors[spellFactorsArray[i][0]] = { value: spellFactorsArray[i][1].trim(), isAdvanced: spellFactorsArray[i][2] };
      }

      //Special handling for conditional duration, and advanced potency
      let durationSplit = spellFactors.Duration.value.split("(", 2);
      spellFactors.Duration.value = durationSplit[0];
      if (durationSplit[1]) spellFactors.Duration.condition = durationSplit[1].split(")", 1)[0];
      spellFactors.Potency.value = spellFactors.Potency.value.split("(", 1)[0].trim();

      const spellInstanceId = card.dataset.spellinstanceid

      const activeSpellData = {
        name: spellName,
        type: "activeSpell",
        img: image,
        system: {
          potency: spellFactors.Potency,
          duration: spellFactors.Duration,
          scale: spellFactors.Scale,
          arcanum: card.dataset.arcanum,
          level: card.dataset.level,
          practice: card.dataset.practice,
          primaryFactor: card.dataset.primfactor,
          withstand: card.dataset.withstand,
          description: description,
          addons: card.dataset.addons ? JSON.parse(card.dataset.addons) : [],
          spellInstanceId
          //chosenAddons: card.dataset.chosenAddons ? JSON.parse(card.dataset.chosenAddons).map(i => parseInt(i)) : []
        }
      };
      //Add spell to active spells
      //const activeSpellData = foundry.utils.mergeObject(spellData, {type: "activeSpell"},{insertKeys: true,overwrite: true,inplace: false,enforceTypes: true});
      await actor.createEmbeddedDocuments("Item", [activeSpellData]);
      ui.notifications.info("Spell added to active spells of " + actor.name);
    }
    else if (action === "addSpellCondition") {
      if (!canvas.tokens.controlled.length) {
        ui.notifications.warn("Please select a token first.");
        return;
      }

      const selectedToken = canvas.tokens.controlled[0];
      const selectedActor = selectedToken.actor;

      if (!selectedActor) {
        ui.notifications.error("Selected token has no actor.");
        return;
      }

      // Get the Actor from a synthetic Token
      const actor = this._getChatCardActor(card.dataset.tokenId, card.dataset.actorId);
      if (!actor) return;

      //Get spell data
      let description = $(card).find(".card-description");
      description = description[0].innerHTML;

      let spellName = $(card).find(".item-name");
      spellName = spellName[0].innerText;

      //let image = $(card).find(".item-img");
      //image = image[0].src;
      let image = card.dataset.img;

      let spellFactorsArray = $(card).find(".spell-factors > li");
      spellFactorsArray = $.makeArray(spellFactorsArray);
      spellFactorsArray = spellFactorsArray.map(ele => {
        let text = ele.innerText;
        let advanced = ele.dataset.advanced === "true";
        let splitText = text.split(":", 2);

        return [splitText[0], splitText[1], advanced];
      });
      let spellFactors = {};
      for (let i = 0; i < spellFactorsArray.length; i++) {
        spellFactors[spellFactorsArray[i][0]] = { value: spellFactorsArray[i][1].trim(), isAdvanced: spellFactorsArray[i][2] };
      }

      //Special handling for conditional duration, and advanced potency
      let durationSplit = spellFactors.Duration.value.split("(", 2);
      spellFactors.Duration.value = durationSplit[0];
      if (durationSplit[1]) spellFactors.Duration.condition = durationSplit[1].split(")", 1)[0];
      spellFactors.Potency.value = spellFactors.Potency.value.split("(", 1)[0].trim();

      const spellInstanceId = card.dataset.spellinstanceid

      const conditionData = {
        name: spellName,
        type: "spellEffect",
        img: image,
        system: {
          ownerTokenId: card.dataset.tokenId,
          ownerActorId: card.dataset.actorId,
          potency: spellFactors.Potency,
          duration: spellFactors.Duration,
          scale: spellFactors.Scale,
          arcanum: card.dataset.arcanum,
          level: card.dataset.level,
          practice: card.dataset.practice,
          primaryFactor: card.dataset.primfactor,
          withstand: card.dataset.withstand,
          description: description,
          addons: card.dataset.addons ? JSON.parse(card.dataset.addons) : [],
          effects: card.dataset.effects ? JSON.parse(card.dataset.effects) : [],
          spellInstanceId
        }
      }

      if (conditionData.system.effects.length) {
        conditionData.system.effectsActive = true;
      }
      await selectedActor.createEmbeddedDocuments("Item", [conditionData]);
      ui.notifications.info("Spell effect added to " + selectedActor.name);
    }
    else if (action === "applyDamage") {

      // Get target
      const tokenId = button.dataset.tokenid;
      const actorId = button.dataset.actorid;
      const actor = this._getChatCardActor(tokenId, actorId);
      let damage = +button.dataset.damage;
      let damageBashing = +button.dataset.bashingdamageinflicted;
      let damageisaggravated = button.dataset.damageisaggravated === "true";

      if (!actor) { // TODO: Take currently aimed token instead?
        ui.notifications.warn("No actor found!");
        button.disabled = false;
        return;
      }

      if (!actor.isOwner) {
        ui.notifications.warn("Can currently only be executed by the GM or the actor owner!");
        return;
      }
      console.log(actor.system, button.dataset)


      if (damageBashing) await actor.damage(damageBashing, "bashing");
      if (damage) actor.damage(damage, damageisaggravated ? "aggravated" : "lethal");


      console.log("target", actor, tokenId, actorId)
    }
    // Re-enable the button
    button.disabled = false;
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @return {Actor|null}         The Actor entity or null
   * @private
   */
  static _getChatCardActor(tokenKey, actorId) {

    // Case 1 - a synthetic actor from a Token
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) return null;
      const tokenData = scene.getEmbeddedDocument("Token", tokenId);
      if (!tokenData) return null;
      //const token = new Token(tokenData);
      return tokenData.actor;
    }

    // Case 2 - use Actor ID directory
    return game.actors.get(actorId) || null;
  }

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-description");
    content.style.display = content.style.display === "none" ? "block" : "none";
  }
}
