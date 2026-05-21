# Plan: Retro Horizontal Shooter (R-Type Style)

Build a horizontal side-scrolling shooter with pixel-art aesthetics using **PixiJS v8 + TypeScript + Vite**. Lightweight ECS-inspired architecture with object pooling. Phased delivery ensures a playable game at each milestone during your hackathon.

---

### Architecture

- **ECS-lite pattern** — entities composed of components, systems process them each frame
- **Fixed timestep** (60Hz) for logic, variable for rendering — consistent speed on all displays
- **Object pooling** for bullets, particles, enemies — avoids GC frame drops
- **Scene state machine** — Menu → Playing → GameOver
- **Level configs as TypeScript** — type-safe, can embed movement pattern functions

---

### Phases

#### Phase 1: Foundation *(get something moving and shooting)*
1. Project scaffold — Vite + PixiJS v8 + TypeScript (strict)
2. Game loop with fixed timestep
3. Input system (WASD/arrows + space)
4. Player ship — movement with bounds clamping
5. Bullet system — object-pooled, fire with cooldown
6. Scrolling parallax starfield background

**Result**: Player moves and shoots on a scrolling background.

#### Phase 2: Combat Core
7. Enemy base class — configurable movement patterns (linear, sine, follow)
8. Spawn system — time-based waves from level config
9. AABB collision detection
10. Health/damage system + hit reactions
11. Particle explosions (pooled)
12. Enemy return fire

**Result**: Full combat loop with enemies, explosions, and danger.

#### Phase 3: Game Loop & HUD
13. Score system (points + chain multiplier)
14. HUD overlay (score, lives, weapon level, boss HP bar)
15. Lives system + invincibility frames + game over
16. Menu scene
17. Wave progression + level-clear transitions

**Result**: Complete playable loop from title screen to game over.

#### Phase 4: Depth & Polish
18. Power-ups (spread, laser, missiles, shield, speed)
19. Weapon upgrade tiers with visual changes
20. Multi-phase boss fights (unique patterns, weak points)
21. Second level with different enemies/background/boss
22. Audio — Web Audio API for SFX + music
23. Visual effects — CRT scanline shader, screen shake, muzzle flash
24. Juice — hit-stop, spawn animations, score popups

**Result**: Polished retro shooter with full feature set.

---

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| PixiJS v8 (no Phaser) | Lightweight, fast iteration, real WebGL2 |
| No physics library | AABB is sufficient for shooters |
| Object pooling | Critical for 60fps with many bullets/particles |
| TypeScript level configs | Type-safe + can embed pattern functions |
| Zero runtime deps beyond PixiJS | Lean for hackathon |
| localStorage hi-scores | No backend needed |

---

### Scope

**Included**: Single-player, keyboard + gamepad, local hi-scores, 2 levels, 2 bosses, full audio/visual polish

**Excluded**: Multiplayer, mobile touch, online leaderboards, procedural generation

---

### Project Structure

```
shootergame/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                    — Entry point, init PixiJS app
│   ├── Game.ts                    — Game loop, scene management
│   ├── scenes/
│   │   ├── Scene.ts              — Base scene interface
│   │   ├── MenuScene.ts          — Title screen
│   │   ├── GameScene.ts          — Main gameplay
│   │   └── GameOverScene.ts      — Score display, restart
│   ├── entities/
│   │   ├── Entity.ts             — Base entity (Container + components)
│   │   ├── Player.ts             — Ship, weapons, lives
│   │   ├── Enemy.ts              — Base enemy with movement pattern
│   │   ├── Bullet.ts             — Projectile (pooled)
│   │   ├── PowerUp.ts            — Collectible upgrades
│   │   └── Boss.ts               — Multi-phase boss
│   ├── systems/
│   │   ├── MovementSystem.ts     — Position updates, scrolling
│   │   ├── CollisionSystem.ts    — AABB detection + resolution
│   │   ├── SpawnSystem.ts        — Wave/formation spawning from level data
│   │   ├── ParticleSystem.ts     — Explosions, trails, debris
│   │   └── WeaponSystem.ts       — Firing, cooldowns, upgrades
│   ├── managers/
│   │   ├── InputManager.ts       — Keyboard + gamepad abstraction
│   │   ├── AssetManager.ts       — Preload sprites, sounds
│   │   ├── AudioManager.ts       — SFX + music (Web Audio API)
│   │   └── ScoreManager.ts       — Score, multiplier, hi-score (localStorage)
│   ├── levels/
│   │   ├── LevelManager.ts       — Level progression, wave sequencing
│   │   ├── level1.ts             — Wave definitions for level 1
│   │   └── level2.ts             — Wave definitions for level 2
│   ├── effects/
│   │   ├── ScreenShake.ts        — Camera shake on hits/explosions
│   │   ├── CRTFilter.ts          — Retro CRT scanline shader
│   │   └── Flash.ts              — Hit flash, invincibility blink
│   ├── utils/
│   │   ├── ObjectPool.ts         — Generic pool<T> for reuse
│   │   ├── math.ts               — Lerp, clamp, vec2 helpers
│   │   └── constants.ts          — Game dimensions, speeds, tuning
│   └── types/
│       └── index.ts              — Shared type definitions
├── public/
│   ├── sprites/                   — Sprite sheets (PNG)
│   └── audio/                     — SFX + music files
└── .gitignore
```

---

### Verification

1. Each phase has a clear playable deliverable
2. Performance target: 60fps with 50+ active entities
3. Cross-browser: Chrome + Firefox + Safari
