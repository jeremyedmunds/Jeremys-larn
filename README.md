
Today 5:16 AM
You can’t currently select between saved games. The game only maintains one browser save slot.

Save overwrites the existing saved game.

Load loads that one saved game.

The save exists only in that browser’s local storage.

So you aren’t overlooking a menu—it hasn’t been built yet. I can add multiple named save slots with dates, character level, location, and separate Load/Delete buttons.


yes do that

Worked for 1m 54s
Version 10 is live with multiple saved-game slots.

Click Saved Games at the top. You can now:

Name and save the current adventure

See each save’s date, level, location, and turn count

Load any individual save

Delete unwanted saves

Recover the old single-slot save as Original save

Open Jeremy’s Larn


Jeremy's Larn
Only visible to you

Share

Preview
Edit

Today 7:30 AM
Worked for 3m 16s
Version 14 is live.

Fixed:

Entering a dungeon level reveals only the immediate area.

Mapping effects no longer carry into another floor.

Enlightenment, expanded awareness, magic mapping, and the enlightenment spell reveal only the current level.

Chests now present a choice: Open or Pick up.

Opened chests contain 2–5 varied rewards or may trigger documented-style traps.

Sealed chests can be carried and sold at the Trading Post.

This follows the documented distinction between opening and collecting chests. Larn source history

Open Jeremy’s Larn


Jeremy's Larn
Only visible to you

Share

Preview
Edit

now fix this: The largest gaps are:

Dungeon objects and interactions
Doors
Chests that can be opened, carried, sold, trapped, or exploded
Statues that can conceal spellbooks
Thrones with removable gems and possible gnome kings
Pits and trapdoors that can drop you to another level
Mirrors that reflect projectile spells
More varied fountain and altar actions

These were important risk-versus-reward decisions in Larn, not merely scenery. Dungeon-object reference

Most spells, potions, and scrolls are not properly implemented

The game lists the original items, but many currently produce only a generic message or an approximate unrelated effect. Missing mechanics include:

Charm, sleep, fear, confusion and monster creation
Fire resistance, blindness and curing blindness
Object detection versus monster detection
Time warp and spell extension
Identify and remove curse
Gem perfection
Create artifact
Pulverization and reflected projectile spells
Haste, stealth and protection from particular monster classes

Worked for 3m 33s
Version 15 is live.

Implemented:

Pits can drop the player to the next dungeon level.

Statues require destructive magic and may expose spellbooks.

Chests, thrones, mirrors, doors, fountains, and altars now have varied risks and outcomes.

Charm, sleep, fear, and confusion independently affect monsters.

Object detection and monster detection are separate from terrain mapping.

Identify, remove curse, gem perfection, create artifact, pulverization, time warp, and spell extension have functional effects.

Life, spirit, and undead protection are distinct wards.

Stealth changes monster pursuit.

Mirrors can reflect projectile spells.

Existing saves receive compatible defaults.

Open Jeremy’s Larn


Jeremy's Larn
Only visible to you

Share

Preview
Edit

Today 12:15 PM
add thse missing items: Equipment and artifacts

Missing categories include:

Rings
Amulets
Cursed equipment
Enchanted +1, +2, etc. weapons and armor
Special artifacts
Carrying capacity
A limited inventory requiring decisions about what to retain
Dropping individual objects

Today 5:10 PM
Worked for 40s
Download Jeremys-Larn-v20-GitHub-package.zip

Extract it and open README-FIRST.md. It includes commands for pushing to your GitHub repository while preserving the project history.


ok go look at this and tell me what you see: https://github.com/jeremyedmunds/Jeremys-larn/tree/main

Worked for 1m 11s
It worked correctly. I can see:

The complete project source on the main branch

Full commit history—not merely one snapshot

Latest commit: 7010a43 — Double inventory carrying capacity

Version 19’s potion/scroll crash fix

Version 18’s directional spell casting

All earlier equipment, monster, dungeon-object, mapping, inventory, and save-system commits

