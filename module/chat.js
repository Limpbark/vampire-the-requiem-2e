/**
 * Apply message visibility to pending ChatMessage data.
 * v14 replaced "roll modes" with message visibility modes: ChatMessage.applyMode
 * with no mode argument applies the user's currently selected mode. A blind GM
 * roll sets the schema fields directly, so it does not depend on mode names.
 * @param {object} chatData           Pending ChatMessage creation data.
 * @param {object} [options]
 * @param {boolean} [options.blind]   Force a blind roll whispered to the GMs.
 * @returns {object}                  The same chatData, with visibility applied.
 */
export const applyMessageVisibility = function (chatData, { blind = false } = {}) {
  if (blind) {
    chatData.blind = true;
    chatData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id ?? u);
    return chatData;
  }
  return ChatMessage.applyMode(chatData);
}

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
    author: game.user.id,
    content: html,
    speaker: actor ? ChatMessage.getSpeaker({ actor: actor, token: actor.token }) : ChatMessage.getSpeaker(),
    flavor: flavor
  };

  chatData = applyMessageVisibility(chatData);
  // Create the chat message
  return ChatMessage.create(chatData);
}
