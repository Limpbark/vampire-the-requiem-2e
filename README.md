# Vampire the Requiem 2E — Foundry VTT system

An unofficial (fan-made) Foundry VTT game system for **Vampire: The Requiem 2nd Edition**.

This is a personal **offshoot of the [Chronicles of Darkness 2E](https://gitlab.com/MarlQ/mta)
system by SoulCake**, trimmed down to Vampire play and updated for **Foundry VTT v14**.

## Differences from the upstream Chronicles of Darkness 2E system

- **Foundry v14 compatible** — verified against Release 14.361. Compatibility fixes:
  - Removed the v14-incompatible TinyMCE editor configuration (core uses ProseMirror now).
  - Removed `MeasuredTemplate` usage for explosives (the document type was removed in v14);
    explosive damage to surrounding tokens is still calculated, only the blast-radius circle
    is no longer drawn.
  - Compendium packs converted from the legacy NeDB `.db` format to LevelDB pack folders.
- **Vampire-focused** — character sheets are limited to **Vampire, Ghoul, and Mortal**.
  The other Chronicles of Darkness splats (Mage, Werewolf, Changeling, Demon, Hunter,
  Sin-Eater, Mummy, Deviant, Promethean) have been removed from the character-type list.
- System id is `vampire-the-requiem-2e` so it installs alongside the original system.

## Installation

In Foundry VTT: **Game Systems → Install System**, then paste the manifest URL:

```
https://github.com/OWNER/vampire-the-requiem-2e/releases/latest/download/system.json
```

Foundry will install the latest release and prompt for updates automatically when a new
release is published.

## Updating / releasing (for the maintainer)

Releases are built automatically by GitHub Actions. To publish a new version:

```
git tag v1.0.1
git push origin v1.0.1
```

The `.github/workflows/release.yml` workflow zips the system, stamps the version from the
tag into `system.json`, and publishes a GitHub Release with `system.json` + `system.zip`
attached. The manifest URL above always points to the newest release.

## Credits

- Original **Chronicles of Darkness 2E** Foundry system by **SoulCake**
  (<https://gitlab.com/MarlQ/mta>) — please support the original author at
  <https://ko-fi.com/soulcake>.
- Source books created by White Wolf / Paradox
  (Dark Pack: <https://www.worldofdarkness.com/dark-pack>).
- Icons from <https://game-icons.net/> (CC BY 3.0) and Font Awesome.
- Some code snippets adapted from the D&D 5e system.
- GUI work contributions by Pecklaaz.

## License

The upstream Chronicles of Darkness 2E system is published by SoulCake under an
**"All rights reserved"** notice (the author states they are "usually pretty open when
asked"). This offshoot is shared for personal use and preserves that notice and all
original attribution. If you are not the maintainer of this repository, please contact the
original author before redistributing.