Correct root structure, including app/, worker/, scripts/, package.json, and the hosting configuration

I also checked app/page.tsx directly. It contains:

The legacy-inventory crash fix

The doubled carrying capacity

Directional projectile casting

Monster behavior systems

Equipment and artifacts

So GitHub now contains the complete current version 20 and its history.

One thing should be improved: README.md is still the generic Vinext starter documentation. It should be replaced with a Jeremy’s Larn README explaining the game, controls, installation, features, and live-site link.


write this - also write how to install and run the game from this repository, ie give instructions on what to do

Worked for 1m 25s
I wrote the complete README with:

Game description and features

Controls and directional spell casting

Windows, WSL, Linux, and macOS installation

Cloning and running the repository

Production builds and tests

Save-game behavior

Project structure

Troubleshooting

Current limitations

README.md

To add it on GitHub:

Open the current README.md.

Click the pencil icon, Edit this file.

Replace all existing text with the contents of the downloaded file.

Click Commit changes.

Use the commit message: Add installation and gameplay guide.


Library
/
README.md


# Jeremy's Larn

Jeremy's Larn is a browser-based roguelike inspired by **Larn 12.3**. Explore a persistent multi-level dungeon, learn spells, collect treasure and equipment, recover the Eye of Larn, find the Potion of Dianthroritis in the volcanic depths, and return home before time expires.

Live game: <https://jeremys-larn.jeremyedmunds.chatgpt.site>

## Features

- Procedurally generated dungeon and volcanic levels
- Fog-of-war with persistent exploration memory
- Enlightenment, magic mapping, object detection, and monster detection
- Named save slots stored in the browser
- Potions, scrolls, spellbooks, gems, gold, equipment, rings, amulets, and artifacts
- Strength-based carrying capacity and individual item dropping
- Enchanted and cursed weapons and armor
- Chests that can be opened or carried to the Trading Post
- Traps, doors, fountains, altars, statues, thrones, pits, and spell-reflecting mirrors
- Directional projectile spells
- Monsters with pursuit, wandering, ambush, guarding, invisibility, theft, regeneration, resistances, ranged attacks, and level draining
- Persistent charm, sleep, fear, confusion, hold, and haste effects

## Controls

| Key | Action |
|---|---|
| `W`, `A`, `S`, `D` | Move or attack |
| Arrow keys | Move or attack |
| `I` | Review inventory |
| `C` | Open the spell list |
| `Q` | Drink a carried healing potion |
| `E` | Review the return-home objective after obtaining the cure |
| `Esc` | Cancel directional spell aiming |

Movement is currently limited to the four cardinal directions.

### Casting projectile spells

Select a projectile spell from the spell list. The game enters aiming mode. Press a movement key to fire in that direction. The projectile travels until it hits a monster, wall, door, statue, or mirror. Non-directional spells activate immediately.

## Install and run locally

### 1. Install the required software

Install:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) version **22.13 or newer**
- npm, which is included with Node.js

Confirm the installations:

```bash
git --version
node --version
npm --version
```

### 2. Clone the repository

Open PowerShell, Windows Terminal, macOS Terminal, or a Linux shell and run:

```bash
git clone https://github.com/jeremyedmunds/Jeremys-larn.git
cd Jeremys-larn
```

### 3. Install the project dependencies

On Linux or WSL:

```bash
npm run install:ci
```

The included installation script uses Linux utilities. On native Windows, use WSL or install the locked dependencies directly:

```powershell
npm ci
```

### 4. Start the development server

```bash
npm run dev
```

The terminal will display a local address, normally similar to:

```text
http://localhost:5173
```

Open that address in a web browser. Keep the terminal running while playing. Stop the server with `Ctrl+C`.

## Build and run the production version locally

Create and validate a production build:

```bash
npm run build
```

Start the built application:

```bash
npm run start
```

Open the local address printed in the terminal.

## Run the tests

```bash
npm test
```

