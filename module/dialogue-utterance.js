export class UtteranceDialogue extends FormApplication {
  constructor(actor, item,...args) {
    super(...args);
    this.actor = actor;
    this.item = item;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["worldbuilding", "dialogue", "mta-sheet"],
      template: "systems/vampire-the-requiem-2e/templates/dialogues/dialogue-utterance.hbs",
      title: game.i18n.localize('MTA.Mummy.Utterance.dialog.title'),
      width: 400,
      closeOnSubmit: true,
      submitOnChange: false,
    });
  }


  getData() {
    const data = super.getData();

    data.tierOpts = {};
    for(let i = 1; i <= 3; i++) {
      data.tierOpts[i] = game.i18n.localize('MTA.Mummy.Utterance.tabTier' + i) + ': '
        + game.i18n.localize('MTA.Mummy.pillar.' + this.item.system['tier'+i+'_pillar']) + ' '
        + this.item.system['tier'+i+'_pillar_level'] + ' '
        + ((this.item.system['tier' +i+'_pillar_keywords']?.length > 0 ? " (" + this.item.system['tier' +i+'_pillar_keywords'].map(kw => {
              return game.i18n.localize('MTA.Mummy.Utterance.' + kw) + (kw == 'potency' ? ' ' + this.item.system['tier'+i+'_potency']: '')
            }).join(", ") + ")": ""));
    }
    data.utterance = this.item;

    return data;
  }

  // activateListeners(html) {
  //   super.activateListeners(html);
  // }

  async _updateObject(event, formData) {
    const chosenTier = formData["tier"];
    let tierDesc = [];
    let cost = {
      any: 0
    }
    let castingTime = game.i18n.localize("MTA.Mummy.Utterance.chat.instant");

    for(let i = 1; i <= 3; i++) {
      if (chosenTier == i) {
        tierDesc.push({
          tier: game.i18n.localize('MTA.Mummy.Utterance.tabTier' + i),
          desc: this.item.system['tier'+i+'_desc'],
          pillar: game.i18n.localize('MTA.Mummy.pillar.' + this.item.system['tier'+i+'_pillar']),
          pillar_level: this.item.system['tier'+i+'_pillar_level'],
          pillar_keywords: (this.item.system['tier' +i+'_pillar_keywords']?.length > 0 ? " (" + this.item.system['tier' +i+'_pillar_keywords'].map(kw => {
              return game.i18n.localize('MTA.Mummy.Utterance.' + kw) + (kw == 'potency' ? ' ' + this.item.system['tier'+i+'_potency']: '')
            }).join(", ") + ")": ""),
          show_pillar_effect: this.actor.system.mummy_pillars[this.item.system['tier'+i+'_pillar']].value >= this.item.system['tier'+i+'_pillar_level'],
          pillar_effect: this.item.system['tier'+i+'_pillar_effect'],
        });
        if (formData["isDeathCurse"]) {
          castingTime = game.i18n.localize("MTA.Mummy.Utterance.chat.reflexive");
        } else {
          cost.any++;
          if (i > 1) {
            cost[this.item.system['tier'+i+'_pillar']] = cost[this.item.system['tier'+i+'_pillar']] ? cost[this.item.system['tier'+i+'_pillar']] + 1: 1;
          }
        }
      }
    }

    let data = {
      chosenTier: game.i18n.localize('MTA.Mummy.Utterance.tabTier' + chosenTier),
      utterance: this.item,
      tierDesc,
      cost: cost.any > 0 ? Object.keys(cost).map(i => cost[i] + ' ' + game.i18n.localize('MTA.Mummy.pillar.' + i)).join(' + ') : game.i18n.localize("MTA.Mummy.Utterance.chat.free"),
      castingTime
    };
    const dicePool = this.item.system['tier' + chosenTier + '_dicePool'];

    if(dicePool && dicePool.attributes && Object.values(dicePool.attributes).length > 0) {
      if (typeof dicePool.attributes == 'object' && !Array.isArray(dicePool.attributes)) {
        dicePool.attributes = Object.values(dicePool.attributes);
      }
      const roll = this.actor.roll({traits: dicePool.attributes, diceBonus: dicePool.value});
    }

    const chatContent = await renderTemplate(
      "systems/vampire-the-requiem-2e/templates/chat/use-utterance.hbs",
      data
    );

    return ChatMessage.create({
      user: game.user.id,
      content: chatContent,
      flavor: game.i18n.localize('MTA.Mummy.Utterance.chat.flavor') + " " + game.i18n.localize('MTA.Mummy.Utterance.tabTier' + chosenTier),
      speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token}),
    });
  }

}