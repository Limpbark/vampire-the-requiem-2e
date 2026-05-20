import { MTA } from "./config.js";
/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  // Define template paths to load
  const templatePaths = [
    // Actor Sheet Partials
    "systems/vampire-the-requiem-2e/templates/actors/parts/base-attributes.hbs",
    "systems/vampire-the-requiem-2e/templates/actors/parts/base-inventory.hbs",
    "systems/vampire-the-requiem-2e/templates/actors/parts/vamp-disciplines.hbs",
    //Item Sheet Partials
    "systems/vampire-the-requiem-2e/templates/items/parts/spellTabAddons.hbs"
  ];

  // Load the template parts
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper('isMagCol', function (value) {
    return value === 3;
  });
  Handlebars.registerHelper('eqAny', function () {
    for (let i = 1; i < arguments.length; i++) {
      if (arguments[0] === arguments[i]) {
        return true;
      }
    }
    return false;
  });
  Handlebars.registerHelper('inArray', function () {
    if (Array.isArray(arguments[1]) && !Array.isArray(arguments[0])) {
      return arguments[1].indexOf(arguments[0]) != -1;
    } else if (Array.isArray(arguments[0]) && !Array.isArray(arguments[1])) {
      return arguments[0].indexOf(arguments[1]) != -1;
    }
    return false;
  });
  Handlebars.registerHelper('scelestiRankHigherThan', function (value, rank) {
    return MTA.scelestiRanks.indexOf(value) >= MTA.scelestiRanks.indexOf(rank);
  });
  Handlebars.registerHelper('convertVampTouchstone', function (value) {
    let newValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    return newValues[value - 1];
  });

  Handlebars.registerHelper('isActiveVampTouchstone', function (value, integrity) {
    let newValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    let newValue = newValues[value - 1];
    return newValue <= integrity;
  });

  Handlebars.registerHelper('isActiveTouchstoneChangeling', function (value, composure) {
    return value >= composure + 1;
  });

  Handlebars.registerHelper('convertBool', function (value) {
    return value === true ? "Yes" : "No";
  });

  Handlebars.registerHelper('isGoblinContract', function (value) {
    return value === "Goblin";
  });

  Handlebars.registerHelper('breaklines', function (text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\n)/gm, '<br>');
    return new Handlebars.SafeString(text);
  });

  Handlebars.registerHelper('addPlus', function (value) {
    return value >= 0 ? "+" + value : value;
  });

  Handlebars.registerHelper('posneg', function (value, comp) {
    return value >= comp ? "positive" : "negative";
  });

  Handlebars.registerHelper('posnegTwoVal', function (value, value2, comp) {
    return (value >= comp && value2 >= comp) ? "positive" : "negative";
  });

  Handlebars.registerHelper('addBrackets', function (value) {
    return Number.isInteger(value) ? "(" + value + ")" : "";
  });

  Handlebars.registerHelper('chooseNum', function (value1, value2) {
    return Number.isInteger(value1) ? value1 : Number.isInteger(value2) ? value2 : 0;
  });

  Handlebars.registerHelper('isInteger', function (value) {
    return Number.isInteger(value);
  });

  Handlebars.registerHelper('scaleIndex', function (value) {
    let scaleIndex = CONFIG.MTA.spell_casting.scale.standard.findIndex(v => (v === value));
    if (scaleIndex < 0) scaleIndex = CONFIG.MTA.spell_casting.scale.advanced.findIndex(v => (v === value));
    if (scaleIndex < 0) scaleIndex = 0
    else scaleIndex++;
    return scaleIndex;
  });

  Handlebars.registerHelper('translate', function (value) { //Unused?
    if (CONFIG.MTA.attributes_physical[value]) return CONFIG.MTA.attributes_physical[value];
    else if (CONFIG.MTA.attributes_social[value]) return CONFIG.MTA.attributes_social[value];
    else if (CONFIG.MTA.attributes_mental[value]) return CONFIG.MTA.attributes_mental[value];
    else if (CONFIG.MTA.skills_physical[value]) return CONFIG.MTA.skills_physical[value];
    else if (CONFIG.MTA.skills_social[value]) return CONFIG.MTA.skills_social[value];
    else if (CONFIG.MTA.skills_mental[value]) return CONFIG.MTA.skills_mental[value];
    else if (CONFIG.MTA.derivedTraits[value]) return CONFIG.MTA.derivedTraits[value];
    else if (CONFIG.MTA.arcana[value]) return CONFIG.MTA.arcana[value];
    else if (CONFIG.MTA.hunter_traits[value]) return CONFIG.MTA.hunter_traits[value];
    else if (CONFIG.MTA.rite_types[value]) return CONFIG.MTA.rite_types[value];
    else if (CONFIG.MTA.attributes[value]) return CONFIG.MTA.attributes[value];
    else if (CONFIG.MTA.haunts[value]) return CONFIG.MTA.haunts[value];
    else if (CONFIG.MTA.localisation[value]) return CONFIG.MTA.localisation[value];
    else return "ERROR";
  });

  Handlebars.registerHelper('getMagicalColor', function (magicType, magicClass) {
    if (CONFIG.MTA.magicItemColors[magicClass]) return CONFIG.MTA.magicItemColors[magicClass];
    else if (CONFIG.MTA.magicItemColors[magicType]) return CONFIG.MTA.magicItemColors[magicType];
    else return CONFIG.MTA.magicItemColors.Default;
  });

  Handlebars.registerHelper('translateTrait', function (value) {
    return value.split('.').reduce((o, i) => o[i], CONFIG.MTA);
  });

  Handlebars.registerHelper('isArcadian', function (value) {
    return value === "Arcadian";
  });

  Handlebars.registerHelper('isCourt', function (value) {
    return value === "Court";
  });

  Handlebars.registerHelper('isGoblin', function (value) {
    return value === "Goblin";
  });

  Handlebars.registerHelper('usesJoining', function (characterType, scelestiRank) {
    return characterType === "scelesti" && MTA.scelestiRanks.indexOf(scelestiRank) >= MTA.scelestiRanks.indexOf("Nasnas");
  });

  Handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context);
  });

  function resolveTrait(actor, args) {
    args.pop(); // Las parameter is the element for some reason
    const traitName = args.join('.');
    const trait = traitName.split('.').reduce((o, i) => {
      if ((o != undefined)) return o[i];
      else return undefined;
    }, actor.system);

    return { traitName, trait }
  }

  function traitsList(traits, selected) {
    return Object.values(traits).reduce((acc, cur) =>
      acc + `<optgroup label="${game.i18n.localize(cur.name)}">
        ${Object.entries(cur.list).reduce((acc_b, [key, value]) =>
        acc_b + `<option value="${key}" ${key === selected ? 'selected' : ''}>${value}</option>
        `, "")}
      </optgroup>`
      , "");
  }

  function specialEffectsList(traits, selected) {
    return Object.entries(traits).reduce((acc, [key, value]) =>
      acc + `<option value="${key}" ${key === selected ? 'selected' : ''}>${value}</option>
    `, "");
  }

  function selectHelper(list, selected, statPath) {
    return `<select name="${statPath}">
        ${Object.entries(list).reduce((acc, [key, value], index) =>
      acc + `<option value="${key}" ${key === selected ? 'selected' : ''}>${value}</option>`, '')
      }
      </select>`;
  }

  Handlebars.registerHelper('weaponStats', function (sheet) {
    return `
    <div class="form-line attributeList">
      <label class="wide">${game.i18n.localize("MTA.WeaponStats")}</label>
      <label>${game.i18n.localize("MTA.Damage")}</label>
      <input name="system.damage" type="number" data-dtype="Number" value="${sheet.system.damage}"/>
      <label>${game.i18n.localize("MTA.Penetration")}</label>
      <input name="system.penetration" type="number" data-dtype="Number" value="${sheet.system.penetration}"/>
      <label>${game.i18n.localize("MTA.InitiativeMod")}</label>
      <input name="system.initiativeMod" type="number" data-dtype="Number" value="${sheet.system.initiativeMod}"/>
      <label>${game.i18n.localize("MTA.ApplyDefense")}</label>
      <label class="checkBox">
        <input data-dtype="Boolean" name="system.applyDefense" type="checkbox" ${sheet.system.applyDefense ? 'checked' : ''}>
        <span></span>
      </label>
      <label>${game.i18n.localize("MTA.NoSuccessesToDamage")}</label>
      <label class="checkBox">
        <input data-dtype="Boolean" name="system.noSuccessesToDamage" type="checkbox" ${sheet.system.noSuccessesToDamage ? 'checked' : ''}>
        <span></span>
      </label>
      <label>${game.i18n.localize("MTA.DamageType")}</label> 
        ${selectHelper(CONFIG.MTA.damageTypes, sheet.system.damageType, "system.damageType")}
    </div>`
  });

  Handlebars.registerHelper('dicePoolList', function (sheet) {
    const options = arguments[arguments.length - 1];
    let fieldName = options.hash.fieldName;
    console.log("A1", fieldName, options)

    if (!fieldName) {
      fieldName = 'dicePool';
    }

    console.log("A2", fieldName)

    if (!sheet.system[fieldName]) {
      sheet.system[fieldName] = {
        attributes: [],
        comment: "",
        macro: "",
        value: 0
      }
    }
    if (typeof sheet.system[fieldName].attributes == 'object' && !Array.isArray(sheet.system[fieldName].attributes)) {
      sheet.system[fieldName].attributes = Object.values(sheet.system[fieldName].attributes);
    }

    const macro = game.macros.get(sheet.system[fieldName]?.macro);
    const macro_name = macro ? macro.name : '';
    const macro_string = Array.from(game.macros.keys()).reduce((acc, cur) => acc + '/' + cur, '');

    if (sheet.system[fieldName].attributes == undefined) {
      sheet.system[fieldName].attributes = [];
    }

    return `
    <div class="form-line attributeList">
      <label>${game.i18n.localize("MTA.DicePool")}</label> 
      <span class="stoneButton dicePoolAdd" data-field="${fieldName}">+</span>
      ${sheet.system[fieldName].attributes.reduce((acc, cur, index) => 
        acc + `<select name="system.${fieldName}.attributes.${index}">
          ${traitsList(sheet.all_traits, cur)}
        </select>
      <span class="stoneButton dicePoolRemove" data-index=${index} data-field="${fieldName}">-</span>
      `, '')}
      <span class="wide">
        + <input name="system.${fieldName}.value" type="number" data-dtype="Number" placeholder=0 value="${sheet.system[fieldName].value || ''}" />
      </span>
      <label>${game.i18n.localize("MTA.IgnoreUnskilled")}</label>
        <label class="checkBox">
          <input data-dtype="Boolean" name="system.dicePool.ignoreUnskilled" type="checkbox" ${sheet.system.dicePool.ignoreUnskilled ? 'checked' : ''}>
          <span></span>
        </label><hr><hr>
      <label>${game.i18n.localize("MTA.Macro")}</label>
      <input name="system.${fieldName}.macro" type="text" value="${sheet.system[fieldName].macro || ''}" data-koptions="${macro_string}"/>
      ${macro_name ? `
      <label class="wide small">
        ${macro_name}
      </label>
      `: ''}
      <label>${game.i18n.localize("MTA.Comment")}</label>
      <textarea name="system.${fieldName}.comment" placeholder="${game.i18n.localize("MTA.CommentPlaceholder")}">${sheet.system[fieldName].comment}</textarea>
  </div>`
  });


  Handlebars.registerHelper('remembranceList', function (sheet) {
    if (!Array.isArray(sheet.system.remembranceTraits)) sheet.system.remembranceTraits = [];
    return `
    <div class="form-line attributeList">
      <label>${game.i18n.localize("MTA.RemembranceTraits")}</label>
      <span class="stoneButton green remembranceTraitAdd">+</span>
      ${sheet.system.remembranceTraits.reduce((acc, cur, index) =>
      acc + `<span>
        <select name="system.remembranceTraits.${index}.name">
          ${traitsList(sheet.possibleRemembranceTraits, cur.name)}
        </select>
      </span>
      <span class="stoneButton red remembranceTraitRemove" data-index=${index}>-</span>`
      , "")}
    </div>`
  });

  Handlebars.registerHelper('effectList', function (sheet) {
    return `
    <div class="form-line attributeList">
      ${'equipped' in sheet.system ? '' : `
        <label>${game.i18n.localize("MTA.Active")}</label>
        <label class="checkBox">
          <input data-dtype="Boolean" name="system.effectsActive" type="checkbox" ${sheet.system.effectsActive ? 'checked' : ''}>
          <span></span>
        </label><hr><hr>
      `}
      <label>${game.i18n.localize("MTA.Effects")}</label>
      <span class="stoneButton effectAdd">+</span>
      ${sheet.system.effects.reduce((acc, cur, index) =>
      acc + `<span>
        <select name="system.effects.${index}.name">
          ${traitsList(sheet.all_traits, cur.name)}
        </select>
        <input name="system.effects.${index}.value" type="number" data-dtype="Number" value="${cur.value}" />
        <label class="checkBox overFive" title="Can increase traits above five (or splat-specific power trait maximum)?">
          <input data-dtype="Boolean" name="system.effects.${index}.overFive" type="checkbox" ${cur.overFive ? 'checked' : ''}>
          <span></span>
        </label>

      </span>
      <span class="stoneButton effectRemove" data-index=${index}>-</span>`
      , "")}
    </div>`
  });

  Handlebars.registerHelper('specialEffectList', function (sheet) {
    return `
    <div class="form-line attributeList">
      <label>${game.i18n.localize("MTA.SpecialEffects")}</label>
      <span class="stoneButton specialEffectAdd">+</span>
      ${sheet.system.specialEffects.reduce((acc, cur, index) =>
      acc + `<span class="special-effect-line">
        <select name="system.specialEffects.${index}">
          ${specialEffectsList(sheet.all_specialEffects, cur)}
        </select>
        <span class="special-effect-description">${MTA.special_effects_descriptions[cur]}</span>
      </span>
      <span class="stoneButton specialEffectRemove" data-index=${index}>-</span>`
      , "")}
    </div>`
  });

  Handlebars.registerHelper('bigStatBox', function (actor, delimiter, ...args) {
    let { traitName, trait } = resolveTrait(actor, args);

    if (trait === null) trait = 0;

    if (trait == undefined) {
      console.error("Failed to construct input", trait, traitName)
      return;
    }

    const isInteger = Number.isInteger(trait);
    let traitValue = isInteger ? trait : trait.value;
    if (traitValue == undefined) traitValue = 0;
    if (delimiter && isInteger) {
      console.error("Failed to construct input", trait, traitName)
      return;
    }
    let traitValueMax = trait.max;
    if (traitValueMax == undefined) traitValueMax = 0;
    const localisedName = game.i18n.localize("MTA." + traitName);

    // TODO: Support x_per_turn and calculateMaxResource button

    return `
    <div class="kInput statBox big">
        <h4>
          <input class="attribute-check" id="${actor._id + traitName}" data-trait="${traitName}" type="checkbox" data-dtype="Boolean">
          <label class="button attribute-button" for="${actor._id + traitName}">${localisedName}</label>
        </h4>
        <div class="gold-border"></div>
        <div class="split">
          <div class="niceNumber buttonsLeft">            
            <input type="number" name="system.${isInteger ? traitName : traitName + ".value"}" value=${traitValue} data-dtype="Number" min=0 max=999>
            <span class="attribute-mod ${trait.isModified ? (`${trait.final >= trait.value ? "positive" : "negative"}`) : ''}">${trait.isModified ? (Number.isInteger(trait.final) ? "(" + trait.final + ")" : "") : ''}</span>
            <div class="numBtns">
              <div class="plusBtn">+</div>
              <div class="minusBtn">−</div>
            </div>
          </div>
          ${delimiter ? `
            <span class="delimiter"> / </span>
            <div class="niceNumber">
              <input type="number" name="system.${isInteger ? traitName : traitName + ".max"}" value=${traitValueMax} data-dtype="Number" min=0 max=999>
              <div class="numBtns">
                <div class="plusBtn">+</div>
                <div class="minusBtn">−</div>
              </div>
            </div>
            `: ''}
        </div>
      </div>`
  });

  Handlebars.registerHelper('rollableInput', function (actor, ...args) {
    let { traitName, trait } = resolveTrait(actor, args);

    if (trait === null) trait = 0;

    if (trait == undefined) {
      console.error("Failed to construct input", traitName)
      return;
    }

    const isSkill = traitName.split('.')[0] === "skills_physical" || traitName.split('.')[0] === "skills_social" || traitName.split('.')[0] === "skills_mental";
    const canBeRoteSkill = (actor.system.characterVariant === "mage" || actor.system.characterVariant === "scelesti") && isSkill; // FIXME: or scelesti, etc.

    const isArcanum = traitName.split('.')[0] === "arcana_subtle" || traitName.split('.')[0] === "arcana_gross";
    const isRenown = traitName.split('.')[0] === "werewolf_renown";
    const isPillar = traitName.split('.')[0] == "mummy_pillars";
    let traitPoints;
    if (isPillar) {
      traitPoints = trait.points && Number.isInteger(trait.points) ? trait.points: 0;
    }
    const isHaunt = traitName.split('.')[0] === "haunts";

    const isInteger = Number.isInteger(trait);
    let traitValue = isInteger ? trait : trait.value;
    if (traitValue == undefined) traitValue = 0;
    const localisedName = game.i18n.localize("MTA." + traitName);

    // VtR 2E character-sheet flair: render a row of dots after the value for
    // attributes and skills, capped by Blood Potency for Vampires (Ghouls and
    // Mortals always cap at 5). Clicking the dots selects the trait, same as
    // clicking its name.
    const showDots = /^(attributes|skills)_(physical|social|mental)\./.test(traitName);
    let traitMax = 999;
    let dotsHtml = "";
    if (showDots) {
      if (actor.system?.characterVariant === "vampire") {
        const bp = actor.system?.vampire_traits?.bloodPotency?.final
          ?? actor.system?.vampire_traits?.bloodPotency?.value ?? 0;
        traitMax = Math.max(5, bp);
      } else {
        traitMax = 5;
      }
      for (let i = 1; i <= traitMax; i++) {
        dotsHtml += `<span class="trait-dot${i <= traitValue ? " filled" : ""}"></span>`;
      }
    }
    return `
    <li class="attribute flexrow rollableInput">
      <span>
        ${canBeRoteSkill ? `
        <label class="checkBox">
          <input data-dtype="Boolean" name="system.${traitName}.isRote" type="checkbox" ${trait.isRote ? 'checked' : ''}>
          <span></span>
        </label>` : ''}
        ${isArcanum ? `
        <span class="button arcana-state ${trait.isRuling ? 'ruling' : trait.isInferior ? 'inferior' : ''}" title="${trait.isRuling ? game.i18n.localize('MTA.RulingArcanum') : trait.isInferior ? game.i18n.localize('MTA.InferiorArcanum') : ""}" data-trait="${traitName}">${trait.isRuling ? game.i18n.localize('MTA.RulingShort') : trait.isInferior ? game.i18n.localize('MTA.InferiorShort') : ""}</span>
        ` : ''}
        ${isRenown ? `
        <span class="button renown-state ${trait.isAuspice ? 'auspice' : trait.isTribe ? 'tribe' : ''}" title="${trait.isAuspice ? game.i18n.localize('MTA.Auspice') : trait.isTribe ? game.i18n.localize('MTA.Tribe') : ''}" data-trait="${traitName}">${trait.isAuspice ? game.i18n.localize('MTA.AuspiceShort') : trait.isTribe ? game.i18n.localize('MTA.TribeShort') : ''}</span>
        ` : ''}
        ${isHaunt ? `
        <span class="button haunt-state ${trait.hasAffinity ? 'affinity' : ''}" title="${trait.hasAffinity ? game.i18n.localize('MTA.HauntAffinity') : ''}" data-trait="${traitName}"></span>
        ` : ''}
        ${isPillar ? `
        <span class="button pillar-state ${trait.isPrimary ? 'primary' : ''}" title="${trait.isPrimary ? game.i18n.localize('MTA.Mummy.primaryPillar') : ''}" data-trait="${traitName}"></span>
        ` : ''}
        ${isSkill ? `
        <span class="button skill-specialty tooltip ${trait.specialties?.length ? 'available' : ''} ${trait.isAssetSkill ? 'asset' : ''}" data-trait="${traitName}"><i class="fa-solid fa-diamond"></i>
          ${trait.specialties?.length ? `
            <span class="tooltip-text">
              <ul>
                ${trait.specialties.reduce((prev, cur) => prev + `<li>${cur}</li>`, '')}
              </ul>
            </span>
          `: ''}
        </span>` : ''}
        <span>
            <input class="attribute-check" id="${actor._id + traitName}" data-trait="${traitName}" type="checkbox" data-dtype="Boolean">
            <label class="button attribute-button" for="${actor._id + traitName}">${localisedName}</label>
        </span>
      </span>
      <span>
        ${isPillar ? `
          <span>
            <input class="attribute-value" type="number" name="system.${isInteger ? traitName : traitName + ".points"}" value=${traitPoints} data-dtype="Number" min=0 max=999>
          </span>
          ` : ''} 
        <span class="attribute-mod ${trait.isModified ? (`${trait.final >= trait.value ? "positive" : "negative"}`) : ''}">${trait.isModified ? (Number.isInteger(trait.final) ? "(" + trait.final + ")" : "") : ''}</span>
        <input class="attribute-value" type="number" name="system.${isInteger ? traitName : traitName + ".value"}" value=${traitValue} data-dtype="Number" min=0 max=${traitMax}>
        ${dotsHtml ? `<label class="trait-dots" for="${actor._id + traitName}">${dotsHtml}</label>` : ''}
    </span>
  </li>`
  });

  /**
   * Reimplementation of deprecated select.
   * I personally prefer this one.
   */
  Handlebars.registerHelper('select', function (selected, options) {
    const escapedValue = RegExp.escape(Handlebars.escapeExpression(selected));
    const rgx = new RegExp(` value=[\"']${escapedValue}[\"\']`);
    const html = options.fn(this);
    return html.replace(rgx, "$& selected");
  });
}