This builds the application, validates the deployment artifact, and runs the included rendered-page test.

## Updating your local copy

From inside the repository:

```bash
git pull
npm ci
```

Then restart the development server.

## Saved games

Saved games are kept in the browser's `localStorage`. This means:

- Saves remain in the same browser profile on the same computer.
- Saves are not stored in GitHub.
- Saves are not automatically synchronized between browsers or devices.
- Clearing browser site data can delete the saved games.
- The hosted game and a locally run copy use different browser origins and therefore separate save storage.

## Project structure

| Path | Purpose |
|---|---|
| `app/page.tsx` | Game state, dungeon generation, combat, inventory, magic, saves, and main interface |
| `app/larn-data.ts` | Larn-derived spell, item, rank, experience, and store data |
| `app/globals.css` | Desktop and mobile styling |
| `worker/index.ts` | Hosted worker entry point |
| `scripts/build-verified.sh` | Production build and validation |
| `scripts/install-ci.sh` | Reproducible Linux dependency installation |
| `tests/` | Automated tests |

## Useful commands

| Command | Purpose |
|---|---|
| `npm run install:ci` | Install locked dependencies on Linux/WSL |
| `npm run dev` | Start the development server |
| `npm run build` | Create and validate a production build |
| `npm run start` | Run the production build locally |
| `npm test` | Build and run automated tests |
| `npm run validate:artifact` | Revalidate an existing build artifact |

## Troubleshooting

### `node` or `npm` is not recognized

Install the current Node.js LTS release, close the terminal, open a new terminal, and check `node --version` again.

### The installed Node.js version is too old

Upgrade to Node.js 22.13 or newer.

### `npm run install:ci` fails on Windows

The script expects Linux command-line utilities. Run the project in WSL, or use `npm ci` from PowerShell.

### The local port is already in use

Stop the other development server, or use the alternative address printed by the development command.

### A saved game is missing

Confirm that you are using the same browser profile and the same site address. `localhost`, the production website, and another local port each have separate browser storage.

## Current limitations

- No diagonal movement
- Browser-local rather than cloud-synchronized saves
- Dungeon generation does not yet reproduce every original Larn maze archetype
- Some original Larn probabilities and balance values are approximations
- Town taxation, successor characters, scoreboard, bank interest, and some economy systems remain incomplete

## License and source background

The project was developed as a modern browser interpretation of Larn, using gameplay and data references from the Larn 12.3 source distribution. Review the original Larn licensing terms before redistributing derived material outside this repository.
Library
/
README.md


# Jeremy's Larn

Jeremy's Larn is a browser-based roguelike inspired by **Larn 12.3**. Explore a persistent multi-level dungeon, learn spells, collect treasure and equipment, recover the Eye of Larn, find the Potion of Dianthroritis in the volcanic depths, and return home before time expires.

Live game: <https://jeremys-larn.jeremyedmunds.chatgpt.site>

## Features

- Procedurally generated dungeon and volcanic levels
- Fog-of-war with persistent exploration memory
- Enlightenment, magic mapping, object detection, and monster detection
- Named save slots stored in the browser
- Potions, scrolls, spellbooks, gems, gold, equipment, rings, amulets, and artifacts
- Strength-based carrying capacity and individual item dropping
- Enchanted and cursed weapons and armor
- Chests that can be opened or carried to the Trading Post
- Traps, doors, fountains, altars, statues, thrones, pits, and spell-reflecting mirrors
- Directional projectile spells
- Monsters with pursuit, wandering, ambush, guarding, invisibility, theft, regeneration, resistances, ranged attacks, and level draining
- Persistent charm, sleep, fear, confusion, hold, and haste effects

## Controls

| Key | Action |
|---|---|
| `W`, `A`, `S`, `D` | Move or attack |
| Arrow keys | Move or attack |
| `I` | Review inventory |
| `C` | Open the spell list |
| `Q` | Drink a carried healing potion |
| `E` | Review the return-home objective after obtaining the cure |
| `Esc` | Cancel directional spell aiming |

