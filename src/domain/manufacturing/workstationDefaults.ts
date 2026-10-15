// Canonical application stations; IDs are stable UUIDs, codes preserve UI IDs.
export const workstationDefaults = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    stationCode: "STATION-1",
    name: "Chassis & Busbar Assembly",
    sequence: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    stationCode: "STATION-2",
    name: "Liquid Cold-Plate & GPU Trays",
    sequence: 2,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    stationCode: "STATION-3",
    name: "Power & Switch Integration",
    sequence: 3,
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    stationCode: "STATION-4",
    name: "Optical Loom & Harnessing",
    sequence: 4,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    stationCode: "STATION-5",
    name: "Automated QA & Burn-in",
    sequence: 5,
  },
] as const;
