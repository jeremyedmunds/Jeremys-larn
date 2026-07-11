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
