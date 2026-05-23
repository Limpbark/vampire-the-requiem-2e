import {
  TokenHealthColorSettingsDialogue
} from "./dialogue-tokenHealthColorSettings.js";
export const registerSystemSettings = function () {

  game.settings.register("vampire-the-requiem-2e", "owodAttributeOrdering", {
    name: "OWOD Attribute/Skill Ordering",
    hint: "Change the attribute/skill ordering to be physical/social/mental.",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    requiresReload: false
  });

  game.settings.register("vampire-the-requiem-2e", "autoCollapseItemDescription", {
    name: "Collapse Item Cards in Chat",
    hint: "Automatically collapse Item Card descriptions in the Chat Log",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    onChange: s => {
      ui.chat.render();
    }
  });


  game.settings.register("vampire-the-requiem-2e", "showConditionsOnTokens", {
    name: "Show Conditions icons on Tokens",
    hint: "Determines whether Conditions are shown as status icons on Tokens for the user",
    scope: "client",
    config: true,
    default: true,
    type: Boolean,
    onChange: s => {
      //TODO:
    }
  });

  game.settings.register("vampire-the-requiem-2e", "showRollDifficulty", {
    name: "Show roll difficulty setting",
    hint: "Adds the option to change roll difficulty (target number) in the dice roller",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: s => {

    }
  });


  /** Homebrew rules */

  game.settings.register("vampire-the-requiem-2e", "lowerDefense", {
    name: "Homebrew rule: lower defense rating",
    hint: "Lowers defense values of characters to more reasonable values. Normal characters now calculate their defense rating only with the lowest of their Dexterity and Wits.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register("vampire-the-requiem-2e", "easierDramaticFailures", {
    name: "Homebrew rule: easier dramatic failures",
    hint: "A dramatic failure happens if you fail a roll, and the first dice rolled was a 1, regardless of how many dice were rolled.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: false
  });

  game.settings.register("vampire-the-requiem-2e", "homebrewDemons", {
    name: "Homebrew rule: ephemeral demons",
    hint: "Adds a demon-type ephemeral entity, with lores, etc.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true
  });

  game.settings.register("vampire-the-requiem-2e", "phasesOfNight", {
    name: "Homebrew rule: Phases of Night",
    hint: "Adds a 'Phases of Night' ribbon to the character sheet's macro bar showing where the character is in the night (10 segments from ~6 PM through ~6 AM). Daysleep resets the marker to Early Dawn.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      // Re-render every open character sheet so the ribbon shows/hides immediately.
      for (const app of Object.values(ui.windows)) {
        if (app?.actor?.type === "character") app.render(false);
      }
    }
  });

  game.settings.register("vampire-the-requiem-2e", "homebrewBlushOfLife", {
    name: "Homebrew rule: Blush of Life portrait swap",
    hint: "Adds a small icon to the Vampire portrait. Left-click spends 1 Vitae and swaps the sheet portrait to a player-supplied 'alive-looking' variant (token and canonical portrait are not touched); right-click picks the alternate image. The portrait reverts when the Phase of Night changes or the character takes a daysleep. Requires the Phases of Night setting to be enabled.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
    onChange: () => {
      for (const app of Object.values(ui.windows)) {
        if (app?.actor?.type === "character") app.render(false);
      }
    }
  });

  game.settings.register("vampire-the-requiem-2e", "autoVitaeSpend", {
    name: "Automatic Vitae spend",
    hint: "When a Vampire or Ghoul rolls a Discipline Power or Devotion that costs Vitae, prompt to deduct the cost from their Vitae pool. The amount is pre-filled (a best guess for free-text Discipline costs) and editable.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("vampire-the-requiem-2e", "homebrewWillpower", {
    name: "Homebrew rule: alternative Willpower gain",
    hint: "Replaces the Anchor-based Willpower recovery with: Daysleep restores 1 Willpower (alongside the usual 1 Vitae spent); an unaided exceptional success grants 1 Willpower (exceptional successes helped by the Willpower toggle do not count); and the shipped 'Story Achievement' macro refreshes all Willpower for a major milestone.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("vampire-the-requiem-2e", "hungerDice", {
    name: "Homebrew rule: Hunger Dice",
    hint: "For Vampires and Ghouls, when a dice pool exceeds current Vitae the excess dice become Hunger dice (a 10 causes a messy success, a 1 on a failed roll causes a messy failure). The dice roller calculates and displays this automatically.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /** Not visible */

  /**
 * Track the system version upon which point a migration was last applied
 */
  game.settings.register("vampire-the-requiem-2e", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenHealthColorHealthy', {
    name: 'Token health color (healthy)',
    scope: 'client',
    config: false,
    type: String,
    default: '#000000',
    onChange: value => {
    }
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenHealthColorBashing', {
    name: 'Token health color (bashing)',
    scope: 'client',
    config: false,
    type: String,
    default: '#eaba0a',
    onChange: value => {
    }
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenHealthColorLethal', {
    name: 'Token health color (lethal)',
    scope: 'client',
    config: false,
    type: String,
    default: '#d37313',
    onChange: value => {
    }
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenHealthColorAggravated', {
    name: 'Token health color (aggravated)',
    scope: 'client',
    config: false,
    type: String,
    default: '#a52525',
    onChange: value => {
    }
  });

  // Define a settings submenu which handles advanced configuration needs
  game.settings.registerMenu("vampire-the-requiem-2e", "TokenHealthColorSettingsMenu", {
    name: "Token health color settings",
    label: "Token health color settings",
    hint: "Change the colors for the various damage types on token resource 'health' bars.",
    icon: "fas fa-bars",               // A Font Awesome icon used in the submenu button
    type: TokenHealthColorSettingsDialogue,   // A FormApplication subclass which should be created
    restricted: false                   // Restrict this submenu to gamemaster only?
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenBarDamageValue', {
    name: 'Token bar damage',
    scope: 'client',
    config: false,
    type: Number,
    default: 1,
  });

  game.settings.register('vampire-the-requiem-2e', 'tokenBarDamageType', {
    name: 'Token bar damage type',
    scope: 'client',
    config: false,
    type: String,
    default: "bashing",
  });

  game.settings.register("vampire-the-requiem-2e", "showTokenBarConditions", {
    name: "Show conditions for selected tokens",
    scope: "client",
    default: false,
    type: Boolean
  });

  game.settings.register("vampire-the-requiem-2e", "showTokenBarTilts", {
    name: "Show tilts for selected tokens",
    scope: "client",
    default: false,
    type: Boolean
  });
};
