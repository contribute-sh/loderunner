import { describe, expect, it } from "vitest";

import { TileType, type LevelData, type SpawnPoint } from "./types";

type LegacyTileType =
  | TileType.EMPTY
  | TileType.BRICK
  | TileType.LADDER
  | TileType.BAR
  | TileType.GOLD
  | TileType.SPAWN_PLAYER
  | TileType.SPAWN_ENEMY;

interface LegacyLevelData {
  name: string;
  width?: number;
  height?: number;
  tiles: LegacyTileType[][];
  formatVersion?: number;
  timers?: LevelData["timers"];
}

type NormalizeLevel = (level: unknown) => LevelData;

const NORMALIZE_MODULE_PATH = "../level/normalize";
const DEFAULT_FORMAT_VERSION = 1;
const DEFAULT_REGEN_DELAY_MS = 5000;

async function loadNormalizeLevel(): Promise<NormalizeLevel> {
  const normalizeModule = (await import(NORMALIZE_MODULE_PATH)) as {
    normalizeLevel?: NormalizeLevel;
  };

  expect(normalizeModule.normalizeLevel).toBeTypeOf("function");

  return normalizeModule.normalizeLevel as NormalizeLevel;
}

function createSpawnPoint(row: number, col: number): SpawnPoint {
  return { row, col };
}

function createGrid(rows: TileType[][]): LevelData["grid"] {
  return rows.map((row) => [...row]);
}

function createLegacyTiles(rows: LegacyTileType[][]): LegacyLevelData["tiles"] {
  return rows.map((row) => [...row]);
}

describe("normalizeLevel", () => {
  it("converts a legacy tiles-based level by extracting embedded spawn tiles into canonical fields", async () => {
    const normalizeLevel = await loadNormalizeLevel();
    const legacyLevel: LegacyLevelData = {
      name: "Legacy Spawns",
      width: 4,
      height: 3,
      formatVersion: 4,
      timers: {
        regenDelayMs: 2500,
      },
      tiles: createLegacyTiles([
        [TileType.BRICK, TileType.SPAWN_PLAYER, TileType.GOLD, TileType.EMPTY],
        [TileType.LADDER, TileType.BAR, TileType.SPAWN_ENEMY, TileType.BRICK],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY, TileType.SPAWN_ENEMY],
      ]),
    };
    const expected: LevelData = {
      formatVersion: 4,
      name: "Legacy Spawns",
      width: 4,
      height: 3,
      grid: createGrid([
        [TileType.BRICK, TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.LADDER, TileType.BAR, TileType.EMPTY, TileType.BRICK],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY, TileType.EMPTY],
      ]),
      playerSpawn: createSpawnPoint(0, 1),
      enemySpawns: [createSpawnPoint(1, 2), createSpawnPoint(2, 3)],
      timers: {
        regenDelayMs: 2500,
      },
    };

    expect(normalizeLevel(legacyLevel)).toEqual(expected);
  });

  it("passes canonical level data through unchanged", async () => {
    const normalizeLevel = await loadNormalizeLevel();
    const canonicalLevel: LevelData = {
      formatVersion: 2,
      name: "Canonical Level",
      width: 3,
      height: 2,
      grid: createGrid([
        [TileType.HIDDEN_LADDER, TileType.EMPTY, TileType.GOLD],
        [TileType.SOLID, TileType.BRICK, TileType.LADDER],
      ]),
      playerSpawn: createSpawnPoint(0, 1),
      enemySpawns: [createSpawnPoint(1, 1)],
      timers: {
        regenDelayMs: 1800,
      },
    };

    expect(normalizeLevel(canonicalLevel)).toEqual(canonicalLevel);
  });

  it("maps legacy tile values that predate SOLID and HIDDEN_LADDER into the canonical grid", async () => {
    const normalizeLevel = await loadNormalizeLevel();
    const legacyLevel: LegacyLevelData = {
      name: "Legacy Tiles",
      width: 5,
      height: 2,
      formatVersion: 3,
      timers: {
        regenDelayMs: 1200,
      },
      tiles: createLegacyTiles([
        [TileType.EMPTY, TileType.BRICK, TileType.LADDER, TileType.BAR, TileType.GOLD],
        [TileType.SPAWN_PLAYER, TileType.EMPTY, TileType.SPAWN_ENEMY, TileType.BRICK, TileType.GOLD],
      ]),
    };

    expect(normalizeLevel(legacyLevel).grid).toEqual(
      createGrid([
        [TileType.EMPTY, TileType.BRICK, TileType.LADDER, TileType.BAR, TileType.GOLD],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.BRICK, TileType.GOLD],
      ]),
    );
  });

  it("supplies default formatVersion and timers when a legacy level omits them", async () => {
    const normalizeLevel = await loadNormalizeLevel();
    const legacyLevel: LegacyLevelData = {
      name: "Defaults",
      width: 2,
      height: 2,
      tiles: createLegacyTiles([
        [TileType.SPAWN_PLAYER, TileType.EMPTY],
        [TileType.GOLD, TileType.SPAWN_ENEMY],
      ]),
    };
    const expected: LevelData = {
      formatVersion: DEFAULT_FORMAT_VERSION,
      name: "Defaults",
      width: 2,
      height: 2,
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY],
        [TileType.GOLD, TileType.EMPTY],
      ]),
      playerSpawn: createSpawnPoint(0, 0),
      enemySpawns: [createSpawnPoint(1, 1)],
      timers: {
        regenDelayMs: DEFAULT_REGEN_DELAY_MS,
      },
    };

    expect(normalizeLevel(legacyLevel)).toEqual(expected);
  });

  it("throws for nullish or empty level input", async () => {
    const normalizeLevel = await loadNormalizeLevel();

    expect(() => normalizeLevel(null)).toThrow();
    expect(() => normalizeLevel(undefined)).toThrow();
    expect(() => normalizeLevel({})).toThrow();
  });

  it("throws when a legacy tiles-based level does not contain a player spawn tile", async () => {
    const normalizeLevel = await loadNormalizeLevel();
    const legacyLevel: LegacyLevelData = {
      name: "No Player",
      width: 2,
      height: 2,
      tiles: createLegacyTiles([
        [TileType.EMPTY, TileType.GOLD],
        [TileType.BRICK, TileType.SPAWN_ENEMY],
      ]),
    };

    expect(() => normalizeLevel(legacyLevel)).toThrow();
  });

  it("throws when legacy level dimensions are missing", async () => {
    const normalizeLevel = await loadNormalizeLevel();

    expect(() =>
      normalizeLevel({
        name: "Missing Width",
        height: 1,
        tiles: createLegacyTiles([[TileType.SPAWN_PLAYER]]),
      }),
    ).toThrow();
    expect(() =>
      normalizeLevel({
        name: "Missing Height",
        width: 1,
        tiles: createLegacyTiles([[TileType.SPAWN_PLAYER]]),
      }),
    ).toThrow();
  });
});
