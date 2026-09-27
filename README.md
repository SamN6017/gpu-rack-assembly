# GPU Rack Assembly Facility • 3D Digital Twin

An interactive, production-quality 3D digital twin of an automated datacenter GPU rack assembly facility built with **Next.js**, **React Three Fiber (Three.js)**, **TypeScript**, **Tailwind CSS**, and **Zustand**.

![GPU Rack Assembly Line](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![React](https://img.shields.io/badge/React-18-blue)
![Three.js](https://img.shields.io/badge/Three.js-r169-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)

---

## 🏭 Overview

The application visualizes a modern high-tech GPU server rack manufacturing cell where GPU racks (such as NVIDIA GB200 NVL72, H100 Superclusters, and AMD MI300X) flow sequentially through five assembly stations with real-time timers, blocking logic, and an interactive walkable first-person 3D environment.

### 5 Assembly Stations:
1. **Station 1**: Chassis & Busbar Assembly (48V/54V copper busbars, power shelves)
2. **Station 2**: Liquid Cold-Plate & GPU Sled Trays (8x GPU sleds, quick-disconnect blind-mate coolant manifold)
3. **Station 3**: Power & Switch Integration (33kW PSU banks, Top-of-Rack 800G InfiniBand switches)
4. **Station 4**: Optical Loom & Telemetry Harnessing (Active optical cabling, sensor loom routing)
5. **Station 5**: Automated QA & Thermal Soak (Pressure decay leak testing, 120kW load bank thermal soak)

---

## ✨ Features

- **🚶 Walkable First-Person POV**: Walk around the facility floor in first-person at eye-level using `W` `A` `S` `D` and mouse-look (PointerLockControls).
- **🛰 Seamless Overview Mode**: Elevated orbit camera with smooth lerping and camera presets (`Overview`, `Queue Bay`, `Station 1–5`, `Completed Bay`, `Kanban`).
- **📦 Physical 3D Ingestion Queue Bay**: Staged parking bays with an interactive Queue Terminal workstation console to stage new GPU racks on demand.
- **📋 Physical 3D Kanban Board**: A 13-meter digital display board mounted on the factory wall reflecting live station state and cycle statistics. Press `[E]` to open the consolidated operational dashboard.
- **⚡ Proximity Interaction System**:
  - `[E]` near Station: Inspect station progress, elapsed/remaining cycle time, and fast-forward or simulate machine blocks.
  - `[E]` near Rack: Open detailed hardware telemetry (accelerator counts, temperatures, wattage, wet weight, and milestone sign-offs).
  - `[E]` near Queue Terminal: Stage new GPU racks with custom architecture and priority.
- **⏱ Assembly Line Production Rules**:
  - Standard 12-minute cycle duration per station (720 seconds).
  - Configurable **Demo Mode** (12 seconds per station) and speed multipliers (1x, 2x, 5x, 10x).
  - Sequential progression with assembly-line blocking (racks wait if downstream station is occupied).
- **🔌 Layered Architecture for Real IoT Data**: Separated with `AssemblyDataProvider` abstraction, ready to swap from local `SimulationEngine` to live WebSocket / SSE MQTT feeds.

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 🎮 Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk and strafe across factory floor |
| `Mouse` | Look around (PointerLock) |
| `E` | Contextual interact / inspect (Stations, Racks, Terminal, Kanban) |
| `ESC` | Release mouse cursor / Close modal |
| `HUD Toggle` | Switch between First-Person Walk Mode and Overview Orbit Camera |

---

## 🏛 Architecture

```
src/
├── app/                  # Next.js App Router (Layout & Page)
├── components/
│   ├── factory/          # Canvas wrapper with dynamic SSR-disabled loading
│   ├── hud/              # Minimalist HUD (crosshair, [E] prompt, minimap, mode switch)
│   ├── modals/           # Contextual modals (Kanban, Station inspect, Add rack, Welcome)
│   ├── dashboard/        # Kanban cards, queue lists, KPIs
│   └── racks/            # Telemetry detail modal
├── three/
│   ├── FactoryScene.tsx  # Canvas setup, daylight lighting, and scene graph
│   ├── FactoryFloor.tsx  # Industrial epoxy floor, paneled walls, ceiling trusses, lights
│   ├── FirstPersonController.tsx # WASD movement & AABB collision sliding
│   ├── CameraController.tsx      # OrbitControls & smooth camera lerp transitions
│   ├── Station3D.tsx     # Physical workcell gantry, signage, robotic tool, andon towers
│   ├── Rack3D.tsx        # Server chassis, blades, manifold piping, OLED ID badge
│   ├── QueueBay3D.tsx    # Staging bays & overhead archway
│   ├── QueueTerminal3D.tsx # Physical touch terminal workstation
│   ├── CompletedBay3D.tsx  # Finished goods storage bay
│   ├── PhysicalKanbanBoard.tsx # 13m digital display board mounted on factory wall
│   └── AssemblyPath.tsx  # Conveyor tracks and animated rollers
├── simulation/
│   └── simulationEngine.ts # 12-min timers, blocking logic, animated rack transitions
├── services/
│   ├── assemblyDataProvider.ts    # Interface abstraction
│   ├── mockAssemblyProvider.ts    # Simulation bridge
│   └── realtimeAssemblyProvider.ts# WebSocket/SSE IoT skeleton
├── store/
│   └── assemblyStore.ts  # Centralized Zustand reactive store
└── types/                # Strongly-typed models (Rack, Station, Assembly)
```

---

## 📄 License
MIT
