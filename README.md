# HAG Fighter

A 2D arcade fighting game that runs in the browser: no build step and no external assets. Every character, stage, sound and song is generated in code.

**Play:** open `index.html` in a browser. Or serve the folder (`python3 -m http.server`) and visit `http://localhost:8000`.

## Features
- **6 fighters + 1 boss**, each with 9 normals, a throw, 3 specials and a super:
  | Fighter | From | Style | Plays like |
  |---|---|---|---|
  | TALA | Philippines | Eskrima (twin rattan sticks) | fast rushdown, multi-hit flurries |
  | BRONN | Iceland | Glima wrestling | slow giant, command grabs, armored charge |
  | VOLTA | Brazil | Capoeira | spinning kicks, fireball (Sol Orb) |
  | SURI | India | Kalaripayattu (urumi whip-sword) | long-range zoner |
  | DUKE | USA (Detroit) | Street brawler | dash punches, overhead |
  | NOVA | Kenya | Cyber ninjutsu | teleport, fast kunai |
  | ZERAK (boss) | The Citadel | Void sorcery | armored, big projectiles. Unlocked after your first arcade clear |
- **4 stages + boss stage:** Sunset Harbor, Emerald Ruins, Neon Market, Frostpeak Monastery and the Obsidian Citadel. Each has parallax layers, animated crowds and its own chiptune track.
- **Parry system:** tap PARRY just before a hit lands. You take no damage, recover instantly, and gain meter and coins. It works on every attack, including projectiles, lows and air attacks. Throws are the exception. A successful parry opens a short chain window so you can parry multi-hit moves. Missing a parry leaves you open.
- **Arcade mode:** fight the other 5 fighters, then **Zerak** at the Obsidian Citadel. You get a continue screen on a loss and an ending for each character.
- **Incremental / idle progression** (saved in localStorage):
  - **Coins** from every hit, combo, parry, round win, perfect and time bonus.
  - **Dojo upgrades:** Vitality, Power, Iron Skin, Focus, Parry Mastery (wider parry window), Fortune and Second Wind (regen).
  - **Students** earn coins every second, including 50% while you're away (up to 8 hours).
  - **Heat levels:** each arcade clear unlocks a harder Heat. Enemies get tougher and coin rewards grow.
  - **Ascension (prestige):** reset coins, upgrades and students for permanent Spirit (+10% coins and +2% damage each).
  - **Character mastery:** XP per fight gives a damage bonus and unlocks alternate color palettes at levels 2 and 5.
- Versus CPU, local 2-player versus, and a training mode with dummy settings (stand, block, parry, jump, cpu).
- Keyboard, gamepad and touch controls.

## Controls
| | P1 | P2 |
|---|---|---|
| Move / jump / crouch | W A S D | Arrows |
| Light | J | Num 1 |
| Heavy | K | Num 2 |
| Kick | L | Num 3 |
| Parry | U | Num 4 |
| Special | I | Num 5 |
| Super | O | Num 6 |
| Pause | Enter / Esc | Num Enter |

- **Block:** hold back. Crouch-block lows; stand-block overheads and jump-ins.
- **Specials:** `SP` (neutral), `SP+forward` and `SP+up`. Classic motions also work: `QCF+P`, `QCB+P/K` and `DP+P`.
- **Super:** with a full meter, press `SUPER` or do `QCF x2 + P`.
- **Throw:** Light + Kick together, up close.
- Light attacks chain, and normals cancel into specials on hit or block.

## Code layout
```
index.html          entry point
css/style.css       page + touch controls
js/util.js          constants, helpers, text drawing
js/audio.js         WebAudio sound effects + procedural chiptune music
js/input.js         keyboard / gamepad / touch
js/save.js          persistence, upgrades, students, ascension, mastery
js/characters.js    pose library (skeletal), move data, roster
js/render.js        IK/FK skeleton solver, procedural character renderer, effects
js/stages.js        procedural parallax stages
js/fighter.js       fighter state machine, motion inputs, parry, grabs, physics
js/ai.js            CPU opponent + training dummy modes
js/match.js         rounds, hit resolution, projectiles, HUD, coin rewards
js/scenes.js        title, menus, select, VS, arcade flow, dojo, help, options
js/main.js          boot + fixed 60 fps loop
```
