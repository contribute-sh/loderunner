/// <reference types="vite/client" />

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TileType, type LevelData } from "../../level/types";
import { parseAsciiLevel, type ParsedLevel } from "../parser";
import goldAndEnemiesFixture from "./fixtures/gold-and-enemies.txt?raw";

const BRIDGE_MODULE_PATH = "../bridge";
const DEFAULT_REGEN_DELAY_MS = 5000;

type BridgeOptions = {
  name?: string;
  regenDelayMs?: number;
};

type ToLevelData = (
  parsed: ParsedLevel,
  options?: BridgeOptions,
) => LevelData;

function createSpawnPoint(row: number, col: number): LevelData["playerSpawn"] {
  return { row, col };
}

function createGrid(rows: TileType[][]): LevelData["grid"] {
  return rows.map((row) => [...row]);
}

function createParsedLevel(overrides: Partial<ParsedLevel> = {}): ParsedLevel {
  return {
    rows: 1,
    cols: 1,
    tiles: ["P"],
    empty: [],
    bricks: [],
    stones: [],
    ladders: [],
    bars: [],
    gold: [],
    enemies: [],
    playerSpawn: createSpawnPoint(0, 0),
    ...overrides,
  };
}

function createToLevelDataStub(): ToLevelData {
  return (_parsed, _options) => {
    throw new Error("not implemented");
  };
}

async function loadToLevelData(): Promise<ToLevelData> {
  vi.doMock(BRIDGE_MODULE_PATH, () => ({
    toLevelData: createToLevelDataStub(),
  }));

  const { toLevelData } = (await import(BRIDGE_MODULE_PATH)) as {
    toLevelData: ToLevelData;
  };

  return toLevelData;
}

describe("toLevelData", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps parsed tile characters into the expected TileType grid", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = createParsedLevel({
      rows: 2,
      cols: 4,
      tiles: ["#.P$", "EH-="],
      empty: [createSpawnPoint(0, 1)],
      bricks: [createSpawnPoint(0, 0)],
      stones: [createSpawnPoint(1, 3)],
      ladders: [createSpawnPoint(1, 1)],
      bars: [createSpawnPoint(1, 2)],
      gold: [createSpawnPoint(0, 3)],
      enemies: [createSpawnPoint(1, 0)],
      playerSpawn: createSpawnPoint(0, 2),
    });

    expect(toLevelData(parsed).grid).toEqual(
      createGrid([
        [TileType.BRICK, TileType.EMPTY, TileType.EMPTY, TileType.GOLD],
        [TileType.EMPTY, TileType.LADDER, TileType.BAR, TileType.SOLID],
      ]),
    );
  });

  it("passes the parsed player spawn through to LevelData", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = createParsedLevel({
      rows: 3,
      cols: 3,
      tiles: ["...", ".P.", "..."],
      empty: [
        createSpawnPoint(0, 0),
        createSpawnPoint(0, 1),
        createSpawnPoint(0, 2),
        createSpawnPoint(1, 0),
        createSpawnPoint(1, 2),
        createSpawnPoint(2, 0),
        createSpawnPoint(2, 1),
        createSpawnPoint(2, 2),
      ],
      playerSpawn: createSpawnPoint(1, 1),
    });

    expect(toLevelData(parsed).playerSpawn).toEqual(createSpawnPoint(1, 1));
  });

  it("maps parsed enemy coordinates to enemy spawn points", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = createParsedLevel({
      rows: 3,
      cols: 4,
      tiles: ["P...", ".E..", "..E."],
      empty: [
        createSpawnPoint(0, 1),
        createSpawnPoint(0, 2),
        createSpawnPoint(0, 3),
        createSpawnPoint(1, 0),
        createSpawnPoint(1, 2),
        createSpawnPoint(1, 3),
        createSpawnPoint(2, 0),
        createSpawnPoint(2, 1),
        createSpawnPoint(2, 3),
      ],
      enemies: [createSpawnPoint(1, 1), createSpawnPoint(2, 2)],
      playerSpawn: createSpawnPoint(0, 0),
    });

    expect(toLevelData(parsed).enemySpawns).toEqual([
      createSpawnPoint(1, 1),
      createSpawnPoint(2, 2),
    ]);
  });

  it("applies default metadata and timers when overrides are omitted", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = createParsedLevel({
      rows: 2,
      cols: 3,
      tiles: ["P..", "..$"],
      empty: [
        createSpawnPoint(0, 1),
        createSpawnPoint(0, 2),
        createSpawnPoint(1, 0),
        createSpawnPoint(1, 1),
      ],
      gold: [createSpawnPoint(1, 2)],
      playerSpawn: createSpawnPoint(0, 0),
    });

    expect(toLevelData(parsed)).toMatchObject({
      formatVersion: 1,
      name: "Untitled",
      width: 3,
      height: 2,
      timers: {
        regenDelayMs: DEFAULT_REGEN_DELAY_MS,
      },
    });
  });

  it("uses optional name and regenDelayMs overrides when provided", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = createParsedLevel({
      rows: 2,
      cols: 2,
      tiles: ["P.", ".$"],
      empty: [createSpawnPoint(0, 1), createSpawnPoint(1, 0)],
      gold: [createSpawnPoint(1, 1)],
      playerSpawn: createSpawnPoint(0, 0),
    });

    expect(
      toLevelData(parsed, {
        name: "Level 1",
        regenDelayMs: 3000,
      }),
    ).toMatchObject({
      name: "Level 1",
      timers: {
        regenDelayMs: 3000,
      },
    });
  });

  it("throws for nullish or empty parsed levels", async () => {
    const toLevelData = await loadToLevelData();
    expect(() => toLevelData(null as unknown as ParsedLevel)).toThrow();
    expect(() => toLevelData(undefined as unknown as ParsedLevel)).toThrow();
    expect(() =>
      toLevelData(
        createParsedLevel({
          rows: 0,
          cols: 0,
          tiles: [],
        }),
      ),
    ).toThrow();
  });

  it("throws when the parsed tiles contain an unknown character", async () => {
    const toLevelData = await loadToLevelData();
    expect(() =>
      toLevelData(
        createParsedLevel({
          rows: 1,
          cols: 1,
          tiles: ["?"],
        }),
      ),
    ).toThrow();
  });

  it("converts the gold-and-enemies fixture into the full expected LevelData", async () => {
    const toLevelData = await loadToLevelData();
    const parsed = parseAsciiLevel(goldAndEnemiesFixture);

    expect(toLevelData(parsed)).toEqual({
      formatVersion: 1,
      name: "Untitled",
      width: 5,
      height: 5,
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.LADDER, TileType.BAR, TileType.GOLD],
        [TileType.EMPTY, TileType.BRICK, TileType.EMPTY, TileType.SOLID, TileType.EMPTY],
        [TileType.GOLD, TileType.BAR, TileType.LADDER, TileType.BAR, TileType.EMPTY],
        [TileType.EMPTY, TileType.SOLID, TileType.BRICK, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.GOLD, TileType.EMPTY, TileType.EMPTY],
      ]),
      playerSpawn: createSpawnPoint(0, 0),
      enemySpawns: [createSpawnPoint(1, 2), createSpawnPoint(2, 4)],
      timers: {
        regenDelayMs: DEFAULT_REGEN_DELAY_MS,
      },
    });
  });
});
