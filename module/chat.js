export const createShortActionMessage = async function (flavor = "", actor) {


  // Basic template rendering data
  const templateData = {
    data: {}
  };

  // Render the chat card template
  const template = `systems/vampire-the-requiem-2e/templates/chat/shortAction-card.html`;
  const html = await foundry.applications.handlebars.renderTemplate(template, templateData);

  // Basic chat message data
  let chatData = {
    user: game.user.id,
    content: html,
    speaker: actor ? ChatMessage.getSpeaker({ actor: actor, token: actor.token }) : ChatMessage.getSpeaker(),
    flavor: flavor
  };

  // Toggle default roll mode
  let rollMode = game.settings.get("core", "rollMode");
  /* if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
  if ( rollMode === "blindroll" ) chatData["blind"] = true; */
  chatData = ChatMessage.applyRollMode(chatData, rollMode);
  // Create the chat message
  return ChatMessage.create(chatData);
}

