

export class TokenHotBar extends Application {
  constructor(options) {
    super(options);
  }

  /**
 * Extend and override the default options used by the 5e Actor Sheet
 * @returns {Object}
 */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["worldbuilding", "dialogue", "mta-sheet"],
      template: "systems/vampire-the-requiem-2e/templates/other/tokenHotBar.html",
      popOut: false,
      minimisable: false,
      resisable: false
    });
  }

  async render(force = false, options = {}) {
    const html = await super._render(force, options);

    // Move the element into #ui-bottom above #hotbar
    const container = document.getElementById("ui-bottom");
    const hotbar = container?.querySelector("#hotbar");
    console.log("RENDER", container, html, hotbar, this.element[0], this)
    if (container && hotbar) {
      container.insertBefore(this.element[0], hotbar);
    }

    return html;
  }

  getData() {
    const data = super.getData();
    data.showConditions = game.settings.get('vampire-the-requiem-2e', 'showTokenBarConditions');
    data.showTilts = game.settings.get('vampire-the-requiem-2e', 'showTokenBarTilts');
    if (this.tokens) {
      this.macros = [];

      data.showNonWielded = game.user.flags?.["vampire-the-requiem-2e"]?.tokenHotBar?.showNonWielded ?? false;
      data.showEquipment = game.user.flags?.["vampire-the-requiem-2e"]?.tokenHotBar?.showEquipment ?? false;

      // Prepare generic macros
      this.macros.push({
        name: game.i18n.localize('MTA.Perception'),
        img: "systems/vampire-the-requiem-2e/icons/gui/perception.svg",
        sheetMacro: true,
        callback: (ev) => {
          const quickRoll = ev.which === 3;
          this.tokens.forEach(token => {
            if (token.actor) token.actor.rollPerception(quickRoll, true);
          })
        }
      });

      // Create name for macro bar
      if (this.tokens.length > 1) {
        let names = this.tokens.map(token => token.name);
        data.characterName = names.join(", ");
      }
      let typeOrder = new Map([
        ["firearm", 0],
        ["melee", 1],
        ["explosive", 2],
      ])
      if (data.showEquipment) {
        typeOrder.set("armor", 3);
        typeOrder.set("ammo", 4);
        typeOrder.set("equipment", 5);
        typeOrder.set("container", 6);
      }

      if (data.showTilts) {
        typeOrder.set("tilt", 14);
      }

      if (data.showConditions) {
        typeOrder.set("condition", 15);
      }

      // Only show item macros if only 1 token was selected
      if (this.tokens.length === 1) {
        let token = this.tokens[0];

        data.characterName = token.name;
        if (token.actor) {
          if (token.actor.system.characterType === "mage") {
            this.macros.push({
              name: game.i18n.localize('MTA.ImprovisedSpellcasting'),
              img: "systems/vampire-the-requiem-2e/icons/gui/macro-improvisedSpell.svg",
              sheetMacro: true,
              callback: () => {
                token.actor.castSpell();
              }
            });
            this.macros.push({
              name: game.i18n.localize('MTA.MageSight'),
              img: "systems/vampire-the-requiem-2e/icons/gui/macro-mageSight.svg",
              sheetMacro: true,
              callback: () => {
                token.actor.openMageSightDialogue();
              }
            });
          }

          if (token.actor.type === "simple_antagonist") {
            typeOrder.set("combat_dice_pool", 7);
            typeOrder.set("general_dice_pool", 8);
            data.showNonWielded = true;
          }

          // Add equipped items and favourited abilities
          let equipped = token.actor.items.filter(item => (typeOrder.has(item.type) && (data.showNonWielded || item.system.equipped)) || item.system.isFavorite || (item.type === "formAbility" && item.system.effectsActive))
          equipped.forEach(item => {
            let itemEntity = token.actor.items.get(item.id);
            this.macros.push({
              name: item.name,
              description: item.system.description,
              img: item.img,
              type: item.type,
              notEquipped: typeOrder.has(item.type) && !item.system.equipped && token.actor.type !== "simple_antagonist",
              isFavorite: item.system.isFavorite,
              type: item.type,
              callback: (ev) => {
                const quickRoll = ev.which === 3;
                if (item.type === "spell" || item.type === "spellTemplate") return token.actor.castSpell(itemEntity);
                return itemEntity.roll(undefined, quickRoll);
              }
            })
          });
        }
      }

      // Sort the macros. Sheet macros > favorited abilities > equipped items (sorted by typeOrder), then alphabetically (except sheet macros)
      this.macros.sort((a, b) => (typeOrder.has(a.type) ? typeOrder.get(a.type) : (a.sheetMacro ? -2 : -1)) - (typeOrder.has(b.type) ? typeOrder.get(b.type) : (b.sheetMacro ? -2 : -1)) || ((a.sheetMacro && b.sheetMacro) ? 0 : a.name.localeCompare(b.name)));

      data.macros = this.macros;
    }

    data.tokenBarDamageValue = game.settings.get('vampire-the-requiem-2e', 'tokenBarDamageValue');
    data.tokenBarDamageType = game.settings.get('vampire-the-requiem-2e', 'tokenBarDamageType');



    data.tokenBarDamageTypeLocalized = game.i18n.localize(data.tokenBarDamageType === "bashing"
      ? "MTA.Bashing" : data.tokenBarDamageType === "lethal"
        ? "MTA.Lethal" : "MTA.Aggravated");

    data.isHeal = data.tokenBarDamageValue < 0;

    return data;
  }

  activateListeners(html) {
    console.log("AA", html)
    super.activateListeners(html);
    html.find('.macro').mousedown(ev => {
      let index = ev.currentTarget.closest(".macro").dataset.index;
      if (this.macros) this.macros[index].callback(ev);
    });
    html.find('.showNonWielded').click(async ev => {
      let toggle = !game.user.flags?.["vampire-the-requiem-2e"]?.tokenHotBar?.showNonWielded;
      let updateData = {
        'flags': {
          'vampire-the-requiem-2e': {
            tokenHotBar: { showNonWielded: toggle }
          }
        }
      };
      await game.user.update(updateData);
      this.render(true);
    });
    html.find('.showEquipment').click(async ev => {
      let toggle = !game.user.flags?.["vampire-the-requiem-2e"]?.tokenHotBar?.showEquipment;
      let updateData = {
        'flags': {
          'vampire-the-requiem-2e': {
            tokenHotBar: { showEquipment: toggle }
          }
        }
      };
      await game.user.update(updateData);
      this.render(true);
    });

    html.find('.showConditions').click(async ev => {
      game.settings.set('vampire-the-requiem-2e', 'showTokenBarConditions', !game.settings.get('vampire-the-requiem-2e', 'showTokenBarConditions'));
      this.render(true);
    });

    html.find('.showTilts').click(async ev => {
      game.settings.set('vampire-the-requiem-2e', 'showTokenBarTilts', !game.settings.get('vampire-the-requiem-2e', 'showTokenBarTilts'));
      this.render(true);
    });

    html.find('.settings').hover(ev => {
      $('.settings-menu').toggle();
    });

    html.find('.status').hover(ev => {
      $('.status-menu').toggle();
    });

    html.find('.collapse').on('click', ev => {
      const button = ev.currentTarget;
      const icon = button.querySelector("i");
      const macroList = html.find('.macro-list');

      macroList.toggleClass('collapsed');

      if (icon.classList.contains('fa-chevron-down')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    });

    html.find('.damage-increase .fa-minus').click(ev => {
      let damageAmount = $('.damage-number').val();
      damageAmount--;
      if (damageAmount === 0) damageAmount = -1;
      $('.damage-number').val(damageAmount);
      game.settings.set('vampire-the-requiem-2e', 'tokenBarDamageValue', damageAmount);
      if (damageAmount < 0) {
        $('.damage-apply').addClass('green');
        $('.damage-apply').removeClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToHeal'));
      }
      else {
        $('.damage-apply').removeClass('green');
        $('.damage-apply').addClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToDamage'));
      }
    });

    html.find('.damage-increase .fa-plus').click(ev => {
      let damageAmount = $('.damage-number').val();
      damageAmount++;
      if (damageAmount === 0) damageAmount = 1;
      $('.damage-number').val(damageAmount);
      game.settings.set('vampire-the-requiem-2e', 'tokenBarDamageValue', damageAmount);
      if (damageAmount < 0) {
        $('.damage-apply').addClass('green');
        $('.damage-apply').removeClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToHeal'));
      }
      else {
        $('.damage-apply').removeClass('green');
        $('.damage-apply').addClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToDamage'));
      }
    });

    html.find('.damage-number').change(ev => {
      let damageAmount = $('.damage-number').val();
      game.settings.set('vampire-the-requiem-2e', 'tokenBarDamageValue', damageAmount);
      if (damageAmount < 0) {
        $('.damage-apply').addClass('green');
        $('.damage-apply').removeClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToHeal'));
      }
      else {
        $('.damage-apply').removeClass('green');
        $('.damage-apply').addClass('red');
        $('.damage-apply').html(game.i18n.localize('MTA.ToDamage'));
      }
    });

    html.find('.damage-type .fa-chevron-left').click(ev => {
      let damagetype = $('.damage-type').data('damagetype');
      let damagetypeContent = damagetype;
      if (damagetype === "bashing") {
        damagetype = "aggravated";
        damagetypeContent = game.i18n.localize('MTA.Aggravated');
      } else if (damagetype === "lethal") {
        damagetype = "bashing";
        damagetypeContent = game.i18n.localize('MTA.Bashing');
      } else {
        damagetype = "lethal";
        damagetypeContent = game.i18n.localize('MTA.Lethal');
      }
      game.settings.set('vampire-the-requiem-2e', 'tokenBarDamageType', damagetype);
      $('.damage-type').data('damagetype', damagetype);
      $('.damage-type .button-content').html(damagetypeContent);
    });

    html.find('.damage-type .fa-chevron-right').click(ev => {
      let damagetype = $('.damage-type').data('damagetype');
      let damagetypeContent;
      if (damagetype === "bashing") {
        damagetype = "lethal";
        damagetypeContent = game.i18n.localize('MTA.Lethal');
      } else if (damagetype === "lethal") {
        damagetype = "aggravated";
        damagetypeContent = game.i18n.localize('MTA.Aggravated');
      } else {
        damagetype = "bashing";
        damagetypeContent = game.i18n.localize('MTA.Bashing');
      }
      game.settings.set('vampire-the-requiem-2e', 'tokenBarDamageType', damagetype);
      $('.damage-type').data('damagetype', damagetype);
      $('.damage-type .button-content').html(damagetypeContent);
    });

    html.find('.damage-apply').click(ev => {
      let damageAmount = $('.damage-number').val();
      let damagetype = $('.damage-type').data('damagetype');

      this.tokens.forEach(token => {
        let actor = token.actor;
        if (actor) {
          actor.damage(+damageAmount, damagetype)
        }
      });
    });
  }

  static tokenHotbarInit() {
    return new TokenHotBar();
  }

}




