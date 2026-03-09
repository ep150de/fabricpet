# 🐾 FabricPet

**A Tamagotchi-style virtual pet living in the RP1 spatial fabric metaverse, powered by Bitcoin Ordinals and Nostr.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-100%25-brightgreen.svg)]()

---

## 🌟 What is FabricPet?

FabricPet is an open-source virtual pet application that combines:

- 🥚 **Tamagotchi-style pet care** — Feed, play, clean, and nurture your pet through 5 evolution stages
- ⚔️ **Pokémon-style battles** — Turn-based combat with elemental types, status effects, and STAB bonuses
- ₿ **Bitcoin Ordinals integration** — Use your ordinal inscriptions as pet skins that influence battle stats
- 📡 **Nostr-powered persistence** — Your pet state is stored on Nostr relays (NIP-78) — you own your data
- 🌐 **RP1 Spatial Fabric ready** — MVMF bridge prepared for RP1 metaverse integration
- 🎭 **Open Source Avatars** — VRM avatar support via the [Open Source Avatars](https://github.com/ToxSam/open-source-avatars) protocol

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FabricPet App                     │
├──────────┬──────────┬──────────┬───────────────────┤
│  Pet     │  Battle  │  Wallet  │  Home/Spatial      │
│  View    │  Screen  │  View    │  View              │
├──────────┴──────────┴──────────┴───────────────────┤
│                  Zustand Store                       │
├──────────┬──────────┬──────────┬───────────────────┤
│  Pet     │  Battle  │  Wallet  │  Avatar            │
│  Engine  │  Engine  │  Connect │  Loader            │
├──────────┴──────────┴──────────┴───────────────────┤
│              Nostr Layer (NIP-07, NIP-78)            │
├─────────────────────┬───────────────────────────────┤
│  RP1 MVMF Bridge    │  Bitcoin Ordinals (UniSat/    │
│  (Spatial Fabric)   │  Xverse via sats-connect)     │
└─────────────────────┴───────────────────────────────┘
```

## 🎮 Features

### Pet System
- **5 Evolution Stages**: Egg → Baby → Teen → Adult → Elder
- **4 Needs**: Hunger, Happiness, Energy, Hygiene (real-time decay)
- **8 Moods**: Happy, Playful, Content, Hungry, Tired, Sad, Sick, Excited
- **Behavior Tree AI**: Autonomous pet behavior in the spatial home
- **XP & Leveling**: Gain XP from care actions and battles

### Battle System
- **Turn-based combat** with speed-priority resolution
- **7 Elemental Types**: Fire, Water, Earth, Air, Light, Dark, Neutral
- **Type effectiveness chart** (super effective / not very effective)
- **STAB bonus** (Same Type Attack Bonus)
- **Status effects**: Sleepy, Dizzy, Dazzled, Charmed, Pumped
- **18+ moves** across Attack, Special, Defense, Support, and Status categories
- **Deterministic RNG** using seeded hashing for verifiable battles

### Bitcoin Ordinals
- **UniSat wallet** integration (browser extension)
- **Xverse wallet** integration (via sats-connect)
- **Ordinal → Pet skin**: Your inscription's image becomes your pet's appearance
- **Trait → Stats**: Ordinal metadata traits boost battle stats
- **Trait → Element**: Keywords in traits determine elemental type
- **Rarity multiplier**: Rarer ordinals give higher stat multipliers

### Nostr Integration
- **NIP-07**: Browser extension signing (nos2x, Alby)
- **NIP-78**: App-specific data storage (kind 30078)
- **Auto-generated keys**: For users without a Nostr extension
- **Relay pool**: Publishes to multiple relays for redundancy
- **Battle challenges**: Send/receive challenges via Nostr events

### RP1 Spatial Fabric
- **MVMF Bridge**: Pet and home state formatted as MVMF models
- **NSO Service**: AI behavior endpoints defined for RP1 integration
- **Spatial registration**: Ready to register as a fabric node
- **Visitor system**: Guestbook and visitor detection prepared

### Open Source Avatars
- **VRM model loading** via @pixiv/three-vrm
- **Avatar catalog** from the OSA repository
- **Placeholder pet** (cute 3D sphere) when no VRM is loaded
- **Three.js rendering** with proper lighting and materials

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/fabricpet.git
cd fabricpet

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🛠️ Tech Stack

All open source tools and libraries:

| Layer | Technology | License |
|-------|-----------|---------|
| Framework | React 19 + TypeScript | MIT |
| Build | Vite 7 | MIT |
| Styling | Tailwind CSS 4 | MIT |
| State | Zustand | MIT |
| 3D | Three.js + @pixiv/three-vrm | MIT |
| Identity | nostr-tools (NIP-07, NIP-78) | Unlicense |
| Wallet | sats-connect (Xverse) | MIT |
| Avatars | Open Source Avatars protocol | CC-BY-4.0 |
| Metaverse | RP1 MVMF Bridge (stub) | MIT |

## 📁 Project Structure

```
src/
├── types/              # TypeScript type definitions
│   └── index.ts        # All interfaces and types
├── utils/              # Utility functions
│   ├── constants.ts    # Game constants, relay URLs, evolution tables
│   └── hash.ts         # Deterministic hashing utilities
├── engine/             # Core game engine
│   ├── PetStateMachine.ts  # Pet creation, evolution, mood, XP
│   ├── NeedsSystem.ts      # Hunger/happiness/energy/hygiene decay
│   ├── MoveDatabase.ts     # All 18+ battle moves
│   └── BehaviorTree.ts     # Autonomous pet AI behavior
├── battle/             # Battle system
│   └── BattleEngine.ts     # Turn-based combat with type effectiveness
├── nostr/              # Nostr integration
│   ├── relayManager.ts     # Relay pool management
│   ├── identity.ts         # NIP-07 key management
│   └── petStorage.ts       # NIP-78 save/load pet state
├── wallet/             # Bitcoin wallet integration
│   └── WalletConnect.ts    # UniSat + Xverse + ordinal traits
├── avatar/             # Avatar system
│   └── AvatarLoader.ts     # OSA + VRM model loading
├── rp1/                # RP1 metaverse integration
│   └── MVMFBridge.ts       # MVMF model + NSO service stubs
├── store/              # Global state
│   └── useStore.ts         # Zustand store
└── components/         # React UI components
    ├── Navigation.tsx       # Bottom nav bar
    ├── Notification.tsx     # Toast notifications
    ├── SetupScreen.tsx      # New pet creation
    ├── PetView.tsx          # Main pet interaction
    ├── HomeView.tsx         # Spatial home environment
    ├── BattleScreen.tsx     # Turn-based battle UI
    └── WalletView.tsx       # Wallet connection & ordinals
```

## 🔮 Roadmap

### Phase 1 ✅ — Core Pet + Nostr
- [x] Pet state machine (needs, moods, XP, evolution)
- [x] Nostr identity (NIP-07 + auto-generated keys)
- [x] NIP-78 pet state persistence
- [x] Behavior tree AI

### Phase 2 ✅ — Battle + Wallet
- [x] Turn-based battle engine with elemental types
- [x] UniSat + Xverse wallet integration
- [x] Ordinal trait → stat mapping
- [x] Practice battles vs CPU

### Phase 1.5 ✅ — RP1 Scene Integration
- [x] Scene Assembler JSON generator (dynamic Bitcoin-to-RP1)
- [x] GLB export with Web Share API
- [x] MVMF bridge with scene push
- [x] Ordinals rendered directly from blockchain in RP1

### Phase 6 ✅ — LLM Pet Chat Agent
- [x] Ollama + vLLM + OpenAI-compatible endpoint support
- [x] Dynamic personality system (elemental type, mood, stage, battle record)
- [x] Streaming chat with conversation history
- [x] Configurable settings (endpoint, model, temperature)

### Phase 3A ✅ — HoloBall Arena Integration
- [x] Full holoball-arena repo integrated (github.com/sayree121/holoball-arena)
- [x] Arena system with 7 biomes (Cyber Grid, Volcanic Forge, Deep Ocean, Crystal Cavern, Void Nexus, Sky Temple, Overgrown Ruins)
- [x] HoloBall system (throw, materialize, deploy, recall)
- [x] Battle arena manager, visualizer, and camera system
- [x] NSO services (Arena, Matchmaking, Spectator, Tournament)
- [x] Spatial registration and proximity detection

### Phase 3B-D ✅ — Multiplayer + Social
- [x] P2P battles via Nostr events (relay code + UI)
- [x] Challenge lobby with incoming challenge cards
- [x] Leaderboard — queries Nostr relays, ranks by wins/win rate/level
- [x] Pet visiting via npub or hex pubkey
- [x] Guestbook signing (NIP-78 events)

### Phase 4 ✅ — Live RP1 Scene Sync
- [x] Auto-sync scene to RP1 when wallet inscriptions change
- [x] Debounced SceneSync with change detection
- [x] Force sync and reset capabilities

### Phase 5 ✅ — AR + PWA + Sound
- [x] Camera AR mode — see your pet overlaid on real world
- [x] 3D pet rendering with Three.js on camera feed
- [x] WebXR immersive AR detection (ready for future)
- [x] Procedural sound effects via Web Audio API (16 sound types)
- [x] PWA manifest + service worker for offline support
- [x] Installable as home screen app

## 🤝 Contributing

FabricPet is 100% open source. Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Credits

- [RP1](https://rp1.com) — Spatial fabric metaverse protocol
- [Open Source Avatars](https://github.com/ToxSam/open-source-avatars) — Avatar protocol by ToxSam
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) — Nostr protocol library
- [Three.js](https://threejs.org/) — 3D rendering
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) — VRM avatar support
- [sats-connect](https://github.com/secretkeylabs/sats-connect) — Bitcoin wallet connection
- [Zustand](https://github.com/pmndrs/zustand) — State management
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Vite](https://vitejs.dev/) — Build tool

---

*Built with ❤️ for the open metaverse*