Movement is currently limited to the four cardinal directions.

### Casting projectile spells

Select a projectile spell from the spell list. The game enters aiming mode. Press a movement key to fire in that direction. The projectile travels until it hits a monster, wall, door, statue, or mirror. Non-directional spells activate immediately.

## Install and run locally

### 1. Install the required software

Install:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) version **22.13 or newer**
- npm, which is included with Node.js

Confirm the installations:

```bash
git --version
node --version
npm --version
```

### 2. Clone the repository

Open PowerShell, Windows Terminal, macOS Terminal, or a Linux shell and run:

```bash
git clone https://github.com/jeremyedmunds/Jeremys-larn.git
cd Jeremys-larn
```

### 3. Install the project dependencies

On Linux or WSL:

```bash
npm run install:ci
```

The included installation script uses Linux utilities. On native Windows, use WSL or install the locked dependencies directly:

```powershell
npm ci
```

### 4. Start the development server

```bash
npm run dev
```

The terminal will display a local address, normally similar to:

```text
http://localhost:5173
```

Open that address in a web browser. Keep the terminal running while playing. Stop the server with `Ctrl+C`.

## Build and run the production version locally

Create and validate a production build:

```bash
npm run build
```

Start the built application:

```bash
npm run start
```

Open the local address printed in the terminal.

## Run the tests

```bash
npm test
```

This builds the application, validates the deployment artifact, and runs the included rendered-page test.

## Updating your local copy

From inside the repository:

```bash
git pull
npm ci
```

Then restart the development server.

## Saved games

Saved games are kept in the browser's `localStorage`. This means:

- Saves remain in the same browser profile on the same computer.
- Saves are not stored in GitHub.
- Saves are not automatically synchronized between browsers or devices.
- Clearing browser site data can delete the saved games.
- The hosted game and a locally run copy use different browser origins and therefore separate save storage.

## Project structure

| Path | Purpose |
|---|---|
| `app/page.tsx` | Game state, dungeon generation, combat, inventory, magic, saves, and main interface |
| `app/larn-data.ts` | Larn-derived spell, item, rank, experience, and store data |
| `app/globals.css` | Desktop and mobile styling |
| `worker/index.ts` | Hosted worker entry point |
| `scripts/build-verified.sh` | Production build and validation |
| `scripts/install-ci.sh` | Reproducible Linux dependency installation |
| `tests/` | Automated tests |

## Useful commands

| Command | Purpose |
|---|---|
| `npm run install:ci` | Install locked dependencies on Linux/WSL |
| `npm run dev` | Start the development server |
| `npm run build` | Create and validate a production build |
| `npm run start` | Run the production build locally |
| `npm test` | Build and run automated tests |
| `npm run validate:artifact` | Revalidate an existing build artifact |

## Troubleshooting

### `node` or `npm` is not recognized

Install the current Node.js LTS release, close the terminal, open a new terminal, and check `node --version` again.

### The installed Node.js version is too old

Upgrade to Node.js 22.13 or newer.

### `npm run install:ci` fails on Windows

The script expects Linux command-line utilities. Run the project in WSL, or use `npm ci` from PowerShell.

### The local port is already in use

Stop the other development server, or use the alternative address printed by the development command.

### A saved game is missing

Confirm that you are using the same browser profile and the same site address. `localhost`, the production website, and another local port each have separate browser storage.

## Current limitations

- No diagonal movement
- Browser-local rather than cloud-synchronized saves
- Dungeon generation does not yet reproduce every original Larn maze archetype
- Some original Larn probabilities and balance values are approximations
- Town taxation, successor characters, scoreboard, bank interest, and some economy systems remain incomplete

## License and source background

The project was developed as a modern browser interpretation of Larn, using gameplay and data references from the Larn 12.3 source distribution. Review the original Larn licensing terms before redistributing derived material outside this repository.
