import {
  DiceRollerDialogue
} from "./dialogue-diceRoller.js";
import {
  ImprovisedSpellDialogue
} from "./dialogue-improvisedSpell.js";
import {
  UtteranceDialogue
} from "./dialogue-utterance.js";

/**
 * Short, original explanations of the Conditions the Frenzy / Lashing Out /
 * Detachment flows can apply. Used by applyConditionByName() as a fallback
 * when the world has no matching Condition item, so play is never interrupted
 * by talk of missing assets. `tone` only picks the card colour.
 */
const CONDITION_BLURBS = {
  bestial: { tone: "bad", text: "The Beast shows plainly. The character reads as an open predator &mdash; mortals are unnerved, Social rolls to sway them suffer, and animals shy away. It eases once she lets the Beast act on its instincts." },
  wanton: { tone: "bad", text: "The seductive Beast is loose. The character is pulled toward indulgence and a moment of throwaway gratification, and is hard-pressed to resist that pull until she gives in to it." },
  competitive: { tone: "bad", text: "The Beast-as-alpha takes hold. The character is driven to win, command, and prove herself atop the hierarchy, and chafes until she dominates a contest of her choosing." },
  tempted: { tone: "bad", text: "The Beast offers an easy, selfish way out. The character is presented with a tempting shortcut that serves her at someone else's expense; resolving it means taking the bait &mdash; or refusing it at real cost." },
  jaded: { tone: "bad", text: "Something that should move the character no longer does. She is numb to a particular kind of experience and meets it with cold indifference." },
  inspired: { tone: "good", text: "The character is seized by clear, driving purpose. She gains an edge while pursuing that inspiration, and the Condition resolves once she acts decisively on it." }
};

/**
 * Override and extend the basic :class:`Actor` implementation
 */
export class ActorMtA extends Actor {

  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */

  /**
   * Augment the basic Actor data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    if (!CONFIG.MTA.supportedActorTypes.includes(this.type))
      return;

    // Get the Actor's data object
    const systemData = this.system;

    /* -- Read character config -- */
    systemData.typeConf = {};
    systemData.typeConf.virtueName = "MTA.Virtue";
    systemData.typeConf.viceName = "MTA.Vice";
    systemData.typeConf.sheet = {};

    systemData.typeConf.characterVariants = { mortal: "mortal" };

    const characterConf = CONFIG.MTA.characterConfig[this.type]?.[systemData.characterType];
    if (characterConf) {
      const typeConf = characterConf[systemData.characterVariant];
      if (typeConf) {
        foundry.utils.mergeObject(systemData.typeConf, typeConf, {enforceTypes: false, inplace: true, insertKeys: true, insertValues: false, overwrite: true, performDeletions: false, recursive: false});
        systemData.typeConf.sheet = {};

        if (typeConf.sheet) {
          for (let flag of typeConf.sheet) {
            systemData.typeConf.sheet[flag] = true;
          }
        }        
      }

      // build characterVariants as key -> locale
      systemData.typeConf.characterVariants = {};
      for (const [variantKey, conf] of Object.entries(characterConf)) {
        systemData.typeConf.characterVariants[variantKey] =
          (conf && conf.locale) || variantKey;
      }
    }

    // Get special effects
    systemData.specialEffects = [];
    for (let item of this.items) {
      if (item.system.specialEffects && item.system.effectsActive) {
        for (let effect of item.system.specialEffects) {
          systemData.specialEffects.push({
            name: effect,
            rating: item.system.rating
          })
        }
      }
    }

    if (!systemData.derivedTraits) systemData.derivedTraits = {
      size: { value: 0, mod: 0 },
      speed: { value: 0, mod: 0 },
      defense: { value: 0, mod: 0 },
      armor: { value: 0, mod: 0 },
      ballistic: { value: 0, mod: 0 },
      initiativeMod: { value: 0, mod: 0 },
      perception: { value: 0, mod: 0 },
      health: { value: 0, mod: 0 },
      willpower: { value: 0, mod: 0 },
      stability: { value: 0, mod: 0 },
    };

    //Get modifiers from items
    let item_mods = this.items.reduce((acc, item) => {
      if (item.system.equipped) {
        if (item.system.initiativeMod) acc.initiativeMod += item.system.initiativeMod;
        if (item.type === "armor") acc.armor += item.system.rating;
        if (item.type === "armor") acc.ballistic += item.system.ballistic;
        if (item.system.defenseMod) acc.defense += item.system.defenseMod;
        if (item.system.speedMod) acc.speed += item.system.speedMod;
      }
      return acc;
    }, {
      initiativeMod: 0,
      defense: 0,
      speed: 0,
      armor: 0,
      ballistic: 0
    });

    let attributes = [];
    if (this.type === "character") {
      attributes = [
        systemData.attributes_physical,
        systemData.attributes_mental,
        systemData.attributes_social,
        systemData.skills_physical,
        systemData.skills_social,
        systemData.skills_mental,
        systemData.derivedTraits,
        systemData.attributes_physical_dream,
        systemData.attributes_mental_dream,
        systemData.attributes_social_dream,
        systemData.mage_traits,
        systemData.vampire_traits,
        systemData.werewolf_traits,
        systemData.changeling_traits,
        systemData.demon_traits,
        systemData.arcana_subtle,
        systemData.arcana_gross,
        systemData.sineater_traits,
        systemData.mummy_traits,
        systemData.deviant_traits,
        systemData.promethean_traits,
        systemData.generalModifiers,
      ];
    }
    else if (this.type === "ephemeral") {
      attributes = [
        systemData.eph_general,
        systemData.eph_physical,
        systemData.eph_mental,
        systemData.eph_social,
        systemData.derivedTraits,
        systemData.generalModifiers,
        systemData.arcana_subtle,
        systemData.arcana_gross,
      ];
    }
    else if (this.type === "simple_antagonist") {
      attributes = [
        systemData.attributes_physical,
        systemData.attributes_mental,
        systemData.attributes_social,
        systemData.derivedTraits,
        systemData.generalModifiers
      ];
    }

    attributes.forEach(attribute => Object.values(attribute).forEach(trait => {
      //if(trait == undefined) console.warn("Null attribute found", attribute, this.name)
      if (trait == undefined) trait = {};
      if (typeof trait == 'number') trait = {}; // Quick fix for a mistake I made for dream stats
      trait.final = trait.value;
      trait.raw = undefined;
      trait.isModified = false;
    }));

    const der = systemData.derivedTraits;

    let derivedTraitBuffs = [];
    let generalTraitBuffs = [];
    let itemBuffs = [];

    //Get effects from items (modifiers to any attribute/skill/etc.)
    for (let i of this.items) {
      if (i.system?.effects && (i.system?.effectsActive || i.system?.equipped)) { // only look at active effects
        if (i.type === "form" && this.system.characterType !== "werewolf") continue; // Forms only work for werewolves
        itemBuffs = itemBuffs.concat(i.system.effects);
      }
    }

    itemBuffs.filter(e => e.name.split('.')[0] !== "derivedTraits" && e.name.split('.')[0] !== "generalModifiers").sort((a, b) => (b.value < 0) - (a.value < 0) || (!!a.overFive) - (!!b.overFive)).forEach(e => {
      const trait = e.name.split('.').reduce((o, i) => {
        if (o != undefined && o[i] != undefined) return o[i];
        else return undefined;
      }, systemData);
      if (trait != undefined) {
        if (typeof trait == 'number') {
          if (ui?.notifications) ui.notifications.warn(`CofD: The trait does not support the effect system at the moment: ${e.name}`);
          console.warn("CofD: The trait does not support the effect system at the moment. " + e.name);
          return;
        }
        const newVal = (Number.isInteger(trait.raw) ? trait.raw : trait.value) + e.value;
        const traitSplit = e.name.split('.');
        const traitName = traitSplit[traitSplit.length - 1];
        trait.raw = e.overFive ? newVal : Math.min(newVal, Math.max(trait.value, this.getTraitMaximum(traitName)));
        trait.final = Math.clamp(trait.raw, 0, Math.max(trait.value, CONFIG.MTA.traitMaximum));
        trait.isModified = true;
      }
      else {
        if (ui?.notifications) ui.notifications.warn(`CofD: The trait does not support the effect system at the moment: ${e.name}`);
        console.warn("CofD: The trait does not support the effect system at the moment. " + e.name, this.name);
        return;
      }
    });
    derivedTraitBuffs.push(...itemBuffs.filter(e => e.name.split('.')[0] === "derivedTraits"));
    generalTraitBuffs.push(...itemBuffs.filter(e => e.name.split('.')[0] == "generalModifiers"));

    generalTraitBuffs.forEach(e => {
      const trait = e.name.split('.').reduce((o, i) => o[i], systemData);
      trait.raw = Number.isInteger(trait.raw) ? trait.raw + e.value : trait.value + e.value;
      trait.final = trait.raw;
      trait.isModified = true;
    });

    // Some defaults for all characters
    der.size.value = 5;

    // Compute derived traits
    if (this.type === "character") {
      const strength = systemData.attributes_physical.strength.final;
      const dexterity = systemData.attributes_physical.dexterity.final;
      const wits = systemData.attributes_mental.wits.final;
      const composure = systemData.attributes_social.composure.final;
      const stamina = systemData.attributes_physical.stamina.final;
      const resolve = systemData.attributes_mental.resolve.final;

      if (systemData.isDreaming) {
        der.speed.value = 5 + systemData.attributes_physical_dream.power.final + systemData.attributes_social_dream.finesse.final;
        der.defense.value = Math.min(systemData.attributes_physical_dream.power.final, systemData.attributes_social_dream.finesse.final);
        der.initiativeMod.value = systemData.attributes_social_dream.finesse.final + systemData.attributes_mental_dream.resistance.final /* + der.initiativeMod.mod + item_mods.initiativeMod */;

        let newMax = 0;
        if (systemData.typeConf.dreamingHealth === "wyrdClarity") newMax = systemData.clarity.value;
        else newMax = systemData.attributes_mental_dream.resistance.final;

        //  Add Gnosis/Wyrd derived maximum
        if (systemData.typeConf.dreamingHealth === "gnosisResistance") newMax += Math.max(5, systemData.mage_traits.gnosis.final);
        else if (systemData.typeConf.dreamingHealth === "wyrdClarity") newMax += Math.max(5, systemData.changeling_traits.wyrd.final);
        else newMax += 5;
        der.health.value = newMax;
      }
      else {
        let higherOfWitsDexDefense = this.hasSpecialEffect("defenseHigherOfWitsAndDex")
          || (this.hasSpecialEffect("defenseHigherOfWitsAndDexWerewolf") && this.areAnyItemsActive("Urhan", "Urshul"));
        der.speed.value = 5 + strength + dexterity;
        der.defense.value = (higherOfWitsDexDefense ? Math.max(wits, dexterity) : Math.min(wits, dexterity)) + this._getDefenseSkill();
        der.initiativeMod.value = composure + dexterity;
        der.health.value = stamina;
      }
      der.perception.value = composure + wits + this.getClarityBonus();
      der.willpower.value = resolve + composure;
      der.stability.value = 5 + systemData.deviant_traits.acclimation.final;
    }
    else if (this.type === "ephemeral") {
      der.speed.value = 5 + systemData.eph_physical.power.final + systemData.eph_social.finesse.final;
      if (this.hasSpecialEffect("defenseUseResistance"))
        der.defense.value = systemData.eph_mental.resistance.final;
      else
        der.defense.value = (systemData.eph_general.rank.final > 1 ? Math.min(systemData.eph_physical.power.final, systemData.eph_social.finesse.final) : Math.max(systemData.eph_physical.power.final, systemData.eph_social.finesse.final))
      der.initiativeMod.value = systemData.eph_social.finesse.final + systemData.eph_mental.resistance.final;
      der.perception.value = systemData.eph_social.finesse.final + systemData.eph_mental.resistance.final;
      der.health.value = systemData.eph_mental.resistance.final;
      der.willpower.value = systemData.eph_general.rank.final <= 5 ? Math.min(systemData.eph_social.finesse.final + systemData.eph_mental.resistance.final, 10) : systemData.eph_social.finesse.final + systemData.eph_mental.resistance.final;
    }
    else if (this.type === "simple_antagonist") {
      const str = systemData.attributes_physical.strength.final;
      const dex = systemData.attributes_physical.dexterity.final;
      const wit = systemData.attributes_mental.wits.final;
      const comp = systemData.attributes_social.composure.final;
      const resolve = systemData.attributes_mental.resolve.final;
      der.speed.value = 5 + str + dex;
      der.defense.value = Math.min(wit, dex);
      der.initiativeMod.value = comp + dex;
      der.health.value = systemData.attributes_physical.stamina.final;
      der.perception.value = comp + wit;
      der.willpower.value = resolve + comp;
    }
    else if (this.type === "brief_nightmare") {
      const all_other_dicepools = systemData.all_other_dicepools;
      const best_dice_pool = systemData.best_dice_pool.value;
      //const worst_dice_pool = systemData.worst_dice_pool.value;
      der.health.value = 2 + best_dice_pool;
      //der.willpower.value = 0;
      der.defense.value = all_other_dicepools;
      der.speed.value = 5 + Math.max(all_other_dicepools, best_dice_pool);
      der.initiativeMod.value = Math.max(all_other_dicepools, best_dice_pool);
      der.perception.value = all_other_dicepools;

      systemData.numDreadPowers = this.getNumDreadPowers();
    }

