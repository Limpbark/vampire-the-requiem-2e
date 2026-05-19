export class MTACombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
   /* async _prepareTurnContext(combat, combatant, index) {
    const ctx = await super._prepareTurnContext(combat, combatant, index);

    const a = combatant.actor;
    if (a?.type === "ephemeral" && a.system?.ephemeralType === "Angel") {
      // ctx.classes may be a string or an array depending on core/template
      if (Array.isArray(ctx.classes)) ctx.classes.push("cipherText");
      else ctx.classes = `${ctx.classes ?? ""} cipherText`.trim();
    }
    return ctx;
  }

   activateListeners(html) {
      super.activateListeners(html);
  
      const randomInt = max => Math.floor(Math.random() * max)
      const randomFromArray = array => array[randomInt(array.length)]
      const scrambleText = text => {
        const chars = 'abcdefghijklmnopqrstuvw'.split('')
        return text
          .split('')
          .map(x => randomInt(3) > 1 ? randomFromArray(chars) : x)
          .join('')
      }
      const tracker = this;
      const textEles = html.find(".cipherText .token-name h4");
      textEles.each(function() {
        const originalText = $( this ).text();
        
        const timer = setInterval(() => {
          $( this ).text(scrambleText(originalText));
          if(!tracker.viewed) clearInterval(timer);
        }
        , 100)
  
      });
    } */
}