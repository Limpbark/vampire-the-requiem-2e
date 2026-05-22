// Codex entries for Attributes, Skills, Vampire traits, and Disciplines.
// Selecting a trait on the character sheet populates the codex panel with the
// matching entry. Trait keys mirror the data path used on the actor
// (e.g. "attributes_physical.strength", "skills_social.animalKen").

export const CODEX_ENTRIES = {

  /* ----------------------------------- MENTAL ATTRIBUTES ----------------------------------- */
  "attributes_mental.intelligence": {
    title: "Intelligence",
    body: `
      <p>Raw cognitive power: memory, reasoning, and the capacity to work through complex problems. Intelligence doesn't measure how much your character knows &mdash; that's what Skills are for &mdash; but how quickly and effectively she processes information. Paired most often with Mental Skills for research, recall, and problem-solving.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Academics, Intelligence + Occult, Intelligence + Investigation.</p>`
  },
  "attributes_mental.wits": {
    title: "Wits",
    body: `
      <p>The ability to think on your feet. Where Intelligence is deliberate, Wits is reactive: perception, improvisation, and reading a room before anyone else does. A character with high Wits notices the ambush before it springs, finds the angle others miss, and adapts when plans fall apart.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Composure (perception), Wits + Empathy (reading deception), Wits + Investigation (crime scenes).</p>`
  },
  "attributes_mental.resolve": {
    title: "Resolve",
    body: `
      <p>Determination, patience, and depth of focus. Resolve keeps your character functioning under pressure and sustained over time. It's the will to push through pain, interrogation, supernatural coercion, and the long grind of an extended task. Resolve also contributes to your Willpower pool.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Resolve + Stamina (resisting coercion), Resolve + Composure (concentration under fire).</p>`
  },

  /* ---------------------------------- PHYSICAL ATTRIBUTES ---------------------------------- */
  "attributes_physical.strength": {
    title: "Strength",
    body: `
      <p>Muscular force applied to the world: lifting, breaking, grappling, striking. Strength determines raw damage in close combat and governs feats of physical power. It also contributes to Speed.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Strength + Athletics (jumping, climbing), Strength + Brawl (unarmed strikes), Strength + Weaponry (melee attacks).</p>`
  },
  "attributes_physical.dexterity": {
    title: "Dexterity",
    body: `
      <p>Coordination, agility, and fine motor control. Dexterity governs accuracy, balance, and speed of movement &mdash; the Attribute behind ranged attacks, acrobatics, and any task requiring precise physical execution. It also contributes to Defense and Speed.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Dexterity + Athletics (acrobatics), Dexterity + Firearms (shooting), Dexterity + Stealth (moving quietly).</p>`
  },
  "attributes_physical.stamina": {
    title: "Stamina",
    body: `
      <p>Physical endurance and the body's ability to absorb punishment. Stamina determines your Health track alongside Size, and reflects how far your character can push herself before the body gives out. It also measures resistance to deprivation, poisons, and sustained effort.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Stamina + Resolve (resisting coercion or staying conscious), Stamina + Athletics (endurance feats).</p>`
  },

  /* ----------------------------------- SOCIAL ATTRIBUTES ----------------------------------- */
  "attributes_social.presence": {
    title: "Presence",
    body: `
      <p>Raw charisma, bearing, and the gravity a character commands in a room. Presence affects first impressions, emotional sway, and the ability to change moods and minds through force of personality alone. Many Kindred Disciplines draw on Presence to project authority or fear.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Presence + Composure (first impressions), Presence + Intimidation (physical menace), Presence + Animal Ken (cowing beasts).</p>`
  },
  "attributes_social.manipulation": {
    title: "Manipulation",
    body: `
      <p>The ability to shape what others think, feel, and do through words and misdirection. Manipulation is subtle where Presence is blunt: the carefully chosen phrase, the poker face, the implication left hanging. Characters who rely on social engineering and deception live and die by their Manipulation.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Manipulation + Persuasion (fast talk, seduction), Manipulation + Subterfuge (lying), Manipulation + Politics (cutting red tape).</p>`
  },
  "attributes_social.composure": {
    title: "Composure",
    body: `
      <p>Poise, self-control, and dignity under pressure. Composure is the Attribute of keeping your mask in place when everything is going wrong. It governs Initiative alongside Dexterity, resists supernatural social intrusion, and contributes to your Willpower pool. For the Kindred, Composure is the difference between a controlled response and a Beast-driven one.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Composure (noticing threats), Resolve + Composure (resisting fear or coercion), Dexterity + Composure (maintaining balance).</p>`
  },

  /* -------------------------------------- MENTAL SKILLS -------------------------------------- */
  "skills_mental.academics": {
    title: "Academics",
    body: `
      <p>Higher education and knowledge of the humanities: history, law, literature, economics, language, and the arts. Many Kindred develop deep Academics over centuries of study &mdash; or lived experience. Useful for research, translation, understanding historical precedent, and deciphering texts from eras long past.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Academics (research, recall, translation).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> History, Law, Research, Occult Texts, Anthropology.</p>`
  },
  "skills_mental.computer": {
    title: "Computer",
    body: `
      <p>Technical fluency beyond everyday use: programming, data retrieval, network security, hacking, and digital forensics. Older Kindred often neglect this Skill; those who don't have a considerable advantage navigating the modern world.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Computer (hacking, programming), Wits + Computer (searches, data analysis).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Hacking, Data Retrieval, Digital Security, Programming.</p>`
  },
  "skills_mental.crafts": {
    title: "Crafts",
    body: `
      <p>The knowledge and skill to build, repair, and create physical objects: from fine art to automobile engines to jury-rigged weapons. Crafts bridges the practical and the aesthetic. A character without tools is significantly hampered; the Skill assumes access to appropriate materials.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Crafts (appraisal, quick repair), Intelligence + Crafts (creating or forging objects).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Automotive, Painting, Sculpture, Forgery, Jury-Rigging.</p>`
  },
  "skills_mental.investigation": {
    title: "Investigation",
    body: `
      <p>Finding answers where none are obvious. Investigation reflects the ability to examine a scene, read evidence, connect disparate facts, and work through puzzles with lateral thinking. It's the difference between looking and seeing.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Investigation (examining crime scenes, reading body language), Intelligence + Investigation (solving riddles, lab analysis).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Crime Scenes, Autopsy, Cryptography, Dreams, Artifacts.</p>`
  },
  "skills_mental.medicine": {
    title: "Medicine",
    body: `
      <p>Knowledge of the human body and how to keep it functioning: anatomy, diagnosis, first aid, and surgery. Medicine offers limited direct utility for vampires (who don't heal the way mortals do), but many Kindred develop it as hunters, doctors, or curious observers of the flesh they no longer possess.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Medicine (diagnosis), Dexterity + Medicine (surgery), Intelligence + Medicine (treating disease).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> First Aid, Surgery, Pathology, Pharmacology.</p>`
  },
  "skills_mental.occult": {
    title: "Occult",
    body: `
      <p>Knowing which parts of the old stories are true. Occult covers the lore of spirits, curses, blood magic, folklore, and the hidden world &mdash; and, crucially, the ability to separate fact from superstition. For Kindred, this often includes practical knowledge of their own condition and the things that hunt them.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Occult (identifying the grain of truth), Intelligence + Occult (connecting mythic traditions).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Vitae, Ghosts, Cr&uacute;ac, Theban Sorcery, Draugr, Revenants.</p>`
  },
  "skills_mental.politics": {
    title: "Politics",
    body: `
      <p>Understanding power structures and how to use them. Politics isn't just electoral knowledge: it's the ability to identify who actually holds authority, navigate bureaucratic systems, and make those systems work in your favor. In Kindred society, where covenant status and ancient protocol shape every interaction, Politics is survival knowledge.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Politics (identifying who's really in charge), Manipulation + Politics (working the system, managing reputations).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Carthian Movement, Invictus, Bureaucracy, Local Government, Scandals.</p>`
  },
  "skills_mental.science": {
    title: "Science",
    body: `
      <p>Knowledge of the physical and natural sciences: biology, chemistry, physics, geology, meteorology. Science is theoretical and empirical where Crafts is practical. Useful for analyzing evidence, understanding how things work, and formulating solutions to technical problems.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Science (formulating solutions, assessing variables), Wits + Science (on-the-fly analysis).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Biology, Chemistry, Physics, Forensics.</p>`
  },

  /* ------------------------------------- PHYSICAL SKILLS ------------------------------------- */
  "skills_physical.athletics": {
    title: "Athletics",
    body: `
      <p>Physical conditioning and capability across a broad range of activities: running, swimming, jumping, climbing, throwing. Athletics informs your Defense derived trait alongside the lower of Dexterity or Wits. Any physical activity that doesn't fit neatly into another Skill usually falls here.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Strength + Athletics (jumping, climbing), Dexterity + Athletics (acrobatics), Stamina + Athletics (endurance).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Climbing, Parkour, Swimming, Throwing.</p>`
  },
  "skills_physical.brawl": {
    title: "Brawl",
    body: `
      <p>Unarmed combat: punching, kicking, grappling, and fighting dirty. Brawl covers the whole spectrum from formal martial arts to street brawling. It's also the Skill used when a vampire employs her natural weapons: claws, fangs, and the strength of the undead.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Strength + Brawl (strikes, grapples), Dexterity + Brawl (quick hits, breaking free).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Boxing, Grappling, Martial Arts, Fangs, Dirty Fighting.</p>`
  },
  "skills_physical.drive": {
    title: "Drive",
    body: `
      <p>Operating and maneuvering vehicles under conditions ranging from routine to life-threatening. Drive covers cars, motorcycles, and similar vehicles &mdash; and the ability to pursue, evade, and perform under pressure on the road.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Dexterity + Drive (precision maneuvering), Wits + Drive (reacting to road hazards), Composure + Drive (staying focused during a chase).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> High-Speed Pursuit, Motorcycles, Evasion, Off-Road.</p>`
  },
  "skills_physical.firearms": {
    title: "Firearms",
    body: `
      <p>The use of ranged weapons: handguns, rifles, shotguns, and similar tools. Firearms governs accuracy, proper handling, and improvised use in messy situations. Kindred from earlier eras sometimes lack this Skill; those who acquire it often find it invaluable.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Dexterity + Firearms (shooting), Wits + Firearms (snap shots, drawing quickly).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Pistols, Rifles, Shotguns, Concealed Carry.</p>`
  },
  "skills_physical.larceny": {
    title: "Larceny",
    body: `
      <p>Breaking and entering, picking locks, picking pockets, sleight of hand, and bypassing security systems. Larceny is practical knowledge of how to take things and go places you're not supposed to. Many Kindred find this Skill useful for reasons that have nothing to do with crime.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Dexterity + Larceny (picking locks, pickpocketing), Intelligence + Larceny (analyzing security systems, planning a job).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Lockpicking, Pickpocketing, Safecracking, Security Systems.</p>`
  },
  "skills_physical.stealth": {
    title: "Stealth",
    body: `
      <p>Moving quietly, concealing yourself, and going unnoticed. Stealth is about patience and situational awareness as much as technique: knowing when to move and when to stay absolutely still. Many Kindred with Obfuscate still invest in Stealth for situations where their Discipline fails or their Beast stirs at the wrong moment.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Dexterity + Stealth (moving silently), Wits + Stealth (blending into a crowd or environment).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Shadowing, Crowds, Urban, Ambush.</p>`
  },
  "skills_physical.survival": {
    title: "Survival",
    body: `
      <p>Operating and enduring in environments where civilization offers no help. Foraging, navigation, shelter-building, and hunting animals all fall under Survival. For Kindred, it also covers hunting techniques in rural or wilderness contexts.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Survival (foraging, navigation), Dexterity + Survival (hunting animals).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Foraging, Hunting, Navigation, Shelter, Weather.</p>`
  },
  "skills_physical.weaponry": {
    title: "Weaponry",
    body: `
      <p>Fighting with held weapons: blades, clubs, chains, improvised tools. If the intent is to strike and harm with something in hand, Weaponry is the Skill. Many older Kindred carry deep expertise here, formed in centuries before firearms were reliable.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Strength + Weaponry (power strikes), Dexterity + Weaponry (precise or quick attacks).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Blades, Clubs, Improvised Weapons, Shields.</p>`
  },

  /* -------------------------------------- SOCIAL SKILLS -------------------------------------- */
  "skills_social.animalKen": {
    title: "Animal Ken",
    body: `
      <p>Understanding animal behavior and the ability to work with beasts: training, calming, and intimidating them. Animal Ken has particular value for Gangrel and those with the Animalism Discipline, complementing supernatural beast-mastery with mundane skill.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Presence + Animal Ken (cowing or calming an animal), Manipulation + Animal Ken (training).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Canines, Animalism, Training, Threatening, Wild Animals.</p>`
  },
  "skills_social.empathy": {
    title: "Empathy",
    body: `
      <p>Reading and understanding the emotional states, intentions, and hidden feelings of others. Empathy doesn't require sympathy: you can understand exactly what someone feels without agreeing with them. It's the Skill for detecting deception, navigating fraught conversations, and knowing when something is wrong beneath the surface.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Wits + Empathy (sensing deception, reading intent), Manipulation + Empathy (emotional appeals, soothing).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Lies, Motives, Buried Feelings, Calming.</p>`
  },
  "skills_social.expression": {
    title: "Expression",
    body: `
      <p>Creating and performing: writing, music, acting, oration, and any form of artistic communication intended to move an audience. Expression is used both for crafting work and for delivering it in the moment. Daeva and covenant scholars alike often cultivate this Skill.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Expression (composing, writing), Presence + Expression (performing, oration).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Musical Performance, Writing, Oration, Visual Art, Acting.</p>`
  },
  "skills_social.intimidation": {
    title: "Intimidation",
    body: `
      <p>Compelling behavior through fear: whether through physical menace, implied threats, or cold psychological pressure. Intimidation doesn't always involve raised voices or violence; sometimes the quietest approach is the most effective.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Strength + Intimidation (physical displays), Manipulation + Intimidation (psychological pressure), Presence + Intimidation (sheer menace).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Physical Threats, Interrogation, Stare-Down, Torture.</p>`
  },
  "skills_social.persuasion": {
    title: "Persuasion",
    body: `
      <p>Changing what people believe, feel, or intend through honest appeal: arguments, inspiration, seduction, charm. Where Manipulation works through misdirection, Persuasion is the direct approach: making someone genuinely want to agree with you.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Manipulation + Persuasion (fast talk, seduction), Presence + Persuasion (inspiring others, rallying a crowd).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Fast Talking, Seduction, Inspiring, Negotiation.</p>`
  },
  "skills_social.socialize": {
    title: "Socialize",
    body: `
      <p>Navigating social situations, building rapport, fitting in, and working a room. Socialize covers parties, formal events, and the casual social fabric of mortal life that Kindred must navigate nightly to maintain their Masquerade. It's not just about being liked: it's about knowing how to move through social spaces without friction.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Presence + Socialize (working a room, first contact), Manipulation + Socialize (maneuvering social dynamics).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Formal Events, Nightlife, High Society, Kindred Gatherings.</p>`
  },
  "skills_social.streetwise": {
    title: "Streetwise",
    body: `
      <p>Knowledge of how things actually work at street level: underground economies, gang structures, criminal contacts, and the unwritten rules that govern dangerous neighborhoods. Streetwise is the social skill of people and places that polite society pretends don't exist.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Intelligence + Streetwise (knowing criminal networks), Wits + Streetwise (reading a dangerous situation on the fly).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Black Market, Gang Dynamics, Drug Trade, Urban Navigation.</p>`
  },
  "skills_social.subterfuge": {
    title: "Subterfuge",
    body: `
      <p>Lying, concealing, and misdirecting. Subterfuge is the deliberate art of deception: maintaining a false identity, spinning a cover story, hiding your intentions, and manipulating what others perceive as true. It also covers the ability to recognize these same techniques when used against you.</p>
      <p class="codex-rolls"><strong>Common rolls:</strong> Manipulation + Subterfuge (active deception), Wits + Subterfuge (detecting a lie in progress).</p>
      <p class="codex-specialties"><strong>Sample specialties:</strong> Lying, Disguise, Spotting Lies, False Identity.</p>`
  },

  /* ----------------------------------- VAMPIRE-SPECIFIC TRAITS ----------------------------------- */
  "vampire_traits.humanity": {
    title: "Humanity",
    body: `
      <p>The measure of how much of your mortal self you've held onto since the Embrace. Humanity is a 10-dot track that starts at 7 for newly-made Kindred. It governs how well you can relate to the living, how the sun damages you, how easily you slip into frenzy, and how the world perceives you as the years strip away what you were.</p>
      <p>High Humanity Kindred still feel the weight of mortal life: its rhythms, its meaning, its losses. Low Humanity Kindred grow alien, predatory, and eventually monstrous.</p>
      <p>Touchstones and Humanity are bound together on the same track. Your first Touchstone is written next to the sixth Humanity dot and is considered attached so long as your Humanity is at or above that level. If Humanity falls below 6, that Touchstone is no longer attached. Touchstones gained through the Touchstone Merit are written at lower Humanity levels and function the same way.</p>
      <p>On a breaking point roll, an attached Touchstone adds +2 dice; multiple attached Touchstones add +3; no Touchstones at all imposes a &minus;2 die penalty. Willpower cannot be spent on this roll. Failure means losing a dot of Humanity and gaining a Condition. Dramatic failure adds the Jaded Condition.</p>
      <p>Losing your last Touchstone triggers its own crisis: lose a dot of Humanity and have one month to find a replacement, or take the Languid Condition while you search. Replacing a lost Touchstone requires regaining a dot of Humanity first.</p>
      <p>Actively defending your Touchstone recovers a point of Willpower. If that defense results in serious harm, it refreshes all spent Willpower. Humanity itself is not spent or rolled under normal circumstances &mdash; it is the target of a detachment roll, and it shapes mechanical caps and social penalties as it falls.</p>`
  },
  "willpower": {
    title: "Willpower",
    body: `
      <p>The raw force of your character's inner resolve, expressed as both a pool of points and a derived dot total. Your Willpower point pool equals your Resolve + Composure dots. Points refresh through your Anchors &mdash; your Mask, your Dirge, and your Touchstone &mdash; and through rest.</p>
      <p>Spending a Willpower point grants one of: add three dice to any roll, ignore wound penalties for one turn, or resist certain supernatural effects. Willpower cannot be spent on detachment rolls.</p>
      <p>A single point recovers when your character acts in defense of her Mask or Dirge in a meaningful way. Her full Willpower refreshes when she does so at genuine risk or cost. Her Touchstone also recovers a point when she actively defends it &mdash; and refreshes everything if that defense results in serious harm.</p>
      <p>Willpower dots (the permanent trait) set your maximum point pool. They can be gained through Experiences and are occasionally damaged or lost through supernatural effects.</p>`
  },

  /* --------------------------------------- DISCIPLINES --------------------------------------- */
  "disciplines_common.animalism": {
    title: "Animalism",
    body: `
      <p><em>Clan affinity: Gangrel, Ventrue.</em></p>
      <p>A vampire's Beast is a predator at the top of the food chain, and Animalism lets her slip that leash just far enough to dominate the lesser animals beneath her. It works on predators, scavengers, and carrion-eaters &mdash; the city's feral cats and dogs, rats, crows, foxes; the countryside's wolves and bears and bats. Prey animals don't respond.</p>
      <p>At low levels, Animalism lets a vampire communicate with and command individual animals. At higher levels she can raise dead animals as familiars, flood an area with the maddening scent of her Beast, and eventually claim and dominate an entire territory as her sovereign hunting ground.</p>
      <ul>
        <li><strong>1 &mdash; Feral Whispers:</strong> speak to and command individual animals.</li>
        <li><strong>2 &mdash; Raise the Familiar:</strong> infuse a dead animal with Vitae, creating an undead servant.</li>
        <li><strong>3 &mdash; Summon the Hunt:</strong> call all animals of a chosen type within a wide radius with a trail of spilled Vitae.</li>
        <li><strong>4 &mdash; Feral Infection:</strong> unleash the predatory aura in a wave, driving animals to madness and forcing frenzy in blood-bonded mortals.</li>
        <li><strong>5 &mdash; Lord of the Land:</strong> claim territory with Vitae; become its undisputed master, aware of everything within its borders.</li>
      </ul>`
  },
  "disciplines_unique.auspex": {
    title: "Auspex",
    body: `
      <p><em>Clan affinity: Mekhet.</em></p>
      <p>Auspex turns the Beast's predatory instincts inward, hunting secrets instead of prey. It reveals information through visions that range from direct impressions to hallucinatory imagery. Other vampires have no way to know when Auspex is being used against them, which is why so many Kindred grow nervous around the Mekhet. Intimate physical contact with a subject gives +3 dice to Auspex rolls.</p>
      <p>At low levels, Auspex sharpens the vampire's senses and lets her read the auras of those around her. At higher levels she can strip away psychological defenses to read secrets, touch objects to read their histories, reach into minds telepathically, and eventually project her consciousness free of her body entirely.</p>
      <ul>
        <li><strong>1 &mdash; Beast's Hackles:</strong> sense danger and weakness; can pierce Obfuscate.</li>
        <li><strong>2 &mdash; Aura Perception:</strong> read a person's emotional state, fears, and hidden nature through questions answered in imagery.</li>
        <li><strong>3 &mdash; The Spirit's Touch:</strong> read the history and emotional resonance of objects and places.</li>
        <li><strong>4 &mdash; Lay Open the Mind:</strong> establish telepathic contact; project thoughts, images, and memories into a target's mind.</li>
        <li><strong>5 &mdash; Twilight Projection:</strong> project consciousness from the body to range freely across the world; the body lies inert like a corpse.</li>
      </ul>`
  },
  "disciplines_common.celerity": {
    title: "Celerity",
    body: `
      <p><em>Clan affinity: Daeva, Mekhet.</em></p>
      <p>Where mortals blur in motion, Celerity makes a vampire disappear entirely. At its most basic, Celerity is constant: its dots add passively to Defense against melee attacks, and deny that same bonus to attackers using firearms. Even without spending Vitae, the vampire moves like a predator.</p>
      <p>Active use is more dramatic. By spending Vitae the vampire can jump the Initiative queue, interrupt another character's action with one of her own, take an additional move in a turn, or blur across distance too fast for mortal eyes to follow. No single active effect can be purchased more than once per turn, but multiple Vitae can be spent for multiple effects simultaneously.</p>
      <p><strong>Persistent:</strong> Celerity dots add to Defense against melee and subtract from firearms attacks.<br>
      <strong>Active (1 Vitae per effect):</strong> jump Initiative, interrupt an action, take an extra move, blur movement.</p>`
  },
  "disciplines_unique.dominate": {
    title: "Dominate",
    body: `
      <p><em>Clan affinity: Ventrue.</em></p>
      <p>The Beast demands obedience. Dominate slips that demand into the vampire's voice, modulating tone and word until a single steady gaze can override another's will. It requires eye contact &mdash; one-way contact is sufficient, though video feeds don't work. Commands must be simple and direct; Dominate can't handle ambiguity.</p>
      <p>At low levels, Dominate implants single commands and rewrites brief memories. At higher levels the vampire can issue complex multi-step orders, plant subconscious triggers, rewrite memory wholesale, and at its apex displace her victim's consciousness entirely and wear his body like a suit.</p>
      <ul>
        <li><strong>1 &mdash; Mesmerize:</strong> issue a simple command or alter one memory of the current scene.</li>
        <li><strong>2 &mdash; Iron Edict:</strong> issue a complex, multi-sentence command to a Mesmerized victim; lasts until completion or sunrise.</li>
        <li><strong>3 &mdash; Entombed Command:</strong> plant subconscious triggers that activate other Dominate powers when a specific stimulus is encountered.</li>
        <li><strong>4 &mdash; The Lying Mind:</strong> rewrite, erase, or create memories wholesale; inflicts Amnesia or False Memories.</li>
        <li><strong>5 &mdash; Possession:</strong> displace the victim's consciousness and inhabit his body; the vampire's own body falls into a torpor-like state.</li>
      </ul>`
  },
  "disciplines_unique.majesty": {
    title: "Majesty",
    body: `
      <p><em>Clan affinity: Daeva.</em></p>
      <p>Majesty draws on the Beast's animal magnetism and amplifies it until the vampire becomes the most important thing in any room. This isn't subtle coercion &mdash; it's arranging the world so that people will kill or die for a moment of the vampire's attention. It operates through social gravity rather than direct command, making people feel that being near this vampire is what they want more than anything else.</p>
      <p>At low levels, Majesty makes the vampire impossible to ignore or act against without effort. At higher levels she can inflict addiction-like devotion, spark jealous possessiveness in those she has touched, and ultimately enforce compliance so total it approaches slavery.</p>
      <ul>
        <li><strong>1 &mdash; Awe:</strong> the vampire becomes the focus of the room; all eyes follow her; no cost.</li>
        <li><strong>2 &mdash; Revelation:</strong> probe a victim's desires and inflict the Charmed Condition.</li>
        <li><strong>3 &mdash; Green Eyes:</strong> twist Charmed or Enthralled targets into jealous obsession directed at anyone who draws the vampire's attention.</li>
        <li><strong>4 &mdash; Loyalty:</strong> inflict deep compulsive devotion; the victim gains the Enthralled Condition and will defend the vampire against all threats.</li>
        <li><strong>5 &mdash; Idol:</strong> elevate Awe to divine or blasphemous levels; targets must roll to take any action that could harm or embarrass the vampire.</li>
      </ul>`
  },
  "disciplines_unique.nightmare": {
    title: "Nightmare",
    body: `
      <p><em>Clan affinity: Nosferatu.</em></p>
      <p>Fear is rational. Nightmare is not. Where fear responds to a presented stimulus, Nightmare indulges the Beast's desire to cause not just terror but wrongness &mdash; the conviction that something fundamental has broken in the world and will never be right again. The Nosferatu's mastery of this Discipline is what sets them apart from monsters that merely frighten.</p>
      <p>At low levels, Nightmare projects a suppressive aura of dread and forces individual flight. At higher levels the vampire implants specific delusions, manufactures hallucinations, and at its apex can generate the visceral physical experience of a victim's worst fear made flesh &mdash; stopping hearts.</p>
      <ul>
        <li><strong>1 &mdash; Dread Presence:</strong> exude a persistent aura of terror; targets cannot spend Willpower to act against her; adds Nightmare dots to Intimidation rolls.</li>
        <li><strong>2 &mdash; Face of the Beast:</strong> lock eyes with one victim and magnify their fear to a flight response; inflicts the Frightened Condition.</li>
        <li><strong>3 &mdash; The Grand Delusion:</strong> plant a specific false belief that generates deep, gut-wrenching fear; inflicts the Delusional Condition.</li>
        <li><strong>4 &mdash; Waking Nightmare:</strong> force all targets in the vampire's presence to share a single nightmarish hallucination for a scene.</li>
        <li><strong>5 &mdash; Mortal Terror:</strong> summon a victim's worst fear as a full sensory experience; requires a prior Frightened or Delusional Condition; can kill.</li>
      </ul>`
  },
  "disciplines_common.obfuscate": {
    title: "Obfuscate",
    body: `
      <p><em>Clan affinity: Mekhet, Nosferatu.</em></p>
      <p>Obfuscate tricks the mind directly, removing the vampire from the sensory information reaching the brain rather than fooling the senses outright. It affects all senses equally &mdash; smell, taste, and touch as much as sight or hearing. This is why a vampire hidden by Obfuscate leaves footprints, and why incidental contact with an Obfuscated object breaks the effect for whoever touched it.</p>
      <p>At low levels, Obfuscate makes the vampire socially invisible &mdash; present but unnoticed. At higher levels she can extend this to objects and other people, vanish completely from all perception, restyle herself as a different person entirely, and at its apex claim an entire location and bend reality within it to her will.</p>
      <ul>
        <li><strong>1 &mdash; Face in the Crowd:</strong> eyes slide off the vampire; she's just another unremarkable person; spending 1 Vitae causes complete invisibility.</li>
        <li><strong>2 &mdash; Touch of Shadow:</strong> extend the effect to a touched object or unwilling person.</li>
        <li><strong>3 &mdash; Cloak of Night:</strong> vanish entirely from sight, sound, and smell; indirect signs (footprints, creaking floors) still betray passage.</li>
        <li><strong>4 &mdash; The Familiar Stranger:</strong> instead of hiding, reshape how others perceive the vampire; she appears as a subjective type or a specific person.</li>
        <li><strong>5 &mdash; Oubliette:</strong> claim a location by spreading Vitae throughout it; become its master; control Obfuscate effects within it at range without extra cost.</li>
      </ul>`
  },
  "disciplines_unique.protean": {
    title: "Protean",
    body: `
      <p><em>Clan affinity: Gangrel.</em></p>
      <p>Every vampire is one bad day from surrendering to the Beast. Protean lets some Gangrel go further &mdash; indulging the descent and wearing it as power. It begins with the earth itself parting to receive the vampire and ends with her dissolving into hungry smoke. Every adaptation, every form, every animal shape is filtered through the Beast's predatory nature: Protean will not give a vampire the shape of prey.</p>
      <p>At low levels, Protean grants the ability to merge with the earth and grow bestial physical adaptations. At higher levels the vampire can take full animal form, manifest truly inhuman monstrous features, and ultimately shed physical form entirely into gaseous hunger.</p>
      <ul>
        <li><strong>1 &mdash; Unmarked Grave:</strong> merge with the earth or any ground material; become immune to most harm; can remain indefinitely.</li>
        <li><strong>2 &mdash; Predatory Aspect:</strong> manifest up to three chosen bestial adaptations (claws, heightened senses, wall-crawling, etc.) for a scene.</li>
        <li><strong>3 &mdash; Beast's Skin:</strong> fully transform into a predatory animal the vampire has previously consumed; retain Discipline use.</li>
        <li><strong>4 &mdash; Unnatural Aspect:</strong> manifest a fourth, truly monstrous adaptation drawn from the Beast itself rather than any natural animal.</li>
        <li><strong>5 &mdash; Primeval Miasma:</strong> dissolve into a cloud of hungry smoke; pass through any gap over an inch wide; immune to physical harm.</li>
      </ul>`
  },
  "disciplines_common.resilience": {
    title: "Resilience",
    body: `
      <p><em>Clan affinity: Gangrel, Ventrue.</em></p>
      <p>Resilience harnesses the Beast to take a vampire's natural endurance beyond the merely impossible. Persistent dots add directly to Health, calculated alongside Stamina and Size. In addition, each dot of Resilience downgrades one point of incoming aggravated damage to lethal &mdash; covering fire and most banes, though not sunlight. The sun remains beyond Resilience's reach.</p>
      <p>Active use costs 1 Vitae per effect and lets the vampire push through wound penalties or absorb a specific type of damage for a single turn.</p>
      <p><strong>Persistent:</strong> each dot adds to Health; each dot downgrades one aggravated wound to lethal (fire, banes &mdash; not sun).<br>
      <strong>Active (1 Vitae per effect):</strong> ignore wound penalties; absorb specific damage types for one turn.</p>`
  },
  "disciplines_common.vigor": {
    title: "Vigor",
    body: `
      <p><em>Clan affinity: Daeva, Nosferatu.</em></p>
      <p>Vigor tunes every bone, tendon, and muscle fiber to its highest possible performance, allowing the vampire to kick like a freight train and rend steel with her bare hands. Persistent dots add directly to Strength, and can raise it above the normal limits imposed by Blood Potency. This persistent bonus also factors into derived traits like Speed and melee damage.</p>
      <p>Active use costs 1 Vitae per effect and produces feats of strength that defy physics: breaking through barriers, leaping superhuman distances, or striking with force that treats armor as irrelevant. Multiple active effects can be stacked by spending multiple Vitae, but each individual effect can only be used once per turn.</p>
      <p><strong>Persistent:</strong> Vigor dots add to Strength, including beyond Blood Potency limits.<br>
      <strong>Active (1 Vitae per effect):</strong> superhuman feats of force, breaking, throwing, or striking.</p>`
  },
  "disciplines_common.cruac": {
    title: "Crúac",
    body: `
      <p><em>Covenant: Circle of the Crone. Status 1+ required to learn or expand; former members may use existing Crúac but cannot learn more.</em></p>
      <p>Crúac is the ritual sorcery of the Circle of the Crone &mdash; described by its opponents as a literal infection of Vitae, a living thing woven through its practitioners. The power it summons is the power of the Beast itself, paid in blood and bent to the ritualist's will by invoking the primal gods of the Crone. It works on flesh, wood, and stone. It is not concerned with intellect or lofty thought.</p>
      <p>Performing a rite is fervent and consuming. Acolytes are often pushed to the edge of frenzy during the casting. Crúac corrupts: learning a dot is a breaking point for any character at Humanity 4 or higher, and simply knowing the Discipline caps Humanity at 10 minus the character's Crúac dots.</p>
      <p>Unlike standard Disciplines, Crúac dots do nothing by themselves &mdash; they are the capacity to hold and focus power. Rites are purchased separately (2 Experiences each; one free rite per dot of Crúac). A ritualist can only know rites rated equal to or lower than her Crúac dots. Casting is an extended roll of Manipulation + Occult + Crúac, with each roll taking 30 minutes (15 if Crúac exceeds the rite's dot rating). Rituals cannot be interrupted.</p>
      <p>Sample rites include hunger-inducing blood curses, paralysis of the undead body, body-swapping possession of mortal vessels, plague-like contagion of Vitae, and the transformation of the ritualist's fangs into flesh-tearing maws that drain without nourishing.</p>`
  },
  "disciplines_unique.thebanSorcery": {
    title: "Theban Sorcery",
    body: `
      <p><em>Covenant: Lancea et Sanctum. Status 1+ required. Learning the Discipline requires oaths never to reveal its secrets. Loss of all covenant status ends access to new miracles.</em></p>
      <p>Theban Sorcery is, to the Sanctified, prayer. The covenant traces it to St. Daniel, who was led by an entity called Amoniel to a cavern beneath ancient Thebes, its walls covered in incantations that formed the basis of the tradition. To those who use it, its power feels like the touch of God's Curse transmitted onto a subject: stern, deliberate, judgmental, and uncompromising.</p>
      <p>Miracles are not cast quickly or casually. Each requires a physical sacrament &mdash; a symbolic item that crumbles to dust at the ritual's crescendo. Performing a miracle is an act of concentrated faith, mentally exhausting, and not interrupted without failure.</p>
      <p>Mechanically, casting is an extended roll of Intelligence + Academics + Theban Sorcery. Like Crúac, dots in the Discipline are the capacity; miracles are purchased separately (2 Experiences each; one free per dot). A ritualist can only access miracles rated at or below his dot count.</p>
      <p>Theban miracles are oriented toward revelation, punishment, and divination. Sample miracles include: compelling a victim to speak only truth (beetles swarm from the mouth on any lie); rendering a target incapable of speech or writing; calling down damage that upgrades bashing to lethal or lethal to aggravated; destroying a target's blood; animating corpses as servants; and the Gift of Lazarus, which can restore a dead mortal to temporary life.</p>`
  },

  /* ------------------------- KINDRED ACTIONS (macro-bar buttons) ------------------------- */
  "rite.frenzy": {
    title: "Frenzy Resistance",
    body: `
      <p>Danger, hunger, fury, or fear can goad the Beast into demanding an immediate, violent answer. Holding it back is a reflexive roll &mdash; it costs no action.</p>
      <p>The Storyteller assigns a modifier for the provocation: a slain friend or lover, an open flame, deep hunger, or a public humiliation can all swing the pool up or down. Enter that total in the dialog's modifier field.</p>
      <p>Willpower behaves differently here. It does <em>not</em> grant the usual three dice. Instead, each point spent buys one turn of visibly wrestling the Beast down &mdash; snarling, smashing, fleeing &mdash; and when the character finally stops, every point spent that way is added to the roll as a bonus die.</p>
      <p>Gangrel suffer their clan curse: their resistance pool can never exceed their Humanity dots.</p>
      <p><strong>Outcomes.</strong> Dramatic failure &mdash; frenzy that cannot end until a breaking point is reached. Failure &mdash; frenzy; the Beast decides what it wants. Success &mdash; the Beast is held back, but the character is left Tempted. Exceptional success &mdash; control held, and spent Willpower returns. Entering frenzy is worth a Beat.</p>
      <p class="codex-rolls"><strong>Roll:</strong> Resolve + Composure + provocation modifier + Willpower spent (reflexive).</p>`
  },
  "rite.detachment": {
    title: "Detachment",
    body: `
      <p>When a character commits an act that strains her conscience &mdash; a breaking point &mdash; she risks detaching from her remaining Humanity. Facing a breaking point at all is worth a Beat.</p>
      <p>The dice pool reflects how severe the act is, measured against her current Humanity: comparatively minor transgressions are rolled with more dice, genuinely monstrous ones with very few or none. Choose the severity in the dialog.</p>
      <p>Touchstones anchor her to the living world. One attached Touchstone adds +2 dice; several attached add +3; having none imposes a &minus;2 penalty. Willpower cannot be spent to help this roll.</p>
      <p><strong>Outcomes.</strong> Dramatic failure &mdash; lose a dot of Humanity and gain the Jaded Condition. Failure &mdash; lose a dot of Humanity and gain Bestial, Competitive, or Wanton. Success &mdash; Humanity holds, but she still withdraws into one of those same Conditions. Exceptional success &mdash; Humanity holds and she gains the Inspired Condition.</p>
      <p>As an alternative to losing the dot, the character may instead take a Bane &mdash; a personal supernatural flaw &mdash; along with a Beat. Each Bane taken this way makes every future detachment roll a little harder.</p>
      <p class="codex-rolls"><strong>Roll:</strong> breaking-point severity dice + Touchstone modifier (no Willpower).</p>`
  },
  "rite.lashingOut": {
    title: "Lashing Out (Predatory Aura)",
    body: `
      <p>Every Kindred carries a predatory aura &mdash; the unspoken pressure of the Beast that other monsters can feel. A vampire can deliberately flare it to force a reaction. Doing so is an instant action; it costs a Willpower point when aimed at another vampire, and nothing when aimed at a mortal.</p>
      <p>The Beast shows one of three faces. <strong>Monstrous</strong> (Strength) threatens destruction and provokes fight-or-flight. <strong>Seductive</strong> (Presence) promises abandon and provokes reckless desire. <strong>Competitive</strong> (Intelligence) demands dominance and provokes power games.</p>
      <p>The target answers with <em>fight</em> &mdash; meeting the challenge with a Power Attribute + Blood Potency of their own, which costs them a Willpower point if their Blood Potency is lower than the aggressor's &mdash; or with <em>flight</em>, a graceful but diminishing withdrawal.</p>
      <p><strong>Outcomes.</strong> Whoever scores more successes imposes the Condition tied to their aspect &mdash; Bestial (monstrous), Wanton (seductive), or Competitive &mdash; and gains +2 dice to pursue that drive for the rest of the scene. On a tie, both Conditions land and neither side takes the bonus. A mortal can resist, but can never impose a Condition back on a vampire.</p>
      <p class="codex-rolls"><strong>Roll:</strong> Blood Potency + Strength / Presence / Intelligence, contested.</p>`
  }
};