    //systemData.activeSpellCount = this.items.reduce((acc, cur) => cur.type !== "activeSpell" ? 0 : cur.system.isRelinquishedSafely ? acc + 0 : cur.system.isRelinquished ? acc + 0 : acc + 1, 0);
    // Apply derived trait buffs. Note: item_mods are different from the buffs below - they
    //                                  are stuff like initiative mod, etc. on weapons ...
    der.size.value += der.size.mod;
    der.armor.value += der.armor.mod + item_mods.armor;
    der.ballistic.value += der.ballistic.mod + item_mods.ballistic;
    der.speed.value += der.speed.mod + item_mods.speed;
    der.defense.value += der.defense.mod + item_mods.defense;
    der.initiativeMod.value += der.initiativeMod.mod + item_mods.initiativeMod;
    der.perception.value += der.perception.mod;
    der.health.value += der.health.mod;
    der.willpower.value += der.willpower.mod;
    der.stability.value += der.stability.mod;

    if(systemData.typeConf.sheet.potency) {
      der.willpower.value += systemData.potency;
    }

    /*     console.log("WHAT Speed", der.speed.value, der.speed.mod, item_mods.speed)
        console.log("WHAT defense", der.defense.value, der.defense.mod, item_mods.defense)
        console.log("WHAT initiativeMod", der.initiativeMod.value, der.initiativeMod.mod, item_mods.initiativeMod) */

    [systemData.derivedTraits].forEach(attribute => Object.values(attribute).forEach(trait => {
      trait.final = trait.value;
      trait.raw = undefined;
      trait.isModified = false;
    }));

    // Apply derived Traits buffs
    derivedTraitBuffs.forEach(e => {
      const trait = e.name.split('.').reduce((o, i) => o[i], systemData);
      trait.raw = Number.isInteger(trait.raw) ? trait.raw + e.value : trait.value + e.value;
      trait.final = Math.max(trait.raw, 0);
      trait.isModified = true;
    });

    if (!systemData.isDreaming && this.type !== "brief_nightmare") der.health.final += der.size.final;

    // No negative values
    [systemData.derivedTraits].forEach(attribute => Object.values(attribute).forEach(trait => {
      trait.final = Math.max(trait.final, 0);
    }));

    // Set willpower (no need to do a calculate button)
    systemData.willpower.max = der.willpower.final;

    if (this.type === "character") {
      systemData.deviant_traits.stability.max = der.stability.final;
    }

    /*     der.size.final = Math.max(0, der.size.final);
        der.speed.final = Math.max(0, der.speed.final);
        der.defense.final = Math.max(0, der.defense.final);
        der.armor.final = Math.max(0, der.armor.final);
        der.ballistic.final = Math.max(0, der.ballistic.final);
        der.initiativeMod.final = Math.max(0, der.initiativeMod.final);
        der.perception.final = Math.max(0, der.perception.final);
     */
    // Get current demon cover
    if (systemData.characterType === "demon") {
      systemData.currentCover = 0;
      for (let actorItem of this.items) {
        if (actorItem.type == "cover" && actorItem.system.isActive) {
          systemData.currentCover = actorItem.system.rating;
          systemData.currentCoverName = actorItem.name;
          break;
        }
      }
    }

    if (systemData.geistId === this.id) systemData.geistId = undefined;
    if (systemData.sineaterId === this.id) systemData.sineaterId = undefined;

    if (systemData.characterType === "sinEater") {
      const synergyLvl = CONFIG.MTA.synergy_levels[Math.min(9, Math.max(0, systemData.sineater_traits.synergy.final - 1))];
      if (synergyLvl) {
        systemData.synergyRelationship = synergyLvl.relationship;
        systemData.synergyLiminalAura = synergyLvl.liminalAura;
        systemData.synergyTouchstones = synergyLvl.touchstones;
      }
    }

    // Get Sin-eater's Geist
    if (systemData.characterType === "sinEater" && systemData.geistId) {
      systemData.geistActor = game.actors.get(systemData.geistId);
      if (systemData.geistActor) {
        systemData.effectiveRank = Math.min(systemData.sineater_traits.synergy.final, systemData.geistActor.system.eph_general.rank.final);
      }
    }

    if (systemData.mage_traits) {
      // Calculate active spell limits
      if (systemData.typeConf.sheet.gnosis) {
        systemData.mage_traits.activeSpellMaximum.final += systemData.mage_traits.gnosis.final;
      }
      else if (this.type === "ephemeral") {
        systemData.mage_traits.activeSpellMaximum.final = 99;
      }
      else {
        systemData.mage_traits.activeSpellMaximum.final += 1;
      }
    }

    if(systemData.deviant_traits && (systemData.typeConf.sheet.conviction || systemData.typeConf.sheet.loyalty)) {
      // Calculate conviction & loyalties
      systemData.conviction = this.items.filter(item => item.type === "conviction" && !item.system.wavering).length;
      systemData.loyalty = this.items.filter(item => item.type === "loyalty" && !item.system.wavering).length;
      systemData.isFeral = systemData.conviction == 0 && systemData.loyalty == 0;
      systemData.isGuardian = !systemData.isDevoted && systemData.loyalty > systemData.conviction;
      systemData.canBeDevoted = systemData.loyalty > systemData.conviction + 1;
    }


    if(systemData.typeConf.sheet.alchemistMaxDistillations) {
      systemData.distillationLimit = {
        value: this.itemTypes.distillation.length,
        max: CONFIG.MTA.magnitude_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.magnitude - 1))].maxDistillations
      };
    }

    if (systemData.typeConf.sheet.pyros) {
      systemData.pyrosPerTurn = CONFIG.MTA.azoth_levels[Math.min(CONFIG.MTA.azoth_levels.length-1, Math.max(0, systemData.promethean_traits.azoth.final - 1))].pyrosPerTurn;
    }

    if (systemData.typeConf.sheet.pyrosAlchemist) {
      systemData.pyrosPerTurn = CONFIG.MTA.magnitude_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.magnitude - 1))].pyrosPerTurn;
      systemData.pyrosPerWeek = CONFIG.MTA.magnitude_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.magnitude - 1))].regenPerWeek;
    }

    if (systemData.typeConf.sheet.pyrosPandoran) {
      systemData.pyrosPerTurn = CONFIG.MTA.pandoran_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.pandoranRank - 1))].pyrosPerTurn;
    }

    // Get Geist's Sin-eater
    if (systemData.characterType === "ghost" && systemData.sineaterId) {
      systemData.sineaterActor = game.actors.get(systemData.sineaterId);
      if (systemData.sineaterActor) {
        systemData.willpower.value = systemData.sineaterActor.system.willpower.value;
        systemData.willpower.max = systemData.sineaterActor.system.willpower.max;
        systemData.essence.value = systemData.sineaterActor.system.plasm.value;
        systemData.essence.max = systemData.sineaterActor.system.plasm.max;
        systemData.haunt_power = systemData.sineaterActor.items.filter(item => item.type === "haunt_power");
        systemData.haunts = {};

        for (const [key, val] of Object.entries(systemData.sineaterActor.system.haunts)) {
          systemData.haunts[key] = {
            value: val.value
          }
        }
      }
    }

