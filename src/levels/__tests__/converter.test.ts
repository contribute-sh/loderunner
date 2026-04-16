import { describe, expect, it } from "vitest";

import { type LevelData, TileType } from "../../level/types";
import type { ParsedLevel } from "../parser";
import { toLevelData } from "../converter";

const DEFAULT_REGEN_DELAY_MS = 5000;

function createSpawnPoint(row: number, col: number): LevelData["playerSpawn"] {
  return { row, col };
}

describe("toLevelData", () => {
  it("converts parsed tiles and metadata into runtime LevelData", () => {
    const parsed: ParsedLevel = {
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
    };

    const levelData = toLevelData(parsed);

    expect(levelData).toEqual({
      formatVersion: 1,
      name: "Untitled",
      width: 4,
      height: 2,
      grid: [
        [TileType.BRICK, TileType.EMPTY, TileType.EMPTY, TileType.GOLD],
        [TileType.EMPTY, TileType.LADDER, TileType.BAR, TileType.SOLID],
      ],
      playerSpawn: createSpawnPoint(0, 2),
      enemySpawns: [createSpawnPoint(1, 0)],
      timers: {
        regenDelayMs: DEFAULT_REGEN_DELAY_MS,
      },
    });
    expect(levelData.grid).toHaveLength(parsed.rows);
    expect(levelData.grid.every((row) => row.length === parsed.cols)).toBe(true);
  });

  it("uses a provided level name instead of the default title", () => {
    const parsed: ParsedLevel = {
      rows: 2,
      cols: 2,
      tiles: ["P.", "E$"],
      empty: [createSpawnPoint(0, 1)],
      bricks: [],
      stones: [],
      ladders: [],
      bars: [],
      gold: [createSpawnPoint(1, 1)],
      enemies: [createSpawnPoint(1, 0)],
      playerSpawn: createSpawnPoint(0, 0),
    };

    expect(toLevelData(parsed, "Level 1").name).toBe("Level 1");
  });

  it("throws for nullish or empty parsed levels", () => {
    expect(() => toLevelData(null as unknown as ParsedLevel)).toThrow();
    expect(() => toLevelData(undefined as unknown as ParsedLevel)).toThrow();
    expect(() =>
      toLevelData(
        {
          rows: 0,
          cols: 0,
          tiles: [],
          empty: [],
          bricks: [],
          stones: [],
          ladders: [],
          bars: [],
          gold: [],
          enemies: [],
          playerSpawn: createSpawnPoint(0, 0),
        },
      ),
    ).toThrow();
  });

  it("throws when a parsed tile row contains an unsupported tile character", () => {
    expect(() =>
      toLevelData(
        {
          rows: 1,
          cols: 1,
          tiles: ["?"],
          empty: [],
          bricks: [],
          stones: [],
          ladders: [],
          bars: [],
          gold: [],
          enemies: [],
          playerSpawn: createSpawnPoint(0, 0),
        },
      ),
    ).toThrow();
  });
});
