// Source generator for the Conditions compendium.
// Writes one JSON document per Condition to ./conditions/. Compile with:
//   npx @foundryvtt/foundryvtt-cli package pack \
//     -n conditions --in packs-src/conditions --out packs
//
// Each Condition's full text — description, Possible Sources, Resolution,
// Beat trigger — is rendered into the item's HTML description so it shows up
// directly on the character sheet card. The "isPersistent" flag is set
// according to the rulebook's (PERSISTENT) tag.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "conditions");

const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
function deterministicId(seed) {
  const buf = crypto.createHash("sha256").update(seed).digest();
  let out = "";
  for (let i = 0; i < 16; i++) out += ID_ALPHABET[buf[i] % ID_ALPHABET.length];
  return out;
}

function safeFilename(name, id) {
  const slug = name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${slug}_${id}.json`;
}

const COND_IMG = "systems/vampire-the-requiem-2e/icons/placeholders/Condition.svg";

// ─── Condition data ─────────────────────────────────────────────────────────
// Source: Vampire: the Requiem 2E core rulebook, Appendix Two: Conditions.
// `text` is the main description; `sources`, `resolution`, `beat` are the
// rulebook's standard footer entries (Beat may be "n/a").
const CONDITIONS = [
  {
    name: "Addicted",
    persistent: true,
    text: "Your character is addicted to something, whether drugs, gambling or other destructive behaviors. Some addictions are more dangerous than others, but the nature of addiction is that it slowly takes over your life, impeding functionality. If you are addicted, you need to indulge your addiction regularly to keep it under control. A specific addiction should be chosen upon taking this Condition; characters can take this Condition multiple times for different addictions. Being unable to feed your addiction can result in the Deprived Condition.",
    sources: "Alcoholism, substance abuse, Vitae Addiction.",
    resolution: "Regain a dot of Integrity, lose another dot of Integrity, or achieve an exceptional success on a breaking point.",
    beat: "Your character chooses to get a fix rather than fulfill an obligation."
  },
  {
    name: "Amnesia",
    persistent: true,
    text: "Your character is missing a portion of her memory. An entire period of her life is just gone. This causes massive difficulties with friends and loved ones.",
    sources: "Physical or psychological trauma, the Dominate Discipline.",
    resolution: "You regain your memory and learn the truth. Depending on the circumstances, this may constitute a breaking point at a level determined by the Storyteller.",
    beat: "Something problematic arises, such as a forgotten arrest warrant or old enemy."
  },
  {
    name: "Bestial",
    persistent: false,
    text: "Your character acts on primal, physical impulses. Frightening things make him run. He meets aggressive threats with violence and anger. Take a -2 die penalty to all rolls to resist frenzy or physical impulse. As well, take a -2 die penalty to Defense due to impulsive action. Any rolls to compel your character to impulsive, aggressive action or escape achieve exceptional success on three successes instead of five. This could apply to Disciplines such as Nightmare, or Dominate under the right circumstances.</p><p>This Condition fades naturally after a number of nights equal to the Blood Potency of the vampire who caused it. In the case of the predatory aura, this is the vampire who won the conflict. In the case of testing for detachment, this is the vampire's own Blood Potency.</p><p>After resolving Bestial, your character cannot be subject to this Condition again for a full month.",
    sources: "A monstrous predatory aura conflict, facing a breaking point.",
    resolution: "Cause damage in someone's last three Health boxes.",
    beat: "n/a"
  },
  {
    name: "Broken",
    persistent: true,
    text: "Whatever you did or saw, something inside you snapped. You can barely muster up the will to do your job anymore, and anything more emotionally intense than a raised voice makes you flinch and back down. Apply a -2 die penalty to all Social rolls and rolls involving Resolve, and a -5 die penalty to all use of the Intimidation Skill.",
    sources: "Tremendous psychological trauma, the Nightmare Discipline, some Ghoul Merits.",
    resolution: "Regain a dot of Integrity, lose another dot of Integrity, or achieve an exceptional success on a breaking point.",
    beat: "You back down from a confrontation or fail a roll due to this Condition."
  },
  {
    name: "Charmed",
    persistent: true,
    text: "You've been charmed by a vampire's supernatural force of personality. You don't want to believe that anything he says is a lie, and you can't read his true intentions. The vampire adds his Majesty dots to Manipulation rolls against you, and any Wits + Empathy or Subterfuge rolls you make to detect his lies or uncover his true motives suffer a penalty equal to his Majesty dots. Using supernatural means to detect his lies become a Clash of Wills.</p><p>You want to do things for the vampire, to make him happy. If he asks, you'll do favors for him like he was one of your best friends — giving him a place to crash, lending him your car keys, or revealing secrets that you really shouldn't. You don't feel tricked or ripped off unless you resolve the Condition. It expires normally (without resolving) after one hour per dot of the vampire's Blood Potency.",
    sources: "The Majesty Discipline.",
    resolution: "The vampire attempts to seriously harm you or someone close to you, you make a significant financial or physical sacrifice for him.",
    beat: "You divulge a secret or perform a favor for the vampire."
  },
  {
    name: "Competitive",
    persistent: false,
    text: "Your character must assert dominance and superiority. Either she gives it her all, or she falters. Any time she's in direct competition with another character, she suffers a -2 die penalty on any rolls where she doesn't spend Willpower. This includes contested and extended rolls. As well, any rolls to tempt or coerce her into competition achieve exceptional success on three successes instead of five.</p><p>This Condition fades naturally after a number of nights equal to the Blood Potency of the vampire who caused it. In the case of the predatory aura, this is the vampire who won the conflict. In the case of testing for detachment, this is the vampire's own Blood Potency.</p><p>After resolving Competitive, your character cannot be subject to this Condition again for a full month.",
    sources: "A challenging predatory aura conflict, facing a breaking point.",
    resolution: "Win or lose a competition where someone reaches a breaking point.",
    beat: "n/a"
  },
  {
    name: "Confused",
    persistent: false,
    text: "Your character cannot think straight, either because of some mental power or good old-fashioned cranial trauma. You take a -2 die penalty on all Intelligence and Wits rolls.",
    sources: "A blow to the head, dramatic failure when using some Auspex powers.",
    resolution: "Take half an hour to focus and clear your mind. Take any amount of lethal damage.",
    beat: "n/a"
  },
  {
    name: "Delusional",
    persistent: true,
    text: "You believe something that isn't actually true — maybe you think that someone is poisoning your food, that a doppelganger has replaced your daughter, or that something lives in the shadows of your apartment. You don't actually hallucinate images that reinforce your delusion; you may believe that you're covered in spiders, but just looking at yourself is enough to clarify matters. Germs, on the other hand.…</p><p>You can't truly repress your belief, but spending a point of Willpower lets you come up with an explanation (albeit one that sounds psychotic when you explain it to someone else) as to why your delusion does not apply to a specific situation.",
    sources: "The Nightmare Discipline.",
    resolution: "You completely disprove your delusion, or destroy the vampire who is the source of your paranoia.",
    beat: "You adhere to your paranoid belief despite evidence to the contrary."
  },
  {
    name: "Dependent",
    persistent: true,
    text: "Your character has become obsessed with a mortal. This obsession is for both attention and for blood. She suffers all the effects of a second-stage blood bond as if she were bound to the mortal.",
    sources: "Daeva clan bane.",
    resolution: "Death of the mortal.",
    beat: "Your character suffers loss because she avoided responsibility for her obsession."
  },
  {
    name: "Deprived",
    persistent: false,
    text: "Your character suffers from an addiction. She is unable to get her fix, however, leaving her irritable, anxious, and unable to focus. Remove one from her Stamina, Resolve, and Composure dice pools. This does not influence derived traits; it only influences dice pools that use these Attributes.",
    sources: "Your character is Addicted but cannot get a fix.",
    resolution: "Your character indulges her addiction.",
    beat: "n/a"
  },
  {
    name: "Distracted",
    persistent: false,
    text: "Constant confusion and distractions buffet your character from all sides. She cannot take extended actions, and suffers a -2 die penalty to all rolls involving perception, concentration, and precision.</p><p>This Condition does not grant a Beat when resolved.",
    sources: "Being in a swarm.",
    resolution: "Leaving the swarm.",
    beat: "n/a"
  },
  {
    name: "Dominated",
    persistent: false,
    text: "A vampire has given your character a specific command that she cannot go against. You don't have a choice whether or not to follow the command — your will is no longer your own. If your task has a natural end, such as \"Follow that man until he enters an apartment then call me with the address,\" you resolve the Condition once you complete it; otherwise it ends at sunrise. Once you resolve this Condition, you can't quite remember what happened while you were under the vampire's spell.",
    sources: "The Dominate Discipline.",
    resolution: "Take more bashing or lethal damage than your Stamina. Experience a breaking point when following the command, and succeed at the related Resolve + Composure roll. Follow the vampire's command.",
    beat: "n/a"
  },
  {
    name: "Drained",
    persistent: false,
    text: "Your character has been fed from extensively, and suffers from blood loss. He suffers a -2 die penalty to any physical actions, and rolls to stabilize and survive injuries. As well, after any scene where he exerts himself physically, he must make a Stamina roll or fall unconscious for an hour or more. The Drained penalty does not apply to the Stamina roll, but any wound penalties do apply. Taking damage, being fed from, or spending Willpower on a physical roll applies as physical exertion for this Condition.",
    sources: "A vampire's feeding.",
    resolution: "All lethal damage healed through normal means.",
    beat: "n/a"
  },
  {
    name: "Ecstatic",
    persistent: false,
    text: "Your Beast has been temporarily sated through the use of blood sorcery. For as long as the Beast is quiet, the character may feed as though her Blood Potency were three dots less than her rating (minimum one), and has a +2 die bonus to avoid frenzy.",
    sources: "Exceptional success on a Crúac ritual.",
    resolution: "Feeding, sleeping, or resisting a frenzy.",
    beat: "n/a"
  },
  {
    name: "Enervated",
    persistent: true,
    text: "The character is in the second stage of soul loss. Her instinctive efforts to shore up her Willpower by giving into her urges have failed, her Integrity has gone and her Willpower is now fading. In addition to the effects of Soulless, she can no longer regain Willpower through her Virtue, only her Vice. Indulging herself brings diminishing returns — whenever she does so, her permanent Willpower drops by one dot before she regains Willpower points to the new maximum.",
    sources: "Soul loss.",
    resolution: "The character regains her soul.",
    beat: "Lose a dot of permanent Willpower."
  },
  {
    name: "Enslaved",
    persistent: true,
    text: "You're totally in thrall to the vampire who inflicted this Condition. You can no longer tell when her instructions end and commands issued by Dominate begin. She tells you to do something and you do it. She tells you what you remember, and you remember it. This Condition counts as the Mesmerized Condition for the purpose of the Dominate Discipline. She doesn't have to look at you to issue a command as long as you can hear her voice. You do not apply your Resolve as a penalty to the vampire's dice pool for Entombed Command and Possession.",
    sources: "The Dominate Discipline.",
    resolution: "Kill the vampire who controls you. Undo her mental control by supernatural means.",
    beat: "You're made to do something that you wouldn't normally do."
  },
  {
    name: "Enthralled",
    persistent: true,
    text: "You're fanatically loyal to a vampire, willing to go to any length for him. You'll happily take actions that threaten your own life — ramming a speeding truck head-on, jumping in front of a gun-wielding psycho, or handing over your spouse and children for the vampire to play with. The compulsion lasts for one night for each dot of the vampire's Blood Potency.</p><p>You need to spend a point of Willpower just to take an action that goes against your master's commands. Doing so is an immediate breaking point at Humanity 1. If you fail, you chicken out at the last minute; only if you succeed can you do something that the vampire doesn't want you to do.",
    sources: "The Majesty Discipline.",
    resolution: "You take serious harm (more lethal damage than your Stamina) when protecting the vampire, or you succeed at a breaking point roll related to the Condition.",
    beat: "You put yourself in harm's way to protect the vampire."
  },
  {
    name: "False Memories",
    persistent: true,
    text: "The way you remember things doesn't match up with how they happened. You might remember a son who didn't exist, your alcoholic father abusing you despite being raised an orphan, or never getting married. You believe your memories to be true no matter what; even conclusive proof has a hard time getting through to you. Being faced with proof that your memory is fake is a breaking point for you at a level set by the Storyteller.",
    sources: "The Dominate Discipline.",
    resolution: "Face proof that your memory is false and succeed at the breaking point.",
    beat: "Your character trusts someone or takes a risky action based on his faked memories alone."
  },
  {
    name: "Frightened",
    persistent: false,
    text: "Something's scared you to the point where you lose rational thought. Maybe you've just looked down at a hundred-story drop, or seen a tarantula the size of your fist crawling up your leg. Whatever the case, you need to leave right now. Your only priority is getting the fuck away from the thing that's frightened you — the hell with your stuff, your friends, and your allies. If someone tries to stop you from escaping, you'll fight your way past them. You can't approach the source of your fear or act against it — and if the only way out involves going near the source of your fear, you'll collapse on the ground in terror.</p><p>Supernatural creatures prone to loss of control, including vampires, must roll to avoid frenzy. This Condition lasts until the end of the scene; suppressing its effects for a turn costs a point of Willpower.",
    sources: "The Nightmare Discipline, coming face to face with a phobia.",
    resolution: "The character escapes from the source of his fear.",
    beat: "n/a"
  },
  {
    name: "Fugue",
    persistent: true,
    text: "Something terrible happened. Rather than deal with it or let it break you, your mind shuts it out. You are prone to blackouts and lost time. Whenever circumstances become too similar to the situation that led to the character gaining this Condition, the player rolls Resolve + Composure. If you fail the roll, the Storyteller controls your character for the next scene; your character, left to his own devices, will seek to avoid the conflict and get away from the area.",
    sources: "Psychological trauma, encountering a breaking point, some Ghoul Merits.",
    resolution: "Regain a dot of Integrity, lose another dot of Integrity, or achieve an exceptional success on a breaking point.",
    beat: "You enter a fugue state as described above."
  },
  {
    name: "Guilty",
    persistent: false,
    text: "Your character is experiencing deep-seated feelings of guilt and remorse. This Condition is commonly applied after a successful detachment roll. While the character is under the effects of this Condition, he receives a -2 die penalty to any Resolve or Composure rolls to defend against Subterfuge, Empathy, or Intimidation rolls.",
    sources: "Encountering a breaking point, some Ghoul Merits.",
    resolution: "The character confesses his crimes and makes restitution for whatever he did.",
    beat: "n/a"
  },
  {
    name: "Humbled",
    persistent: false,
    text: "Your character has felt the touch of the divine and trembled. She feels unworthy and wretched. For as long as the Condition lasts, she suffers a -2 die penalty to Resolve rolls and may not regain Willpower from her Requiem.",
    sources: "Dramatic failure on a Theban Sorcery ritual.",
    resolution: "The character regains Willpower using her Mask.",
    beat: "n/a"
  },
  {
    name: "Inspired",
    persistent: false,
    text: "Your character is deeply inspired. When your character takes an action pertaining to that inspiration, you may resolve this Condition. An exceptional success on that roll requires only three successes instead of five and you gain a point of Willpower.",
    sources: "Exceptional success with Crafts or Expression, the Inspiring Merit, the Auspex Discipline.",
    resolution: "You spend inspiration to spur yourself to greater success, resolving the Condition as described above.",
    beat: "n/a"
  },
  {
    name: "Intoxicated",
    persistent: false,
    text: "Your character is drunk, drugged, or otherwise dulled to the world around her. While she's probably not hallucinating, her inhibitions and reactions are both lower than they should be. Your character suffers a -2 die penalty to all Dexterity and Wits dice pools. Characters using Social maneuvering against her face two fewer Doors than usual.",
    sources: "Heavy drinking or drug use.",
    resolution: "You sleep it off, or face a breaking point.",
    beat: "n/a"
  },
  {
    name: "Jaded",
    persistent: false,
    text: "Your character has no interest in the ways of the living. He eschews mortal society and only acts to better himself. Because of this, his Beast takes tighter hold on his actions. Any rolls to resist frenzy suffer his Humanity dots as a cap, and he cannot spend Willpower to hold back frenzy. He may still ride the wave.",
    sources: "Detachment failure.",
    resolution: "Meaningful interaction with a Touchstone.",
    beat: "n/a"
  },
  {
    name: "Languid",
    persistent: false,
    text: "Your character feels the draw of torpor. His actions grow sluggish each night that passes, until eventually he falls to the sleep of ages. Every night that passes with this Condition, levy a cumulative -1 die penalty on all actions. As well, rising from daysleep requires a point of Vitae for each dot of Blood Potency.",
    sources: "Losing a Touchstone.",
    resolution: "Falling to torpor.",
    beat: "n/a"
  },
  {
    name: "Lethargic",
    persistent: false,
    text: "Your character is drained and lethargic, feeling the weight of sleeplessness. With this Condition, your character cannot spend Willpower. As well, for every six hours he goes without sleeping, take a cumulative -1 die penalty to all actions. At every six-hour interval, make a Stamina + Resolve roll (with the penalty) to resist falling asleep until the sun next sets.",
    sources: "Fighting daysleep.",
    resolution: "Sleeping a full day.",
    beat: "n/a"
  },
  {
    name: "Mesmerized",
    persistent: false,
    text: "Your character's will is subordinate to that of a vampire. You're not obviously hypnotized — you're a bit quiet and reserved compared to normal, but nothing out of the ordinary. When the vampire who inflicted this Condition gives you a command, you cannot resist. If it's something that you wouldn't normally do, you might look like you've been hypnotized or that you're sleepwalking, but otherwise you look and act normally. If you resolve this Condition, gain a +3 die bonus to resist further attempts to Mesmerize you in the same scene; you also can't quite remember what happened while you were under the vampire's spell. This Condition fades naturally after a scene, which does not count as resolving the Condition.",
    sources: "The Dominate Discipline.",
    resolution: "Take any amount of bashing or lethal damage. Experience a breaking point as part of a vampire's command.",
    beat: "n/a"
  },
  {
    name: "Obsession",
    persistent: true,
    text: "Something's on your character's mind and she just can't shake it. She gains the 9-again quality on all rolls related to pursuing her obsession. On rolls that are unrelated to her obsession, she loses the 10-again quality. Obsession can be a temporary quality per Storyteller approval.",
    sources: "The Acute Senses Merit.",
    resolution: "The character sheds or purges her fixation.",
    beat: "Character fails to fulfill an obligation due to pursuing her obligation."
  },
  {
    name: "Raptured",
    persistent: false,
    text: "Your character is filled with the glory of God's admonishment, the grace of her damnation. She finds an unsettling harmony with her Beast, due to the fire of Longinus's words. She does not need to use Willpower to ride the wave, and can ride the wave on three successes instead of five.",
    sources: "The Anointed Merit.",
    resolution: "Falling to frenzy or riding the wave.",
    beat: "n/a"
  },
  {
    name: "Sated",
    persistent: false,
    text: "Your character gave her Beast an outlet that stopped it from driving her to frenzy. Until she resolves this Condition, she has a +1 die modifier to rolls to resist Frenzy.",
    sources: "The Animalism Discipline.",
    resolution: "Frenzy, or resist significant provocation to frenzy (a situation with a modifier of -3 or more to resist).",
    beat: "n/a"
  },
  {
    name: "Scarred",
    persistent: false,
    text: "Your character was subject to a violent bite from Kindred fangs. He's disturbed, angry, paranoid, and prone to lashing out. With this Condition, take a -2 die penalty to any rolls to resist fear, such as with the Nightmare Discipline or the Intimidation Skill. As well, any creature exhibiting a predatory aura attempting to frighten or intimidate your character receives a +2 die bonus.",
    sources: "A violent bite from a vampire.",
    resolution: "Lash out physically, causing three or more levels of lethal damage to someone.",
    beat: "n/a"
  },
  {
    name: "Shaken",
    persistent: false,
    text: "Something has severely frightened your character. Any time your character is taking an action where that fear might hinder her, you may opt to fail the roll and resolve this Condition.",
    sources: "Facing a breaking point, the Auspex Discipline.",
    resolution: "The character gives into her fear and fails a roll as described above.",
    beat: "n/a"
  },
  {
    name: "Spooked",
    persistent: false,
    text: "Your character has seen something supernatural — not overt enough to terrify her, but unmistakably otherworldly. How your character responds to this is up to you, but it captivates her and dominates her focus.",
    sources: "The Unseen Sense Merit, the Wet Dream Devotion.",
    resolution: "This Condition is resolved when your character's fear and fascination causes her to do something that hinders the group or complicates things (she goes off alone to investigate a strange noise, stays up all night researching, runs away instead of holding her ground, etc.).",
    beat: "n/a"
  },
  {
    name: "Soulless",
    persistent: true,
    text: "The character is in the first stage of soul loss. Without a soul, she can't attempt abjuration, warding, or binding. She is also more susceptible to possession — any dice pools to resist being taken over by another entity are at a -2 die penalty. The effects on Integrity and Willpower, though, are more severe. For as long as she has this Condition, she does not regain Willpower through surrender or rest, and her use of Virtue and Vice is reversed — she may regain one Willpower point per scene by fulfilling her Virtue without having to risk herself, and regains full Willpower once per chapter by fulfilling her Vice in a way that poses a threat to herself. Regaining Willpower through Vice, though, is now a breaking point with a -5 die penalty unless the character has reached Integrity 1. For a vampire, it is a breaking point at Humanity 2.",
    sources: "Soul loss.",
    resolution: "The character regains her soul.",
    beat: "The character loses Integrity because she indulged her Vice."
  },
  {
    name: "Steadfast",
    persistent: false,
    text: "Your character is confident and resolved. When you've failed a roll, you may choose to resolve this Condition to instead treat the action as if you'd rolled a single success. If the roll is a chance die, you may choose to resolve this Condition and roll a single regular die instead.",
    sources: "Encountering a breaking point.",
    resolution: "Your character's confidence carries him through and the worst is avoided; the Condition is resolved as described above.",
    beat: "n/a"
  },
  {
    name: "Stumbled",
    persistent: false,
    text: "Your character has hit a complication while attempting a blood sorcery ritual. Each successive roll in the extended action is at a -3 die penalty.</p><p>This Condition does not grant a Beat when resolved.",
    sources: "Dramatic failure on a blood sorcery ritual.",
    resolution: "The ritual ends.",
    beat: "n/a"
  },
  {
    name: "Subservient",
    persistent: true,
    text: "A vampire has pressed down on your will, and you find it hard to resist doing what she wants even when she doesn't use her supernatural powers of command. She can give you commands as though you were Mesmerized even when you do not have that Condition. You can spend a Willpower point to resist her commands, but she can just Mesmerize you and order you that way. She still needs to use Dominate to alter your memory.</p><p>This Condition fades naturally after a week unless the vampire applies it to you again during that time.",
    sources: "The Dominate Discipline.",
    resolution: "Take more lethal damage than you have Stamina when following the vampire's command. Experience a breaking point when following the command and succeed at the roll.",
    beat: "The vampire makes you do something that you wouldn't normally do."
  },
  {
    name: "Swooning",
    persistent: false,
    text: "Your character is attracted to someone and is vulnerable where they are concerned. He may have the proverbial \"butterflies in his stomach\" or just be constantly aware of the object of his affection. A character may have multiple instances of this Condition, reflecting affection for multiple characters. He suffers a -2 die penalty to any rolls that would adversely affect the specified character, who also gains +2 die bonus on any Social rolls against him. If the specified character is attempting Social maneuvering on the Swooning character, the impression level is considered one higher (maximum of perfect).",
    sources: "Be on the receiving end of an exceptional success of a Persuasion or Subterfuge roll, dramatic failure on using the Majesty Discipline, fed on non-violently by a vampire, have another character help you fulfill your Vice (if mortal).",
    resolution: "Your character does something for his love interest that puts him in danger, or he opts to fail a roll to resist a Social action by the specified character.",
    beat: "n/a"
  },
  {
    name: "Tainted",
    persistent: false,
    text: "Your character committed diablerie, and now retains traces of her victim's soul. Once per chapter, the victim can come back to haunt your character and try to force her destruction. This brief burst penalizes any one dice pool by the victim's Blood Potency dots, or adds to a dice pool opposing your character. This takes the form of subtle manifestations, or whispers that urge and distract. Your character may have multiple instances of this Condition, reflecting different victims.",
    sources: "Diablerie.",
    resolution: "A number of months pass equal to the victim's Blood Potency score. Every level of aggravated damage your character takes reduces this time by one month.",
    beat: "n/a"
  },
  {
    name: "Tasked",
    persistent: false,
    text: "Your character's clan, covenant, or family tasked her with a duty, and the responsibility carries weight. Take the 8-again quality on all rolls relating to the task. Any rolls not pertaining to the task lose the 10-again quality.",
    sources: "Dynasty Membership Merit.",
    resolution: "Complete the task; fail the task.",
    beat: "n/a"
  },
  {
    name: "Tempted",
    persistent: false,
    text: "Your character came close to losing control. Her Beast came at her, and she refused the call. Now, the Beast remains close to the surface. She gets a -1 die penalty to any rolls to resist frenzy. Until she sheds this Condition, each time she resists frenzy, the penalty increases by one. For example, after three successful resistances, note this Condition as \"Tempted -3\" on your character sheet.",
    sources: "Successfully resisted frenzy.",
    resolution: "Kill. Fall to frenzy. Have a meaningful connection with a Touchstone.",
    beat: "n/a"
  },
  {
    name: "Thrall",
    persistent: true,
    text: "The character has fully succumbed to the effects of soullessness. She may not spend Willpower points for any reason, may not use her Defense in combat, may not spend Experiences, and suffers all the effects of the Broken Condition as well. The player should only continue playing a character with this Condition if there's a chance of regaining the soul.",
    sources: "Soul loss.",
    resolution: "The character regains her soul.",
    beat: "The character is victimized as a result of her Condition."
  },
  {
    name: "Wanton",
    persistent: false,
    text: "Your character wants, for the sake of wanting. He's distracted with temptations of excess and indulgence. Any Composure or Resolve rolls to resist temptation suffer a -2 die penalty. As well, the character that brought forth this Condition achieves exceptional success on three successes instead of five when making any rolls to tempt your character. This could apply to Majesty rolls as well as mundane social rolls.</p><p>This Condition fades naturally after a number of nights equal to the Blood Potency of the vampire who caused it. In the case of the predatory aura, this is the vampire who won the conflict. In the case of testing for detachment, this is the vampire's own Blood Potency.</p><p>After resolving Wanton, your character cannot be subject to this Condition again for a full month.",
    sources: "A seductive predatory aura conflict, facing a breaking point.",
    resolution: "Indulge in something that constitutes a breaking point.",
    beat: "n/a"
  }
];

// ─── Document builder ───────────────────────────────────────────────────────
function conditionDoc(c) {
  const id = deterministicId(`condition:${c.name}`);
  const persistentTag = c.persistent ? " (Persistent)" : "";
  const description =
    `<p><strong>${c.name}${persistentTag}.</strong> ${c.text}</p>` +
    `<p><strong>Possible Sources:</strong> ${c.sources}</p>` +
    `<p><strong>Resolution:</strong> ${c.resolution}</p>` +
    `<p><strong>Beat:</strong> ${c.beat}</p>`;
  return {
    _id: id,
    name: c.name,
    type: "condition",
    img: COND_IMG,
    system: {
      description,
      availability: 1,
      isPersistent: c.persistent,
      isClarity: false,
      statusVisibility: "Owner",
      dicePool: { value: 0, attributes: [], macro: "", comment: "", ignoreUnskilled: false },
      effects: [],
      effectsActive: false,
      specialEffects: []
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _key: `!items!${id}`
  };
}

// ─── Write everything ───────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".json")) fs.unlinkSync(path.join(OUT_DIR, f));
}

const docs = CONDITIONS.map(conditionDoc);
for (const doc of docs) {
  const file = path.join(OUT_DIR, safeFilename(doc.name, doc._id));
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
}

console.log(`Wrote ${docs.length} condition source files to ${OUT_DIR}`);