/*     if (systemData.characterType === "promethean") {
      if (systemData.transmutations_own) {
        for (const key in systemData.transmutations_own) {
          var transm = systemData.transmutations_own[key];
          var alembicKeys = Object.keys(transm.alembics)
          // Add more Alembics
          for (let i = alembicKeys.length; i < transm.value + 1; i++) {
            var id = foundry.utils.randomID();
            transm.alembics[id] = {
              label: game.i18n.localize("MTA.NewAlembic"),
              completed: false,
              description: ""
            }
          }
          // Remove Alembics
          for (let i = alembicKeys.length; i > transm.value + 1; i--) {
            delete transm.alembics[alembicKeys[i - 1]];
          }
        }
      }
    } */
  }

  async _preUpdate(changed, options, user) {

    // This happens on the ephemeral entity Geist:
    if (this.system.sineaterActor) { // Changes to the Geist cause an update to the Sin-eater
      // Geist update -> Sin-eater update -> Geist prepareData

      if (changed?.system?.willpower && changed?.system?.essence) {
        const updateData = {};

        if (changed.system.willpower.value !== this.system.sineaterActor.system.willpower.value)
          updateData['system.willpower.value'] = changed.system.willpower.value;

        if (changed.system.willpower.max !== this.system.sineaterActor.system.willpower.max)
          updateData['system.willpower.max'] = changed.system.willpower.max;

        // plasm on the Geist is called essence
        if (changed.system.essence.value !== this.system.sineaterActor.system.plasm.value)
          updateData['system.plasm.value'] = changed.system.essence.value;

        if (changed.system.essence.max !== this.system.sineaterActor.system.plasm.max)
          updateData['system.plasm.max'] = changed.system.essence.max;

        // await the update, so that the values on the sheet don't flicker back and forth
        await this.system.sineaterActor.update(updateData);
      }
    }

    return super._preUpdate(changed, options, user);
  }

  async _onUpdate(data, options, userId) {
    if (this.system.geistActor) { // Updates to the Sin-eater causes the Geist to re-calculate stats and refresh
      this.system.geistActor.prepareData();
      if (this.system.geistActor.sheet) this.system.geistActor.sheet.render();
    }
    return super._onUpdate(data, options, userId);
  }

  /* -------------------------------------------- */
  /*  Socket Listeners and Handlers
  /* -------------------------------------------- */

  /** @override */
  _preCreate(data, user) {
    super._preCreate(data, user);

    const tokenUpdateData = {};
    if (data.prototypeToken?.actorLink === undefined) {
      tokenUpdateData["actorLink"] = true;
    }

    if (!foundry.utils.isEmpty(tokenUpdateData)) this.prototypeToken.updateSource(tokenUpdateData);
  }



  /** @override */
  static async create(data, options = {}) {
    const actor = await super.create(data, options);
    if (actor.type === "character") await actor.createWerewolfForms();

    return actor;
  }

  /**
   * Rolls a set of dice and calculates a result based on the provided traits and bonuses.
   *
   * @param {object} params - The parameters for the roll.
   * @param {string[]} [params.traits=[]] - An array of strings in the format "<trait-group>.<trait>", e.g. ["attributes_physical.strength", "skills_social.persuasion"])..
   * @param {number} [params.diceBonus=0] - A bonus to add to the dice roll.
   * @param {string} [params.rollName="Skill check"] - The name of the roll.
   * @param {string} [params.rollType="dialogue"] - The type of roll, either "dialogue" or "quick".
   *
   * @returns {number} The result of the roll.
   */
  roll({ traits = [], diceBonus = 0, rollName = "Skill check", rollType = "dialogue", damageRoll = false, lastTrait = null }) {

    const { dicePool, flavor, specialties, attribute, skill, isPhysicalRoll } = this.assembleDicePool({ traits, diceBonus });

    switch (rollType) {
      case 'dialogue':
        let title = "";
        title = rollName + ": " + flavor;
        let diceRoller = new DiceRollerDialogue({ dicePool, flavor: title, title, actorOverride: this, specialties, attribute, skill, lastTrait, isPhysicalRoll });
        diceRoller.render(true);
        break;
      case 'quick':
        DiceRollerDialogue.rollToChat({
          dicePool,
          flavor,
          actorOverride: this
        });
        break;
      default:
        return { flavor, dicePool };
    }
  }

  /**
   * Gets the value for a specific trait name.
   * Usage: getTraitValue("attributes_physical.strength")
   */
  getTraitValue(trait) {
    let ret = 0;
    ret = trait.split('.').reduce((o, i) => {
      if (o != undefined && o[i] != undefined) return o[i];
      else return undefined;
    }, this.system);

    if (!Number.isInteger(ret)) {
      if (typeof ret.max == 'number') ret = ret.max; // E.g. Willpower, ..
      else if (typeof ret.final == 'number') ret = ret.final;
      else if (typeof ret.value == 'number') ret = ret.value;
      else {
        ret = 0;
        console.warn("CofD: A roll attribute could not be resolved. " + cur);
      }
    }

    return ret;
  }


  /**
   * Assembles a dice pool from an array of traits into a concrete number,
   * alongside the flavor text describing the assembled dice pool.
   *
   * @param {object} params - The parameters for the roll.
   * @param {string[]} [params.traits=[]] - An array of strings in the format "<trait-group>.<trait>", e.g. ["attributes_physical.strength", "skills_social.persuasion"])..
   * @param {number} [params.diceBonus=0] - A bonus to add to the dice roll.
   * @param {number} [params.ignoreUnskilled=false] - Whether a 0 in a skill should not give a penalty.
   *
   * @returns {object} An object containing a dice pool and a flavor string.
   * @property {number} dicePool - The assembled dice pool as a number.
   * @property {string} flavor - A string representing the contents of the dice pool.
   */
  assembleDicePool({ traits = [], diceBonus = 0, ignoreUnskilled = false }) {
    const systemData = this.system;
    const itemList = this.items;

    //Get dice pool
    let dicePool = 0;
    let flavor = "";
    let isPhysicalRoll = false;
    let isSocialRoll = false;
    let isMentalRoll = false;
    let specialties = [];
    // The specific Attribute key (e.g. "composure", "dexterity") used to
    // choose the dice-roller window's background texture. First attribute
    // encountered wins; null when no Attribute is part of the pool.
    let attribute = null;
    // Likewise the first Skill key encountered (e.g. "stealth", "animalKen").
    // Used as the background fallback when no Attribute is in the pool.
    let skill = null;

    if (traits.length > 0) {
      // Get dice pool according to the item's dice pool attributes from the actor
      let diceFromTraits = traits ? traits.reduce((acc, cur) => {
        let split = cur.split('.');
        let isItem = split[0] === "item";

        let ret = 0;
        let flv = "";
        ret = split.reduce((o, i) => {
          if (o != undefined && o[i] != undefined) return o[i];
          else return undefined;
        }, systemData);

        console.log("HHH", traits, acc, cur, ret)
        if (!isItem) {
          // Append specialties
          if (ret.specialties && Array.isArray(ret.specialties)) {
            specialties.push(...ret.specialties);
          }

          if (!Number.isInteger(ret)) {
            if (typeof ret?.max == 'number') ret = ret.max; // E.g. Willpower, ..
            else if (typeof ret?.final == 'number') ret = ret.final;
            else if (typeof ret?.value == 'number') ret = ret.value;
            else {
              ret = 0;
              console.warn("CofD: A roll attribute could not be resolved. " + cur);
            }
          }
          if (split[0] === "disciplines_own") flv = split.reduce((o, i) => o[i], systemData).label;
          else flv = game.i18n.localize("MTA." + cur);

          // Apply penalty if character has 0 in a skill
          const skillType = split[0];
          if (!ignoreUnskilled && (skillType === "skills_physical" || skillType === "skills_social") && ret <= 0) {
            flv += " (unskilled)";
            ret -= 1;
          } else if (!ignoreUnskilled && skillType === "skills_mental" && ret <= 0) {
            flv += " (unskilled)";
            ret -= 3;
          }

          if (skillType === "skills_physical" || skillType === "attributes_physical")
            isPhysicalRoll = true;


          if (skillType === "skills_social" || skillType === "attributes_social")
            isSocialRoll = true;


          if (skillType === "skills_mental" || skillType === "attributes_mental")
            isMentalRoll = true;

          // Capture the specific attribute name (first one wins) so the
          // dice-roller dialog can pick a matching background texture.
          if (!attribute && (skillType === "attributes_physical"
                          || skillType === "attributes_social"
                          || skillType === "attributes_mental")) {
            attribute = split[1];
          }
          // Likewise capture the first Skill name, used as the background
          // fallback when the pool has no Attribute.
          if (!skill && (skillType === "skills_physical"
                      || skillType === "skills_social"
                      || skillType === "skills_mental")) {
            skill = split[1];
          }
        }
        else {
          const item = itemList.get(split[1]);
          if (item != undefined && CONFIG.MTA.item_score[item.type] != undefined) {
            flv = item.name;
            ret = item.system[CONFIG.MTA.item_score[item.type]];
          }
        }

        if (flavor) flavor += " + " + flv;
        else flavor = flv;
        return acc + ret;
      }, 0) : 0;
      dicePool += diceFromTraits;
    }
    else flavor = "Skill Check";

    if (diceBonus) {
      dicePool += diceBonus;
      flavor += diceBonus >= 0 ? ' (+' : ' (';
      flavor += diceBonus + ' bonus)';
    }

    const general = this.system.generalModifiers;
    if (general) {
      if (general.allDicePools.final) {
        dicePool += general.allDicePools.final;
        flavor += (general.allDicePools.final >= 0 ? ' (+' : ' (') + general.allDicePools.final + ' [all])';
      }

      if (isPhysicalRoll && general.physicalDicePools.final) {
        dicePool += general.physicalDicePools.final;
        flavor += (general.physicalDicePools.final >= 0 ? ' (+' : ' (') + general.physicalDicePools.final + ' [physical])';
      }

      if (isSocialRoll && general.socialDicePools.final) {
        dicePool += general.socialDicePools.final;
        flavor += (general.socialDicePools.final >= 0 ? ' (+' : ' (') + general.socialDicePools.final + ' [social])';
      }

      if (isMentalRoll && general.mentalDicePools.final) {
        dicePool += general.mentalDicePools.final;
        flavor += (general.mentalDicePools.final >= 0 ? ' (+' : ' (') + general.mentalDicePools.final + ' [mental])';
      }
    }

    console.log("AA", isPhysicalRoll, isSocialRoll, isMentalRoll, general.physicalDicePools.final, general.socialDicePools.final, general.mentalDicePools.final)

    let woundPenalty = this.getWoundPenalties();

    if (woundPenalty > 0) {
      dicePool -= woundPenalty;
      flavor += " (Wound penalties: -" + woundPenalty + ")";
    }

    return { dicePool, flavor, specialties, attribute, skill, isPhysicalRoll };
  }

  async werewolfTransform(form) {
    let updates = [];
    const forms = this.items.filter(item => item.type === "form");

    forms.forEach(f => {
      updates.push({ _id: f._id, 'system.effectsActive': f._id === form.id ? true : false });
    });
    form.roll()
    await this.updateEmbeddedDocuments("Item", updates);
    this.calculateAndSetMaxHealth();
  }

  /**
   * Creates the 5 standard werewolf forms for the actor, and
   * deletes all existing forms.
   */
  async createWerewolfForms() {
    //Add the 5 basic werewolf forms
    const itemData = [
      {
        name: "Hishu",
        type: "form",
        img: "systems/vampire-the-requiem-2e/icons/forms/Hishu.svg",
        system: {
          subname: "Human",
          effects: [
            { name: "derivedTraits.perception", value: 1, overFive: true }
          ],
          description_short: "Sheep's Clothing",
          description: "",
          effectsActive: true
        }
      },
      {
        name: "Dalu",
        type: "form",
        img: "systems/vampire-the-requiem-2e/icons/forms/Dalu.svg",
        system: {
          subname: "Near-Human",
          effects: [
            { name: "attributes_physical.strength", value: 1, overFive: true },
            { name: "attributes_physical.stamina", value: 1, overFive: true },
            { name: "attributes_social.manipulation", value: -1, overFive: true },
            { name: "derivedTraits.size", value: 1, overFive: true },
            { name: "derivedTraits.perception", value: 2, overFive: true }
          ],
          description_short: "Teeth/Claws +0L\nDefense vs. Firearms\nMild Lunacy\nBadass Motherfucker",
          description: ""
        }
      },
      {
        name: "Gauru",
        type: "form",
        img: "systems/vampire-the-requiem-2e/icons/forms/Gauru.svg",
        system: {
          subname: "Wolf-Man",
          effects: [
            { name: "attributes_physical.strength", value: 3, overFive: true },
            { name: "attributes_physical.dexterity", value: 1, overFive: true },
            { name: "attributes_physical.stamina", value: 2, overFive: true },
            { name: "derivedTraits.size", value: 2, overFive: true },
            { name: "derivedTraits.perception", value: 3, overFive: true }
          ],
          description_short: "Teeth/Claws +2L\n(Initiative +3)\nDefense vs. Firearms\nFull Lunacy\nRegeneration\nRage\nPrimal Fear",
          description: ""
        }
      },
      {
        name: "Urshul",
        type: "form",
        img: "systems/vampire-the-requiem-2e/icons/forms/Urshul.svg",
        system: {
          subname: "Near-Wolf",
          effects: [
            { name: "attributes_physical.strength", value: 2, overFive: true },
            { name: "attributes_physical.dexterity", value: 2, overFive: true },
            { name: "attributes_physical.stamina", value: 2, overFive: true },
            { name: "attributes_social.manipulation", value: -1, overFive: true },
            { name: "derivedTraits.size", value: 1, overFive: true },
            { name: "derivedTraits.speed", value: 3, overFive: true },
            { name: "derivedTraits.perception", value: 3, overFive: true }
          ],
          description_short: "Teeth +2L/Claws +1L\nDefense vs. Firearms\nModerate Lunacy\nWeaken the Prey",
          description: ""
        }
      },
      {
        name: "Urhan",
        type: "form",
        img: "systems/vampire-the-requiem-2e/icons/forms/Urhan.svg",
        system: {
          subname: "Wolf",
          effects: [
            { name: "attributes_physical.dexterity", value: 2, overFive: true },
            { name: "attributes_physical.stamina", value: 1, overFive: true },
            { name: "attributes_social.manipulation", value: -1, overFive: true },
            { name: "derivedTraits.size", value: -1, overFive: true },
            { name: "derivedTraits.speed", value: 3, overFive: true },
            { name: "derivedTraits.perception", value: 4, overFive: true }
          ],
          description_short: "Teeth +1L\nChase Down",
          description: ""
        }
      }
    ];
    let oldForms = this.items.filter(item => item.type === "form").map(item => item.id);
    if (oldForms) await this.deleteEmbeddedDocuments("Item", oldForms);
    await this.createEmbeddedDocuments("Item", itemData);
  }

  //Search for Merit Defensive Combat
  _getDefenseSkill() {
    const systemData = this.system;
    let athleticsSkill = systemData.skills_physical.athletics.final;

    const hasBrawlMerit = this.hasSpecialEffect("defenseBrawl");
    let hasWeaponryMerit = this.hasSpecialEffect("defenseWeaponry");
    if (hasWeaponryMerit) {
      hasWeaponryMerit = this.items.find(ele => {
        return ele.system.equipped && ele.type === "melee";
      });
    }

    const defenseAthletics = this.hasSpecialEffect("defenseAthletics");
    if (!defenseAthletics && game.settings.get("vampire-the-requiem-2e", "lowerDefense")) athleticsSkill = 0;

    const brawlSkill = hasBrawlMerit ? systemData.skills_physical.brawl.final : 0;
    const weaponrySkill = hasWeaponryMerit ? systemData.skills_physical.weaponry.final : 0;
    return Math.max(brawlSkill, weaponrySkill, athleticsSkill);
  }

  /** Returns the attribute limit of the character (e.g. Gnosis for mages) **/
  getTraitMaximum(traitName) {
    const systemData = this.system;
    if (this.type !== "character")
      return 999;

    const powerStats = { //TODO: Put in config
      mortal: 5,
      sleepwalker: 5,
      alchemist: 5,
      mage: systemData.mage_traits.gnosis?.final,
      scelesti: systemData.mage_traits.gnosis?.final,
      proximi: 5,
      vampire: systemData.vampire_traits.bloodPotency?.final,
      ghoul: systemData.vampire_traits.bloodPotency?.final,
      changeling: systemData.changeling_traits.wyrd?.final,
      fetch: systemData.changeling_traits.wyrd?.final,
      huntsman: Math.min(10, 4 + systemData.changeling_traits.wyrd.final),
      hobgoblin: Math.min(10, 4 + systemData.changeling_traits.wyrd.final),
      trueFae: systemData.changeling_traits.wyrd?.final,
      werewolf: systemData.werewolf_traits.primalUrge?.final,
      demon: systemData.demon_traits.primum?.final,
      hunter: 5,
      sinEater: systemData.sineater_traits.synergy?.final,
      mummy: systemData.mummy_traits.sekhem?.final,
      promethean: systemData.promethean_traits.azoth?.final,
      horror: 999 /* Math.min(10, systemData.potency - 1 + 5) */ // These are only for permanent dots in the rules..
    };

    if(systemData.typeConf.sheet.pandoranRank) {
      if(traitName === "manipulation" || traitName === "intelligence") {
        if(systemData.pandoranType === game.i18n.localize(CONFIG.MTA.pandoranTypes.sublimatus))
          return CONFIG.MTA.pandoran_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.pandoranRank - 1))].sublimatiMax;
        else return 1;
      }
      else
        return CONFIG.MTA.pandoran_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.pandoranRank - 1))].maxAttribute;
    }

    if (!powerStats[systemData.characterVariant]) {
      return 5;
    }
    return Math.max(5, powerStats[systemData.characterVariant]);
  }

  openMageSightDialogue() {
    const listItems = Object.keys(CONFIG.MTA.arcana).reduce((acc, arcanum) => `${acc}
    <li style="display: flex; align-items: center; margin-bottom: 10px;">
    <span style="flex: 0 0 4rem;">${arcanum}</span>
    <label class="equipped checkBox" style="margin-left: 10px;">
      <input data-arcanum="${arcanum}" type="checkbox">
      <span></span>
    </label>
  </li>`, '');


    const getArcana = (html) => {
      const arcanaChecked = {};
      html.find('li').each(function () {
        const arcanum = $(this).find('span').text().trim();
        const isChecked = $(this).find('input').prop('checked');
        arcanaChecked[arcanum] = isChecked;
      });
      const trueArcanaList = Object.keys(arcanaChecked).filter(arcanum => arcanaChecked[arcanum]);
      return trueArcanaList;
    };

    const getManaCost = (arcanaList) => {
      let manaCost = 0;
      for (const name of arcanaList) {
        const arcanum = CONFIG.MTA.arcana_gross[name] ? this.system.arcana_gross[name] : this.system.arcana_subtle[name];
        if (!arcanum.isRuling) manaCost++;
      }
      return manaCost;
    }

    let d = new Dialog({
      title: "Mage Sight",
      content: `<ul>
        ${listItems}
        <div>Mana cost: <input type="number" name="manacost" value=0 readonly/></div>
      </ul>`,
      render: html => {
        html.find('input[type="checkbox"]').on("change", () => {
          const arcanaList = getArcana(html);
          const manaCost = getManaCost(arcanaList);

          html.find('input[name="manacost"]').val(manaCost);

        });
      },
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "OK",
          callback: html => {
            const arcanaList = getArcana(html);
            const manaCost = getManaCost(arcanaList);

            const newMana = this.system.mana.value - manaCost;
            if (newMana < 0) return ui.notifications.warn('Not enough Mana!');

            const listItems = arcanaList.map(arcanum => `<li>${arcanum}</li>`).join('');
            const messageContent = `<div>Mage Sight:</div><ul>${listItems}</ul><div>Mana cost: ${manaCost}</div>`;

            const chatData = {
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: messageContent
            };
            ChatMessage.create(chatData);
            this.update({ 'system.mana.value': newMana })
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "cancel"
    });
    d.render(true);
  }

  /**
   * Executes a perception roll using Composure + Wits.
   * if hidden is set, the roll is executed as a blind GM roll.
   */
  rollPerception(quickRoll, hidden) {
    const data = this.system;
    let dicepool = data.derivedTraits.perception.final;
    let flavor = "Perception";
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      title: flavor,
      blindGMRoll: hidden,
      actorOverride: this
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: flavor,
        blindGMRoll: true,
        actorOverride: this,
        rollContext: "perception"
      });
      diceRoller.render(true);
    }
  }

  rollGeneralDicepool(flavor, dicepool, quickRoll, hidden) {
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      title: this.name + " - " + flavor,
      blindGMRoll: hidden,
      actorOverride: this
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: this.name + " - " + flavor,
        blindGMRoll: true,
        actorOverride: this
      });
      diceRoller.render(true);
    }
  }

  rollCombatDicepool(flavor, dicepool, quickRoll, hidden) {
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      comment: flavor,
      title: this.name + " - " + flavor,
      blindGMRoll: hidden,
      actorOverride: this,
      damageRoll: true
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        comment: flavor,
        title: this.name + " - " + flavor,
        blindGMRoll: true,
        actorOverride: this,
        damageRoll: true,
        itemImg: 'systems/vampire-the-requiem-2e/icons/placeholders/combat_dice_pool.svg'
      });
      diceRoller.render(true);
    }
  }

  damage(damageAmount, damagetype, resistant = false) {
    if (damageAmount === 0) return;
    console.log("Damaging " + this.name + " by " + damageAmount + " " + damagetype + " damage");
    if (damagetype === "bashing") damagetype = "value"

    if (this.system.health[damagetype] != undefined) {
      let updateData = {};
      if (damageAmount > 0) {

        let carryOver_lethal = 0;
        let carryOver_aggravated = 0;

        if (damagetype === 'aggravated') {
          updateData[`system.health.aggravated`] = Math.max(0, this.system.health.aggravated - damageAmount);
          updateData[`system.health.lethal`] = Math.max(0, this.system.health.lethal - damageAmount);
          updateData[`system.health.value`] = Math.max(0, this.system.health.value - damageAmount);
        }
        else if (damagetype === 'lethal') {
          carryOver_aggravated = - Math.min(0, this.system.health.lethal - damageAmount);

          if (carryOver_aggravated > 0) updateData[`system.health.aggravated`] = Math.max(0, this.system.health.aggravated - carryOver_aggravated);
          updateData[`system.health.lethal`] = Math.max(0, this.system.health.lethal - damageAmount);
          updateData[`system.health.value`] = Math.max(0, this.system.health.value - damageAmount);
        }
        else if (damagetype === 'value') {
          carryOver_lethal = - Math.min(0, this.system.health.value - damageAmount);
          carryOver_aggravated = - Math.min(0, this.system.health.lethal - carryOver_lethal);

          if (carryOver_aggravated > 0) updateData[`system.health.aggravated`] = Math.max(0, this.system.health.aggravated - carryOver_aggravated);
          if (carryOver_lethal > 0) updateData[`system.health.lethal`] = Math.max(0, this.system.health.lethal - damageAmount);
          updateData[`system.health.value`] = Math.max(0, this.system.health.value - damageAmount);
        }

        // Apply resistant damage
        if (resistant) {
          let marked = "";
          let inflictedBashing = damagetype === "value" ? damageAmount - carryOver_lethal - carryOver_aggravated : 0;
          let inflictedLethal = (damagetype === "lethal" ? damageAmount - carryOver_aggravated : 0) + carryOver_lethal;
          let inflictedAggravated = (damagetype === "aggravated" ? damageAmount : 0) + carryOver_aggravated;

          const offsetBashing = this.system.health.max - (updateData[`system.health.lethal`] ?? this.system.health.lethal);
          const offsetLethal = this.system.health.max - (updateData[`system.health.aggravated`] ?? this.system.health.aggravated);

          updateData['system.health.marked'] = this.system.health.marked.split(',').map((cur, i) => {
            if (cur === "1") { return "1"; }
            else {
              if (inflictedAggravated) {
                inflictedAggravated--;
                return "1";
              }
              else if (inflictedLethal && i >= offsetLethal) {
                inflictedLethal--;
                return "1";
              }
              else if (inflictedBashing && i >= offsetBashing) {
                inflictedBashing--;
                return "1";
              }
              return "0";
            }
          }).join(',');
        }
      }
      else { // Negative damage == healing
        if (damagetype === 'value') updateData[`system.health.value`] = Math.min(this.system.health.lethal, this.system.health.value - damageAmount);
        else if (damagetype === 'lethal') {
          updateData[`system.health.lethal`] = Math.min(this.system.health.aggravated, this.system.health.lethal - damageAmount);
          updateData[`system.health.value`] = Math.min(updateData[`system.health.lethal`], this.system.health.value - damageAmount);
        }
        else if (damagetype === 'aggravated') {
          updateData[`system.health.aggravated`] = Math.min(this.system.health.max, this.system.health.aggravated - damageAmount);
          updateData[`system.health.lethal`] = Math.min(updateData[`system.health.aggravated`], this.system.health.lethal - damageAmount);
          updateData[`system.health.value`] = Math.min(updateData[`system.health.lethal`], this.system.health.value - damageAmount);
        }
      }

      return this.update(updateData);
    }
  }

  getAllSpecialEffects(effectName) {
    return this.system.specialEffects.filter(e => e.name === effectName);
  }

  getSpecialEffect(effectName) {
    return this.system.specialEffects.find(e => e.name === effectName);
  }

  hasSpecialEffect(effectName) {
    return this.system.specialEffects.some(e => e.name === effectName);
  }

  /**
   * 
   */
  areAnyItemsActive(...args) {
    for (const item of this.items) {
      if (args.includes(item.name) && item.system.effectsActive) {
        return true;
      }
    }
    return false;
  }

  getWoundPenalties() {
    const systemData = this.system;
    let woundPenalty = 0;
    if (systemData.health.value <= 3 && !(this.type === "ephemeral")) {
      woundPenalty = 2 - (systemData.health.value - 1);
      // Check for Iron Stamina Merit
      let ironStamina = this.getSpecialEffect("reducedWoundPenalty");
      if (ironStamina) woundPenalty = Math.max(0, woundPenalty - ironStamina.rating);
    }
    if(this.system.typeConf.sheet.noWoundPenalties)
      woundPenalty = 0;
    return woundPenalty;
  }

  getStabilityPenalties() {
    const systemData = this.system;
    let stabilityPenalty = 0;
    if (systemData.deviant_traits.stability.value <= 5) {
      stabilityPenalty = 4 - (systemData.deviant_traits.stability.value - 1);
    }

    let scarMagnitude = 0
    if (systemData.deviant_traits.stability.medium <= 5) {
      scarMagnitude = 4 - (systemData.deviant_traits.stability.medium - 1);
    }

    let newScars = 0
    if (systemData.deviant_traits.stability.major <= 5) {
      newScars = 4 - (systemData.deviant_traits.stability.major - 1);
    }

    let endStage = systemData.deviant_traits.stability.major <= 0;

    return {stabilityPenalty, scarMagnitude, newScars, endStage};
  }

  // 
  /**
   * Gets the Perception bonus dependent on Clarity (only Changelings).
   * In contrast to wound getWoundPenalties, penalties here are negative.
   */
  getClarityBonus() {
    const systemData = this.system;
    if (!systemData.typeConf.sheet.clarity) return 0;
    let clarity = systemData.clarity.value;
    let clarityMax = systemData.clarity.max;

    let diceBonus = (clarity < 3) ? -2 : (clarity < 5) ? -1 : 0;
    if (clarity === clarityMax) diceBonus += 2;
    if (clarity <= 0) diceBonus = -99;

    return diceBonus;
  }

  castSpell(spell) {
    const itemData = spell ? foundry.utils.duplicate(spell.system) : {};
    if (spell) {
      if (spell.system.isRote) itemData.castRote = true;
      else if (spell.system.isPraxis) itemData.castPraxis = true;
    }

    let activeSpell = new CONFIG.Item.documentClass({
      system: foundry.utils.mergeObject(game.model.Item["activeSpell"], itemData, {
        inplace: false
      }),
      name: spell ? spell.name : game.i18n.localize('MTA.ImprovisedSpell'),
      img: spell ? spell.img : '',
      type: "activeSpell"
    });

    activeSpell.img = spell ? spell.img : '';

    let spellDialogue = new ImprovisedSpellDialogue(activeSpell, this);
    spellDialogue.render(true);
  }


  /**
   * @param {*} haunt 
   * @param {any[]} [keys=[]] - The keys unlocked with the haunt.
   * @param {boolean} [hasResonance=false] - whether the keys used have synergy with the haunt (gives exceptional on 3)
   * @param {boolean} [spendWillpower=false] - whether Willpower should be spent to avoid the Doomed condition.
   */
  async activateHauntPower(haunt, keys = [], spendWillpower = false, hasResonance = false) {
    if (!haunt) return;
    const firstKey = keys ? keys[0] : undefined;
    const keyAmount = keys ? keys.length : 0;

    console.log(haunt, keys, spendWillpower, hasResonance)

    // Unlocking keys & gain free plasm
    let unlockAttributeValue = 0;

    if (firstKey) {
      const unlockAttribute = firstKey.system.unlockAttribute;
      if (this.system.attributes_physical[unlockAttribute])
        unlockAttributeValue = this.system.attributes_physical[unlockAttribute].final;
      else if (this.system.attributes_social[unlockAttribute])
        unlockAttributeValue = this.system.attributes_social[unlockAttribute].final;
      else if (this.system.attributes_mental[unlockAttribute])
        unlockAttributeValue = this.system.attributes_mental[unlockAttribute].final;
    }

    if (unlockAttributeValue) {
      this.update({ 'system.plasm.value': this.system.plasm.value + unlockAttributeValue * keyAmount });
      this.createSimpleMessage(`+ ${unlockAttributeValue} ${game.i18n.localize("MTA.Plasm")} (${firstKey.name})`);
    }


    let additionalFlavor = keyAmount ? keys.reduce((acc, cur, index) => acc + cur.name + (index < keyAmount - 1 ? ", " : "]"), "[") : "";
    if (spendWillpower) additionalFlavor += " [" + game.i18n.localize("MTA.useWillpower") + "]";
    if (hasResonance) additionalFlavor += " [" + game.i18n.localize("MTA.hasResonance") + "]";

    // Roll haunt
    await haunt.roll(undefined, true, { diceRollBonus: unlockAttributeValue, exceptionalTarget: hasResonance ? 3 : 5, additionalFlavor });

    // Figure out Doomed condition
    const rollResult = this.getFlag('vampire-the-requiem-2e', 'rollReturn');

    if (keyAmount && !rollResult.exceptionalSuccess) {
      if (spendWillpower && this.system.willpower.value > 0) { // Spend willpower to avoid the condition
        this.update({ 'system.willpower.value': this.system.willpower.value - 1 });
      }
      else { // No willpower nor exceptional success -> add 1 doomed condition per key
        const conditionData = [];
        for (let i = 0; i < keyAmount; i++) {
          const k = keys[i];
          conditionData.push({
            name: `${game.i18n.localize("MTA.DoomedCondition")} (${k.name})`,
            type: "condition",
            system: {
              description: k.system.doom
            }
          });
          this.createSimpleMessage(`${game.i18n.localize("MTA.DoomedCondition")} (${firstKey.name})`);
        }
        this.createEmbeddedDocuments("Item", conditionData);
      }
    }
  }

  async utterUtterance(utterance) {
    let utteranceDialog = new UtteranceDialogue(this, utterance);
    utteranceDialog.render(true);
  }

  unlockSineaterKey(item) {
    const unlockAttribute = item.system.unlockAttribute;
    let unlockAttributeValue;
    if (this.system.attributes_physical[unlockAttribute])
      unlockAttributeValue = this.system.attributes_physical[unlockAttribute].final;
    else if (this.system.attributes_social[unlockAttribute])
      unlockAttributeValue = this.system.attributes_social[unlockAttribute].final;
    else if (this.system.attributes_mental[unlockAttribute])
      unlockAttributeValue = this.system.attributes_mental[unlockAttribute].final;

    if (!unlockAttributeValue) return;

    // Gain plasm
    this.update({ 'system.plasm.value': this.system.plasm.value + unlockAttributeValue })

    // Gain doomed
    const conditionData = [{
      name: `Doomed (${item.name})`,
      type: "condition",
      system: {
        description: item.system.doom
      }
    }];
    this.createEmbeddedDocuments("Item", conditionData);
    this.createSimpleMessage(`+ ${unlockAttributeValue} ${game.i18n.localize("MTA.Plasm")} (${item.name})`);
    this.createSimpleMessage(`${game.i18n.localize("MTA.DoomedCondition")} (${item.name})`);
  }

  createSimpleMessage(messageContent) {
    const chatData = {
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: messageContent
    };
    ChatMessage.create(chatData);
  }

  /**
   * Executes a breaking point roll using Resolve + Composure.
   * if hidden is set, the roll is executed as a blind GM roll.
   */
  rollBreakingPoint(quickRoll, hidden) {
    const systemData = this.system;
    let dicepool = systemData.attributes_social.composure.final + systemData.attributes_mental.resolve.final;
    let penalty = systemData.integrity >= 8 ? 2 : systemData.integrity >= 6 ? 1 : systemData.integrity <= 1 ? -2 : systemData.integrity <= 3 ? -1 : 0;
    if (this.system.characterType === "hunter") penalty = 0;
    dicepool += penalty;
    let flavor = "Breaking Point: Resolve + Composure + " + penalty;
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      title: flavor,
      blindGMRoll: hidden
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: flavor,
        blindGMRoll: hidden
      });
      diceRoller.render(true);
    }
  }

  /**
   * Executes a dissonance roll using Integrity.
   * if hidden is set, the roll is executed as a blind GM roll.
   */
  rollDissonance(quickRoll, hidden) {
    const systemData = this.system;
    let dicepool = systemData.integrity;
    let flavor = "Dissonance: Integrity (withstood by spell dots, rank, soul stones, etc.)";
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      title: flavor,
      blindGMRoll: hidden
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: flavor,
        blindGMRoll: hidden
      });
      diceRoller.render(true);
    }
  }

  /**
   * Executes a cover compromise roll using Wits + Manipulation.
   * if hidden is set, the roll is executed as a blind GM roll.
   */
  rollCompromise(quickRoll, hidden) {
    const systemData = this.system;
    let dicepool = systemData.attributes_mental.wits.final + systemData.attributes_social.manipulation.final;
    let penalty = systemData.currentCover >= 8 ? 2 : systemData.currentCover >= 6 ? 1 : systemData.currentCover <= 1 ? -2 : systemData.currentCover <= 3 ? -1 : 0;
    dicepool += penalty;
    let flavor = "Compromise: Wits + Manipulation + " + penalty;
    if (quickRoll) DiceRollerDialogue.rollToChat({
      dicePool: dicepool,
      flavor: flavor,
      title: flavor,
      blindGMRoll: hidden
    });
    else {
      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: flavor,
        blindGMRoll: hidden
      });
      diceRoller.render(true);
    }
  }

  /**
   * Converts the character's stats into dream stats, 
   * depending on the template.
   */
  dreaming(unequipItems) {
    const systemData = this.system;
    const updateData = {};
    updateData['system.isDreaming'] = !systemData.isDreaming;
    if (updateData['system.isDreaming']) {
      // Start dreaming. Replace attributes and health.
      if (systemData.typeConf.dreamingPower === "maxIntelligencePresence") updateData['system.attributes_physical_dream.power.value'] = Math.max(systemData.attributes_mental.intelligence.final, systemData.attributes_social.presence.final);
      else if (systemData.typeConf.dreamingPower === "Presence") updateData['system.attributes_physical_dream.power.value'] = systemData.attributes_social.presence.final;
      else updateData['system.attributes_physical_dream.power.value'] = systemData.attributes_mental.intelligence.final;

      if (systemData.typeConf.dreamingFinesse === "maxWitsManipulation") updateData['system.attributes_social_dream.finesse.value'] = Math.max(systemData.attributes_mental.wits.final, systemData.attributes_social.manipulation.final);
      else if (systemData.typeConf.dreamingFinesse === "Manipulation") updateData['system.attributes_social_dream.finesse.value'] = systemData.attributes_social.manipulation.final;
      else updateData['system.attributes_social_dream.finesse.value'] = systemData.attributes_mental.wits.final;

      if (systemData.typeConf.dreamingResistance === "maxResolveComposure") updateData['system.attributes_mental_dream.resistance.value'] = Math.max(systemData.attributes_mental.resolve.final, systemData.attributes_social.composure.final);
      else if (systemData.typeConf.dreamingResistance === "Composure") updateData['system.attributes_mental_dream.resistance.value'] = systemData.attributes_social.composure.final;
      else updateData['system.attributes_mental_dream.resistance.value'] = systemData.attributes_mental.resolve.final;

      // Slightly unusual: to make sure that token's health bars stll show the currently important health,
      // the normal health is backed up into dream_health, and health is replaced, instead of introducing
      // a new type of health as a new trait. Dream health is not backed up, as I believe that's not a thing.
      updateData['system.dream_health'] = systemData.health;
      let newMax = 0;
      if (systemData.typeConf.dreamingHealth === "wyrdClarity") newMax = systemData.clarity.value;
      else newMax = updateData['system.attributes_mental_dream.resistance.value'];

      //  Add Gnosis/Wyrd derived maximum
      if (systemData.typeConf.dreamingHealth === "gnosisResistance") newMax += Math.max(5, systemData.mage_traits.gnosis.final);
      else if (systemData.typeConf.dreamingHealth === "wyrdClarity") newMax += Math.max(5, systemData.changeling_traits.wyrd.final);
      else newMax += 5;

      updateData['system.health'] = {
        max: newMax,
        lethal: newMax,
        aggravated: newMax,
        value: newMax
      }

    }
    else {
      // Dreaming ended. Reset health.
      if (systemData.dream_health) updateData['system.health'] = systemData.dream_health;
      let amnion = this.items.filter(item => item.name === "Amnion");
      if (amnion) this.deleteEmbeddedDocuments("Item", amnion.map(item => item.id));
    }
    if (unequipItems) {
      let equipped = this.items.filter(item => item.system.equipped);
      if (equipped) {
        this.updateEmbeddedDocuments("Item", equipped.map(item => {
          return {
            _id: item.id,
            'system.equipped': false
          }
        }));
      }
    }
    this.update(updateData);
  }

  scourParadox() {
    if (!this.system.patternParadox) return;
    this.damage(this.system.patternParadox, "lethal", true);
    this.update({ "system.patternParadox": 0 });
  }

  /**
   * Daysleep: when a vampire rises for the night they expend a point of Vitae.
   * Posts a chat message, and if the character has injuries, a follow-up
   * reminder about automatic healing during daysleep (the vampire spends
   * Vitae unconsciously, 1 per 2 bashing or 1 lethal, 5 per aggravated;
   * spend 1 Willpower per wound to preserve a wound through the sleep).
   */
  async daysleep() {
    const sys = this.system;
    const currentVitae = sys.vitae?.value ?? 0;
    const newVitae = Math.max(0, currentVitae - 1);
    // Daysleep also resets the Phases of Night marker back to Early Dawn,
    // regardless of whether the homebrew setting is currently enabled — the
    // stored phase index always lives on the actor.
    const update = {
      "system.vitae.value": newVitae,
      "system.phaseOfNight": 0,
      // Blush of Life (homebrew) reverts on daysleep — the night is over and
      // the trick wears off.
      "flags.vampire-the-requiem-2e.blushActive": false
    };

    // Homebrew alternative Willpower: rising for the night also restores
    // 1 Willpower (capped at the pool maximum).
    let gainedWillpower = false;
    if (game.settings.get("vampire-the-requiem-2e", "homebrewWillpower") && sys.willpower) {
      const curWP = Number(sys.willpower.value ?? 0);
      const maxWP = Number(sys.willpower.max ?? curWP);
      if (curWP < maxWP) {
        update["system.willpower.value"] = curWP + 1;
        gainedWillpower = true;
      }
    }
    await this.update(update);

    const speaker = ChatMessage.getSpeaker({ actor: this });
    await ChatMessage.create({
      speaker,
      content: `<p><strong>${this.name}</strong> wakes and expends a point of Vitae`
        + `${gainedWillpower ? " and recovers 1 Willpower" : ""}.</p>`
    });

    const damaged = sys.health && (sys.health.value ?? sys.health.max) < (sys.health.max ?? 0);
    if (damaged) {
      await ChatMessage.create({
        speaker,
        content: `<p><em><strong>${this.name}</strong> has injuries &mdash; during daysleep the Beast heals them automatically (1 Vitae per 2 bashing or 1 lethal; 5 Vitae per aggravated). Spend 1 Willpower per wound to preserve it through the rest.</em></p>`
      });
    }
  }

  /**
   * Homebrew Phases of Night: advance (or rewind) the actor's position on the
   * ten-segment night ribbon. Wraps around at both ends so the right arrow at
   * Late Dawn returns to Early Dawn and the left arrow at Early Dawn jumps to
   * Late Dawn.
   * @param {number} direction +1 to advance, -1 to rewind. Other values are
   *                           coerced to +1.
   */
  async advancePhaseOfNight(direction = 1) {
    const step = direction < 0 ? -1 : 1;
    const current = Number(this.system?.phaseOfNight ?? 0) || 0;
    // ((x % 10) + 10) % 10 gives a non-negative modulus for negative inputs.
    const next = (((current + step) % 10) + 10) % 10;
    // Also clear the Blush of Life flag — the night has moved on.
    await this.update({
      "system.phaseOfNight": next,
      "flags.vampire-the-requiem-2e.blushActive": false
    });
  }

  /**
   * Look up a Condition item by name in the world's item directory and add a
   * copy to this actor. The user keeps their Conditions in the world (no
   * shipped compendium), so this resolves against `game.items`. If no match
   * is found, posts a chat note for manual application instead.
   * @param {string} name  The Condition's name (case-insensitive).
   */
  async applyConditionByName(name) {
    if (!name) return;
    const cond = game.items.find(i => i.type === "condition"
      && i.name?.toLowerCase() === String(name).toLowerCase());
    if (cond) {
      await this.createEmbeddedDocuments("Item", [cond.toObject()]);
      ui.notifications.info(`${cond.name} Condition added to ${this.name}.`);
      return;
    }
    // No matching Condition item in this world: post a short explanation of
    // the Condition instead. Don't mention missing assets — that's noise
    // during play.
    const blurb = CONDITION_BLURBS[String(name).toLowerCase()];
    const tone = blurb?.tone === "good" ? "messy-success" : "messy-failure";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="vtr-roll"><div class="hunger-messy ${tone}">`
        + `<span class="hunger-messy-title">${name} Condition</span>`
        + (blurb?.text ? `<span class="hunger-messy-text">${blurb.text}</span>` : "")
        + `</div></div>`
    });
  }

  /**
   * Render a dice-roller-styled Dialog for the Frenzy / Lashing Out /
   * Detachment flows so they share the look of the main dice roller: the dark
   * theme and the matching ui/dice_bg_<variant>.png texture behind a
   * kUltraBlock body.
   *
   * The styling classes and the background image are stamped directly onto the
   * rendered window in the `render` callback — passing `classes` through the
   * appv1 Dialog options does not reliably reach the window element.
   * @param {object}   opts
   * @param {string}   opts.title    Window title.
   * @param {string}   opts.variant  Matches ui/dice_bg_<variant>.png — one of
   *                                 "frenzy" | "lashing_out" | "detachment".
   * @param {string}   opts.body     Inner HTML, wrapped in a kUltraBlock.
   * @param {Function} opts.onRoll   Async callback(html) for the Roll button.
   */
  _renderRiteDialog({ title, variant, body, onRoll }) {
    const bgUrl = `systems/vampire-the-requiem-2e/ui/dice_bg_${variant}.webp`;
    new foundry.appv1.api.Dialog({
      title,
      content: `<div class="kUltraBlock vtr-rite-block">${body}</div>`,
      buttons: {
        roll: { icon: '<i class="fas fa-dice-d10"></i>', label: "Roll", callback: onRoll },
        cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
      },
      default: "roll",
      render: (html) => {
        const el = html instanceof HTMLElement ? html : html?.[0];
        const root = el?.closest(".window-app, .application, .app");
        if (!root) return;
        root.classList.add("mta-sheet", "theme-dark", "vtr-rite-dialog", `vtr-rite-${variant}`);
        const wc = root.querySelector(".window-content");
        if (wc) {
          // Set every background longhand inline so the whole texture fills
          // the window regardless of CSS load order or specificity.
          wc.style.backgroundColor = "#050505";
          wc.style.backgroundImage = `url("${bgUrl}")`;
          wc.style.backgroundSize = "100% 100%";
          wc.style.backgroundRepeat = "no-repeat";
          wc.style.backgroundPosition = "center";
        }
      }
    }, {
      classes: ["mta-sheet", "vtr-rite-dialog", `vtr-rite-${variant}`],
      width: 440
    }).render(true);
  }

  /**
   * Frenzy resistance (VtR 2E p. 104). Opens a dialog for the provocation
   * modifier and any Willpower spent fighting the Beast, rolls Resolve +
   * Composure, and posts an outcome card. The Gangrel bane caps the pool at
   * Humanity dots. Entering frenzy grants a Beat.
   */
  async rollFrenzy() {
    const sys = this.system;
    const resolve = sys.attributes_mental?.resolve?.final ?? 0;
    const composure = sys.attributes_social?.composure?.final ?? 0;
    const basePool = resolve + composure;
    const humanity = Number(sys.integrity ?? 10);
    const isGangrel = String(sys.clan ?? "").toLowerCase() === "gangrel";

    const body = `
      <p class="vtr-rite-summary">Resolve + Composure = <strong>${basePool}</strong>${isGangrel
        ? ` <em>(Gangrel bane: pool capped at Humanity ${humanity})</em>` : ""}</p>
      <dl>
        <dt>Provocation modifier:</dt>
        <dd><input type="number" name="modifier" value="0" autofocus></dd>
        <dt>Willpower spent fighting (turns) &mdash; +1 die each:</dt>
        <dd><input type="number" name="willpower" value="0" min="0"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: "Resist Frenzy",
      variant: "frenzy",
      body,
      onRoll: async (html) => {
        const modifier = Math.round(Number(html.find('[name="modifier"]').val()) || 0);
        const willpower = Math.max(0, Math.round(Number(html.find('[name="willpower"]').val()) || 0));
        let pool = basePool + modifier + willpower;
        if (isGangrel) pool = Math.min(pool, humanity);
        pool = Math.max(0, pool);

        const rollReturn = {};
        await DiceRollerDialogue.rollToChat({
          dicePool: pool,
          flavor: "Frenzy Resistance",
          title: "Frenzy Resistance",
          actorOverride: this,
          hungerDice: 0,
          rollReturn
        });
        await this._resolveFrenzyOutcome(rollReturn.roll, willpower);
      }
    });
  }

  /**
   * Interpret a frenzy-resistance roll and post the outcome card.
   * @param {Roll} roll        The resolved roll (from rollToChat's rollReturn).
   * @param {number} willpower Willpower spent fighting, for the exceptional note.
   */
  async _resolveFrenzyOutcome(roll, willpower = 0) {
    const hits = Math.max(0, roll?.total ?? 0);
    let cls, title, body, conditionBtn = "";

    if (roll?.dramaticFailure) {
      cls = "messy-failure";
      title = "Frenzy! &mdash; Dramatic failure";
      body = "The Beast seizes control. The frenzy cannot end until you reach a breaking point. Take a Beat (or two, if you turn the failure into a dramatic failure).";
      await this.addProgress("Entered frenzy", 1, 0);
    } else if (hits < 1) {
      cls = "messy-failure";
      title = "Frenzy!";
      body = "You succumb &mdash; the Beast decides what it wants. Take a Beat.";
      await this.addProgress("Entered frenzy", 1, 0);
    } else if (roll?.exceptionalSuccess || hits >= 5) {
      cls = "messy-success";
      title = "Frenzy resisted &mdash; Exceptional success";
      body = `You master the Beast. Regain a point of spent Willpower${willpower > 0
        ? `, plus the ${willpower} Willpower spent fighting the frenzy this scene` : ""}.`;
    } else {
      cls = "messy-success";
      title = "Frenzy resisted";
      body = "You hold the Beast back, but are left with the Tempted Condition.";
      conditionBtn = `<button type="button" class="vtr-frenzy-button" `
        + `data-vtr-apply-condition="Tempted" data-actor-id="${this.id}">Apply Tempted Condition</button>`;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="vtr-roll"><div class="hunger-messy ${cls}">`
        + `<span class="hunger-messy-title">${title}</span>`
        + `<span class="hunger-messy-text">${body}</span>`
        + conditionBtn
        + `</div></div>`
    });
  }

  /**
   * Lashing Out with the Predatory Aura (VtR 2E p. 91-92). Opens a dialog to
   * choose the aspect of the Beast, rolls Blood Potency + the matching Power
   * Attribute, and posts a card describing the contested response and the
   * Condition the loser gains.
   */
  async rollLashingOut() {
    const sys = this.system;
    const bp = sys.vampire_traits?.bloodPotency?.final ?? 0;
    const ASPECTS = {
      monstrous:   { label: "Monstrous",   attr: "Strength",     path: ["attributes_physical", "strength"],     condition: "Bestial" },
      seductive:   { label: "Seductive",   attr: "Presence",     path: ["attributes_social", "presence"],       condition: "Wanton" },
      competitive: { label: "Competitive", attr: "Intelligence", path: ["attributes_mental", "intelligence"],   condition: "Competitive" }
    };

    const body = `
      <p class="vtr-rite-summary">Blood Potency = <strong>${bp}</strong></p>
      <dl>
        <dt>Aspect of the Beast:</dt>
        <dd><select name="aspect">
          <option value="monstrous">Monstrous &mdash; Strength (inflicts Bestial)</option>
          <option value="seductive">Seductive &mdash; Presence (inflicts Wanton)</option>
          <option value="competitive">Competitive &mdash; Intelligence (inflicts Competitive)</option>
        </select></dd>
        <dt>Situational modifier (territory, hunger, &hellip;):</dt>
        <dd><input type="number" name="modifier" value="0"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: "Lash Out with the Predatory Aura",
      variant: "lashing_out",
      body,
      onRoll: async (html) => {
        const aspect = ASPECTS[html.find('[name="aspect"]').val()] ?? ASPECTS.monstrous;
        const modifier = Math.round(Number(html.find('[name="modifier"]').val()) || 0);
        const attrVal = this.system?.[aspect.path[0]]?.[aspect.path[1]]?.final ?? 0;
        const pool = Math.max(0, bp + attrVal + modifier);

        const rollReturn = {};
        await DiceRollerDialogue.rollToChat({
          dicePool: pool,
          flavor: `Predatory Aura &mdash; ${aspect.label} (Blood Potency + ${aspect.attr})`,
          title: "Lashing Out",
          actorOverride: this,
          hungerDice: 0,
          rollReturn
        });
        // Only show the contested-response / Condition card when the lash-out
        // actually landed. A failed roll never reaches the opposed step.
        const hits = Math.max(0, rollReturn.roll?.total ?? 0);
        if (hits < 1) return;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this }),
          content: `<div class="vtr-roll"><div class="hunger-messy messy-success">`
            + `<span class="hunger-messy-title">Predatory Aura &mdash; ${aspect.label} Beast</span>`
            + `<span class="hunger-messy-text">Your target responds with <em>fight</em> `
            + `(a Power Attribute + Blood Potency &mdash; it costs them 1 Willpower if their Blood `
            + `Potency is lower than yours) or <em>flight</em>. If you score more successes, they gain `
            + `the <strong>${aspect.condition}</strong> Condition and you take +2 to pursue your `
            + `aspect for the scene.</span>`
            + `<button type="button" class="vtr-frenzy-button" data-vtr-apply-condition="${aspect.condition}" `
            + `data-vtr-apply-to="selected" data-actor-id="${this.id}">`
            + `Apply ${aspect.condition} to selected token</button>`
            + `</div></div>`
        });
      }
    });
  }

  /**
   * Detachment roll for Vampires (VtR 2E p. 107-108). The dice pool is the
   * breaking point's severity plus a Touchstone modifier (−2 none / +2 one /
   * +3 multiple). Failure (or dramatic failure) costs a Humanity dot. Facing
   * any breaking point grants a Beat. Conditions are offered as card buttons.
   */
  async rollDetachment() {
    const sys = this.system;
    const humanity = Number(sys.integrity ?? 7);

    // Touchstone modifier: count filled touchstones_vampire slots. The label
    // names the Touchstones so the dialog shows who they are.
    const tsNames = Object.values(sys.touchstones_vampire ?? {})
      .map(t => String(t ?? "").trim())
      .filter(t => t.length > 0);
    const filled = tsNames.length;
    const tsMod = filled === 0 ? -2 : filled === 1 ? 2 : 3;
    const tsLabel = filled === 0
      ? "no Touchstones (&minus;2)"
      : `${tsNames.join(", ")} (${tsMod >= 0 ? "+" : ""}${tsMod})`;

    const body = `
      <p class="vtr-rite-summary">Humanity <strong>${humanity}</strong> &middot; Touchstones: ${tsLabel}</p>
      <dl>
        <dt>Breaking point severity:</dt>
        <dd><select name="severity">
          <option value="5">5 dice &mdash; Humanity 10-9 acts</option>
          <option value="4">4 dice &mdash; Humanity 8-7 acts</option>
          <option value="3" selected>3 dice &mdash; Humanity 6-5 acts</option>
          <option value="2">2 dice &mdash; Humanity 4-3 acts</option>
          <option value="1">1 die &mdash; Humanity 2 acts</option>
          <option value="0">0 dice (chance die) &mdash; Humanity 1 acts</option>
        </select></dd>
        <dt>Extra modifier (Masquerade, Requiem, &hellip;):</dt>
        <dd><input type="number" name="modifier" value="0"></dd>
      </dl>`;

    this._renderRiteDialog({
      title: "Detachment Roll",
      variant: "detachment",
      body,
      onRoll: async (html) => {
        const severity = Math.round(Number(html.find('[name="severity"]').val()) || 0);
        const modifier = Math.round(Number(html.find('[name="modifier"]').val()) || 0);
        const pool = severity + tsMod + modifier; // may be <= 0 -> chance die

        const rollReturn = {};
        await DiceRollerDialogue.rollToChat({
          dicePool: pool,
          flavor: `Detachment (severity ${severity}, Touchstones ${tsMod >= 0 ? "+" : ""}${tsMod}`
            + `${modifier ? `, modifier ${modifier >= 0 ? "+" : ""}${modifier}` : ""})`,
          title: "Detachment",
          actorOverride: this,
          hungerDice: 0,
          rollReturn
        });
        await this._resolveDetachmentOutcome(rollReturn.roll);
      }
    });
  }

  /**
   * Interpret a Detachment roll, apply Humanity loss on failure, grant the
   * breaking-point Beat, and post a card with Condition buttons.
   * @param {Roll} roll  The resolved roll (from rollToChat's rollReturn).
   */
  async _resolveDetachmentOutcome(roll) {
    const hits = Math.max(0, roll?.total ?? 0);
    await this.addProgress("Faced a breaking point", 1, 0);

    const condBtn = (name, label) => `<button type="button" class="vtr-frenzy-button" `
      + `data-vtr-apply-condition="${name}" data-actor-id="${this.id}">${label ?? `Apply ${name}`}</button>`;
    const sinButtons = condBtn("Bestial") + condBtn("Competitive") + condBtn("Wanton");

    let cls, title, body, buttons, loseHumanity = false;
    if (roll?.dramaticFailure) {
      cls = "messy-failure";
      title = "Detachment &mdash; Dramatic failure";
      body = "The breaking point means nothing to you. You lose a dot of Humanity and gain the Jaded Condition.";
      buttons = condBtn("Jaded");
      loseHumanity = true;
    } else if (hits < 1) {
      cls = "messy-failure";
      title = "Detachment &mdash; Failure";
      body = "You move toward monstrosity, losing a dot of Humanity. Gain Bestial, Competitive, or Wanton. "
        + "(Optional: take a Bane and a Beat instead of losing Humanity.)";
      buttons = sinButtons;
      loseHumanity = true;
    } else if (roll?.exceptionalSuccess || hits >= 5) {
      cls = "messy-success";
      title = "Detachment &mdash; Exceptional success";
      body = "You step away from the conflict renewed. Humanity holds; gain the Inspired Condition.";
      buttons = condBtn("Inspired");
    } else {
      cls = "messy-success";
      title = "Detachment &mdash; Success";
      body = "You hold onto a scrap of empathy. Humanity holds, but gain Bestial, Competitive, or Wanton.";
      buttons = sinButtons;
    }

    let humanityNote = "";
    if (loseHumanity) {
      const cur = Number(this.system?.integrity ?? 7);
      const next = Math.max(0, cur - 1);
      await this.update({ "system.integrity": next });
      humanityNote = ` <strong>Humanity ${cur} &rarr; ${next}.</strong>`;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="vtr-roll"><div class="hunger-messy ${cls}">`
        + `<span class="hunger-messy-title">${title}</span>`
        + `<span class="hunger-messy-text">${body}${humanityNote}</span>`
        + `<span class="hunger-messy-text"><em>+1 Beat granted for facing a breaking point.</em></span>`
        + buttons
        + `</div></div>`
    });
  }

  scourPattern() {
    const reduceAttribute = (attribute) => {
      const itemData = {
        type: "condition",
        name: game.i18n.localize("MTA.DialoguePatternScouring.ConditionName"),
        img: "systems/vampire-the-requiem-2e/icons/gui/macro-scoured-pattern.svg",
        'system.effectsActive': true,
        'system.effects': [
          {
            name: attribute,
            value: -1
          }
        ]
      }
      return this.createEmbeddedDocuments("Item", [itemData]);
    }
    const gnosis = Math.clamp(this.system.mage_traits.gnosis.final - 1, 0, 9);
    const scouringFrequency = CONFIG.MTA.gnosis_levels[gnosis].scouringFrequency;

    let d = new Dialog({
      title: game.i18n.localize("MTA.DialoguePatternScouring.Title"),
      content: `<p>${game.i18n.format("MTA.DialoguePatternScouring.ScouringFrequency", { var: scouringFrequency })}</p>`,
      buttons: {
        one: {
          label: game.i18n.localize("MTA.DialoguePatternScouring.ButtonOne"),
          callback: () => {
            this.damage(1, "lethal", true);
            this.update({ "system.mana.value": Math.clamp(this.system.mana.value + 3, 0, this.system.mana.max) });
          }
        },
        two: {
          label: game.i18n.localize("MTA.DialoguePatternScouring.ButtonTwo"),
          callback: () => {
            reduceAttribute("attributes_physical.strength");
            this.update({ "system.mana.value": Math.clamp(this.system.mana.value + 3, 0, this.system.mana.max) });
          }
        },
        three: {
          label: game.i18n.localize("MTA.DialoguePatternScouring.ButtonThree"),
          callback: () => {
            reduceAttribute("attributes_physical.dexterity");
            this.update({ "system.mana.value": Math.clamp(this.system.mana.value + 3, 0, this.system.mana.max) });
          }
        },
        four: {
          label: game.i18n.localize("MTA.DialoguePatternScouring.ButtonFour"),
          callback: () => {
            reduceAttribute("attributes_physical.stamina");
            this.update({ "system.mana.value": Math.clamp(this.system.mana.value + 3, 0, this.system.mana.max) });
          }
        }
      },
      default: "one",
    });
    d.render(true);
  }

  falteringRoll() {
    const doRoll = (item) => {
      let dicepool = 0;
      let flavor = `${game.i18n.localize("MTA.DialogueFaltering.Flavor")} ${item.name} : `;
      if(item.type === "conviction") {
        dicepool = this.system.deviant_traits.conviction;
        flavor += game.i18n.localize("MTA.Conviction");
      }
      else if(item.type === "loyalty") {
        dicepool = this.system.deviant_traits.loyalty;
        flavor += game.i18n.localize("MTA.Loyalty");
      }

      let diceRoller = new DiceRollerDialogue({
        dicePool: dicepool,
        flavor: flavor,
        title: flavor,
        actorOverride: this
      });
      diceRoller.render(true);
    }

    const options = {};
    const convictions = this.items.filter(item => item.type == "conviction");
    const loyalties = this.items.filter(item => item.type == "loyalty");

    for(let conviction of convictions) {
      options[conviction.id] = {
        label: conviction.name + ` (${game.i18n.localize("MTA.Conviction")}${conviction.system.wavering ? ` - ${game.i18n.localize("MTA.Wavering")})` : ")"}`,
        callback: () => doRoll(conviction)
      }
    }

    for(let loyalty of loyalties) {
      options[loyalty.id] = {
        label: loyalty.name + ` (${game.i18n.localize("MTA.Loyalty")}${loyalty.system.wavering ? ` - ${game.i18n.localize("MTA.Wavering")})` : ")"}`,
        callback: () => doRoll(loyalty)
      }
    }

    let d = new Dialog({
      title: game.i18n.localize("MTA.DialogueFaltering.Title"),
      buttons: options,
    });
    d.render(true);
  }

  /**
   * A mage macro which conjures the amnion (as an item)
   * and equips it.
   */
  callAmnion() {
    const itemData = {
      type: "condition",
      name: "Amnion",
      img: "systems/vampire-the-requiem-2e/icons/gui/macro-amnion.svg",
      'system.effectsActive': true,
      'system.effects': [
        {
          name: "derivedTraits.armor",
          value: Math.min(this.system.mage_traits.gnosis.final, Math.max(...Object.values(this.system.arcana_subtle).map(arcanum => arcanum.value)))
        },
        {
          name: "attributes_social_dream.finesse",
          value: -2
        },
        {
          name: "derivedTraits.defense",
          value: -1
        }
      ]
    }
    return this.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Prompts the user with a dialogue to enter name and beats to add
   * a progress entry to the actor.
   */
  addProgressDialogue() {
    let d = new Dialog({
      title: "Add Progress",
      content: "<div> <span> Name </span> <input class='attribute-value' type='text' name='input.name' placeholder='No Reason'/></div> <div> <span> Beats </span> <input class='attribute-value' type='number' name='input.beats' data-dtype='Number' min='0' placeholder='0'/></div> <div> <span> Arc. Beats </span> <input class='attribute-value' type='number' name='input.arcaneBeats' data-dtype='Number' min='0' placeholder='0'/></div>",
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "OK",
          callback: html => {
            let name = html.find(".attribute-value[name='input.name']").val();
            if (!name) name = "No Reason";
            let beats = html.find(".attribute-value[name='input.beats']").val();
            if (!beats) beats = 0;
            let arcaneBeats = html.find(".attribute-value[name='input.arcaneBeats']").val();
            if (!arcaneBeats) arcaneBeats = 0;
            this.addProgress(name, beats, arcaneBeats);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "cancel"
    });
    d.render(true);
  }

  /**
   * Adds a progress entry to the actor, with given name and beats.
   */
  addProgress(name = "", beats = 0, arcaneBeats = 0) {
    const system = this.system;
    beats = Math.floor(beats);
    arcaneBeats = Math.floor(arcaneBeats);
    let progress = system.progress ? foundry.utils.duplicate(system.progress) : [];
    progress.push({
      name: name,
      beats: beats,
      arcaneBeats: arcaneBeats
    });
    return this.update({
      'system.progress': progress
    });
  }

  /**
   * Removes a progress entry from the actor at a given position.
   * Note, that the first entry (__INITIAL__) is not part of the progress array;
   * the element coming after it has index 0.
   */
  removeProgress(index = 0) {
    const system = this.system;
    let progress = system.progress ? foundry.utils.duplicate(system.progress) : [];
    progress.splice(index, 1);
    return this.update({
      'system.progress': progress
    });
  }

  /**
   * Calculates and sets the maximum health for the actor using the formula
   * Stamina + Size.
   * If health is set lower than any damage, the damage is lost.
   */
  calculateAndSetMaxHealth() {
    const system = this.system;
    const maxHealth_old = system.health.max;
    //let maxHealth = data.derivedTraits.size.final + data.attributes_physical.stamina.final;
    let maxHealth = system.derivedTraits.health.final;
    //if(data.characterType === "vampire") maxHealth += data.disciplines.common.resilience.value;

    let diff = maxHealth - maxHealth_old;
    if (diff === 0) return;

    let updateData = {}
    updateData['system.health.max'] = maxHealth;

    if (diff >= 0) { // New health is more than old
      updateData['system.health.lethal'] = (+system.health.lethal + diff);
      updateData['system.health.aggravated'] = (+system.health.aggravated + diff);
      updateData['system.health.value'] = (+system.health.value + diff);
    } else { // New health is less than old
      updateData['system.health.lethal'] = Math.max(0, (+system.health.lethal + diff));
      updateData['system.health.aggravated'] = Math.max(0, (+system.health.aggravated + diff));
      updateData['system.health.value'] = Math.max(0, (+system.health.value + diff));

      if (system.health.lethal < Math.abs(diff)) { // Too much lethal damage, upgrade lethal to aggravated damage.
        updateData['system.health.aggravated'] = Math.max(0, updateData['system.health.aggravated'] - Math.abs(Math.abs(diff) - system.health.lethal));
      }

      let diffBashing = Math.max(0, Math.abs(diff) - system.health.value);
      if (system.health.lethal < Math.abs(diff)) diffBashing -= Math.abs(Math.abs(diff) - system.health.lethal);
      if (diffBashing > 0) { // Too much bashing damage, upgrade bashing to lethal, or lethal to aggravated damage.
        updateData['system.health.lethal'] -= diffBashing;
        if (updateData['system.health.lethal'] < 0) {
          updateData['system.health.aggravated'] = Math.max(0, updateData['system.health.aggravated'] + updateData['system.health.lethal']);
          updateData['system.health.lethal'] = 0;
        }
      }
    }
    this.update(updateData);
  }

  /**
   * Calculates and sets the maximum splat-specific resource for the actor.
   * Mage: Mana (determined by Gnosis)
   * Vampire: Vitae (determined by Blood Potency)
   */
  calculateAndSetMaxResource() {
    const systemData = this.system;
    if (systemData.typeConf.sheet.manaMage || systemData.typeConf.sheet.manaProximi || systemData.typeConf.sheet.manaSupernal) { // Mana
      let maxResource = (systemData.typeConf.sheet.manaMage) ? CONFIG.MTA.gnosis_levels[Math.min(9, Math.max(0, systemData.mage_traits.gnosis.final - 1))].max_mana : 
                        (systemData.typeConf.sheet.manaSupernal) ? CONFIG.MTA.ephemeral_ranks[Math.min(CONFIG.MTA.ephemeral_ranks.length-1, Math.max(0, systemData.eph_general.rank.final - 1))].max_essence : 5;
      let updateData = {}
      updateData['system.mana.max'] = maxResource;
      this.update(updateData);
    } else if (systemData.characterType === "vampire") { // Vitae
      let maxResource = CONFIG.MTA.bloodPotency_levels[Math.min(10, Math.max(0, systemData.vampire_traits.bloodPotency.final))].max_vitae;
      if (systemData.vampire_traits.bloodPotency.final < 1) maxResource = systemData.attributes_physical.stamina.final

      let obj = {}
      obj['system.vitae.max'] = maxResource;
      this.update(obj);
    } else if (systemData.characterType === "werewolf") {
      let maxResource = CONFIG.MTA.primalUrge_levels[Math.min(9, Math.max(0, systemData.werewolf_traits.primalUrge.final - 1))].max_essence;

      let obj = {}
      obj['system.essence.max'] = maxResource;
      this.update(obj);
    } else if (systemData.characterType === "demon") {
      let maxResource = CONFIG.MTA.primum_levels[Math.min(9, Math.max(0, systemData.demon_traits.primum.final - 1))].max_aether;

      let obj = {}
      obj['system.aether.max'] = maxResource;
      this.update(obj);
    } else if (systemData.characterType === "sinEater") { // Plasm
      let maxResource = CONFIG.MTA.synergy_levels[Math.min(9, Math.max(0, systemData.sineater_traits.synergy.final - 1))].max_plasm;

      let obj = {}
      obj['system.plasm.max'] = maxResource;
      this.update(obj);
    }  else if (systemData.characterType === "mummy") { 
      let maxResource = CONFIG.MTA.synergy_levels[Math.min(9, Math.max(0, systemData.mummy_traits.sekhem.final - 1))].max_sekhem;

      let obj = {}
      obj['system.sekhem.max'] = maxResource;
      this.update(obj);
    } 
    else if (systemData.typeConf.sheet.pyros || systemData.typeConf.sheet.pyrosPandoran || systemData.typeConf.sheet.pyrosAlchemist) {
      let maxResource = 0;
      if(systemData.typeConf.sheet.pyros) {
        maxResource = CONFIG.MTA.azoth_levels[Math.min(9, Math.max(0, systemData.promethean_traits.azoth.final - 1))].max_pyros;
      }
      else if(systemData.typeConf.sheet.pyrosAlchemist) {
        maxResource = CONFIG.MTA.magnitude_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.magnitude - 1))].max_pyros;
      }
      else if(systemData.typeConf.sheet.pyrosPandoran) {
        maxResource = CONFIG.MTA.pandoran_levels[Math.min(CONFIG.MTA.pandoran_levels.length-1, Math.max(0, systemData.pandoranRank - 1))].max_pyros;
      }

      let obj = {}
      obj['system.promethean_traits.pyros.max'] = maxResource;
      this.update(obj);
    }
    
    if (systemData.typeConf.sheet.glamour || systemData.typeConf.sheet.glamourHobgoblin) {

      let maxResource = (systemData.typeConf.sheet.glamour) ? 
                        CONFIG.MTA.glamour_levels[Math.min(CONFIG.MTA.glamour_levels.length, Math.max(0, systemData.changeling_traits.wyrd.final - 1))].max_glamour 
                        : CONFIG.MTA.glamour_levels_hobgoblin[Math.min(CONFIG.MTA.glamour_levels_hobgoblin.length, Math.max(0, systemData.changeling_traits.wyrd.final - 1))].max_glamour;
      
      let updateData = {}
      updateData['system.glamour.max'] = maxResource;
      this.update(updateData);
    }
  }

  /**
   * Calculates and sets the maximum clarity for the actor using the formula
   * Wits + Composure.
   * If clarity is set lower than any damage, the damage is lost.
   * Also calls updateChangelingTouchstones().
   */
  async calculateAndSetMaxClarity() {
    const system = this.system;
    const maxClarity_old = system.clarity.max;
    let maxClarity = system.attributes_mental.wits.final + system.attributes_social.composure.final;

    let updateData = {}
    updateData['system.clarity.max'] = maxClarity;

    let diff = maxClarity - maxClarity_old;
    if (diff > 0) {
      updateData['system.clarity.severe'] = "" + (+system.clarity.severe + diff);
      updateData['system.clarity.value'] = "" + (+system.clarity.value + diff);
    } else {
      updateData['system.clarity.severe'] = "" + Math.max(0, (+system.clarity.severe + diff));
      updateData['system.clarity.value'] = "" + Math.max(0, (+system.clarity.value + diff));
    }
    await this.update(updateData);
    this.updateChangelingTouchstones();
  }

  /**
   * Updates the number of touchstones based on the maximum clarity.
   */
  updateChangelingTouchstones() {
    const system = this.system;
    let touchstones = foundry.utils.duplicate(system.touchstones_changeling);
    let touchstone_amount = Object.keys(touchstones).length;
    if (touchstone_amount < system.clarity.max) {
      while (touchstone_amount < system.clarity.max) {
        touchstones[touchstone_amount + 1] = "";
        touchstone_amount = Object.keys(touchstones).length;
      }
    } else if (touchstone_amount > system.clarity.max) {
      while (touchstone_amount > system.clarity.max) {
        touchstones['-=' + touchstone_amount] = null;
        touchstone_amount -= 1;
      }
    }
    let updateData = {};
    updateData['system.touchstones_changeling'] = touchstones;
    this.update(updateData);
  }


  getNumDreadPowers() {
    let countDreadPowers = this.items.filter(item => item.type === "dreadPower").map(item => item.system.rating).reduce((a, b) => a + b, 0);
    countDreadPowers += this.items.filter(item => item.type === "numen").length;

    return countDreadPowers;
  }
  
} // End of class