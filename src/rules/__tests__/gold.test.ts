import { describe, expect, it } from "vitest";

import { LevelCompletionStatus, type GameState, type PlayerState } from "../../game/types";
import { TileType, type LevelCell, type LevelData, type SpawnPoint } from "../../level/types";

type CollectGold = (state: GameState) => GameState;
type IsLevelComplete = (state: GameState) => boolean;

const GOLD_MODULE_PATH = "../gold";

async function loadGoldRules(): Promise<{
  collectGold: CollectGold;
  isLevelComplete: IsLevelComplete;
}> {
  const goldModule = (await import(GOLD_MODULE_PATH)) as {
    collectGold?: CollectGold;
    isLevelComplete?: IsLevelComplete;
  };

  expect(goldModule.collectGold).toBeTypeOf("function");
  expect(goldModule.isLevelComplete).toBeTypeOf("function");

  return {
    collectGold: goldModule.collectGold as CollectGold,
    isLevelComplete: goldModule.isLevelComplete as IsLevelComplete,
  };
}

function createGrid(rows: LevelCell[][]): LevelCell[][] {
  return rows.map((row) => [...row]);
}

function createPlayer(row: number, col: number): PlayerState {
  return {
    row,
    col,
    isAlive: true,
  };
}

function createLevelData(grid: LevelCell[][], playerSpawn: SpawnPoint): LevelData {
  return {
    formatVersion: 1,
    name: "gold-test",
    width: grid[0]?.length ?? 0,
    height: grid.length,
    grid: createGrid(grid),
    playerSpawn,
    enemySpawns: [],
    timers: {
      regenDelayMs: 1000,
    },
  };
}

function createState({
  grid,
  player,
  goldRemaining,
  totalGold = goldRemaining,
  allGoldCollected = goldRemaining === 0,
  levelComplete = false,
}: {
  grid: LevelCell[][];
  player: PlayerState;
  goldRemaining: number;
  totalGold?: number;
  allGoldCollected?: boolean;
  levelComplete?: boolean;
}): GameState {
  return {
    levelData: createLevelData(grid, player),
    playerPosition: { row: player.row, col: player.col },
    enemyPositions: [],
    isRunning: true,
    player,
    enemies: [],
    dugHoles: [],
    hiddenLadders: [],
    collectedGold: new Set<string>(),
    totalGold,
    goldRemaining,
    allGoldCollected,
    levelComplete,
    exitRowThreshold: 0,
    score: 0,
    completionStatus: allGoldCollected
      ? LevelCompletionStatus.ALL_GOLD_COLLECTED
      : LevelCompletionStatus.IN_PROGRESS,
    levelName: "gold-test",
  };
}

describe("collectGold", () => {
  it("picks up gold when the player is standing on a GOLD tile", async () => {
    const { collectGold } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 1,
    });

    const nextState = collectGold(state);

    expect(nextState.levelData.grid[1][1]).toBe(TileType.EMPTY);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.allGoldCollected).toBe(true);
  });

  it("does not change state when the player is not on a GOLD tile", async () => {
    const { collectGold } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.GOLD],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 1,
    });

    const nextState = collectGold(state);

    expect(nextState.levelData.grid[1][2]).toBe(TileType.GOLD);
    expect(nextState.goldRemaining).toBe(1);
    expect(nextState.allGoldCollected).toBe(false);
  });

  it("throws for nullish state and empty grids", async () => {
    const { collectGold } = await loadGoldRules();

    expect(() => collectGold(null as unknown as GameState)).toThrow();
    expect(() => collectGold(undefined as unknown as GameState)).toThrow();
    expect(() =>
      collectGold(
        createState({
          grid: [],
          player: createPlayer(0, 0),
          goldRemaining: 0,
        }),
      ),
    ).toThrow();
  });
});

describe("isLevelComplete", () => {
  it("returns false while gold remains even if the player reaches the top row", async () => {
    const { isLevelComplete } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(0, 1),
      goldRemaining: 1,
    });

    expect(isLevelComplete(state)).toBe(false);
  });

  it("returns false when all gold has been collected but the player is not at the top row", async () => {
    const { isLevelComplete } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 0,
      allGoldCollected: true,
    });

    expect(isLevelComplete(state)).toBe(false);
  });

  it("returns true when all gold has been collected and the player reaches the top row", async () => {
    const { isLevelComplete } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(0, 1),
      goldRemaining: 0,
      allGoldCollected: true,
    });

    expect(isLevelComplete(state)).toBe(true);
  });

  it("throws for nullish state and empty grids", async () => {
    const { isLevelComplete } = await loadGoldRules();

    expect(() => isLevelComplete(null as unknown as GameState)).toThrow();
    expect(() => isLevelComplete(undefined as unknown as GameState)).toThrow();
    expect(() =>
      isLevelComplete(
        createState({
          grid: [],
          player: createPlayer(0, 0),
          goldRemaining: 0,
          allGoldCollected: true,
        }),
      ),
    ).toThrow();
  });
});
