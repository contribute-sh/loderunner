import { describe, expect, it } from "vitest";

import {
  TileType,
  type BrickTimers,
  type LevelData,
  type SpawnPoint,
} from "../types";

type Assert<T extends true> = T;

type IsExact<A, B> = (<T>() => T extends A ? 1 : 2) extends <
  T,
>() => T extends B ? 1 : 2
  ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
    ? true
    : false
  : false;

type LevelDataKeys =
  | "formatVersion"
  | "name"
  | "width"
  | "height"
  | "grid"
  | "playerSpawn"
  | "enemySpawns"
  | "timers";

type _LevelDataHasCanonicalKeys = Assert<IsExact<keyof LevelData, LevelDataKeys>>;
type _LevelDataGridUsesTileType = Assert<
  IsExact<LevelData["grid"][number][number], TileType>
>;
type _LevelDataPlayerSpawnUsesSpawnPoint = Assert<
  IsExact<LevelData["playerSpawn"], SpawnPoint>
>;
type _LevelDataEnemySpawnsUseSpawnPoint = Assert<
  IsExact<LevelData["enemySpawns"][number], SpawnPoint>
>;
type _LevelDataTimersUseBrickTimers = Assert<
  IsExact<LevelData["timers"], BrickTimers>
>;
type _SpawnPointHasCanonicalKeys = Assert<
  IsExact<keyof SpawnPoint, "row" | "col">
>;
type _BrickTimersHasCanonicalKeys = Assert<
  IsExact<keyof BrickTimers, "regenDelayMs">
>;

const canonicalTileTypes = [
  TileType.EMPTY,
  TileType.BRICK,
  TileType.SOLID,
  TileType.LADDER,
  TileType.BAR,
  TileType.GOLD,
  TileType.HIDDEN_LADDER,
] as const;

const sampleLevelData = {
  formatVersion: 1,
  name: "Canonical Type Fixture",
  width: 4,
  height: 2,
  grid: [
    [TileType.EMPTY, TileType.BRICK, TileType.SOLID, TileType.LADDER],
    [TileType.BAR, TileType.GOLD, TileType.HIDDEN_LADDER, TileType.EMPTY],
  ],
  playerSpawn: {
    row: 0,
    col: 0,
  },
  enemySpawns: [],
  timers: {
    regenDelayMs: 5000,
  },
} satisfies LevelData;

describe("level type contracts", () => {
  it("defines exactly the canonical TileType values needed by the roadmap", () => {
    expect([...Object.values(TileType)].sort()).toEqual(
      [...canonicalTileTypes].sort(),
    );
  });

  it("uses the required LevelData, SpawnPoint, and BrickTimers fields", () => {
    expect(Object.keys(sampleLevelData).sort()).toEqual([
      "enemySpawns",
      "formatVersion",
      "grid",
      "height",
      "name",
      "playerSpawn",
      "timers",
      "width",
    ]);

    expect(Object.keys(sampleLevelData.playerSpawn).sort()).toEqual([
      "col",
      "row",
    ]);

    expect(Object.keys(sampleLevelData.timers)).toEqual(["regenDelayMs"]);
  });

  it("round-trips a LevelData object through JSON serialization", () => {
    expect(
      JSON.parse(JSON.stringify(sampleLevelData)) as LevelData,
    ).toEqual(sampleLevelData);
  });
});
