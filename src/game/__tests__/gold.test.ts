import { describe, expect, it } from "vitest";

import {
  LevelCompletionStatus,
  type GameState,
  type GoldKey,
} from "../types";
import { TileType, type LevelData } from "../../level/types";

type CollectGold = (state: GameState) => GameState;
type UpdateLevelCompletion = (state: GameState) => GameState;
type HiddenLadderEntry = GameState["hiddenLadders"][number] & {
  revealed: boolean;
};

const RULES_MODULE_PATH = "../rules";

async function loadGoldRules(): Promise<{
  collectGold: CollectGold;
  updateLevelCompletion: UpdateLevelCompletion;
}> {
  const rulesModule = (await import(RULES_MODULE_PATH)) as {
    collectGold?: CollectGold;
    updateLevelCompletion?: UpdateLevelCompletion;
  };

  expect(rulesModule.collectGold).toBeTypeOf("function");
  expect(rulesModule.updateLevelCompletion).toBeTypeOf("function");

  return {
    collectGold: rulesModule.collectGold as CollectGold,
    updateLevelCompletion: rulesModule.updateLevelCompletion as UpdateLevelCompletion,
  };
}

function createGoldKey(row: number, col: number): GoldKey {
  return `${row},${col}`;
}

function createGrid(rows: TileType[][]): LevelData["grid"] {
  return rows.map((row) => [...row]);
}

function countVisibleGold(grid: LevelData["grid"]): number {
  return grid.flat().filter((tile) => tile === TileType.GOLD).length;
}

function createPlayer(row: number, col: number): GameState["player"] {
  return {
    row,
    col,
    isAlive: true,
  };
}

function createHiddenLadder(row: number, col: number, revealed = false): HiddenLadderEntry {
  return {
    row,
    col,
    revealed,
  };
}

function createLevelData(grid: LevelData["grid"], playerSpawn: GameState["playerPosition"]): LevelData {
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
  player = createPlayer(1, 1),
  collectedGold = [],
  hiddenLadders = [],
  totalGold,
  goldRemaining,
  allGoldCollected,
  levelComplete = false,
  exitRowThreshold = 0,
  completionStatus,
  score = 0,
}: {
  grid: LevelData["grid"];
  player?: GameState["player"];
  collectedGold?: GoldKey[];
  hiddenLadders?: HiddenLadderEntry[];
  totalGold?: number;
  goldRemaining?: number;
  allGoldCollected?: boolean;
  levelComplete?: boolean;
  exitRowThreshold?: number;
  completionStatus?: LevelCompletionStatus;
  score?: number;
}): GameState {
  const visibleGold = countVisibleGold(grid);
  const inferredTotalGold = visibleGold + collectedGold.length;
  const inferredGoldRemaining = visibleGold;
  const resolvedGoldRemaining = goldRemaining ?? inferredGoldRemaining;
  const resolvedAllGoldCollected = allGoldCollected ?? resolvedGoldRemaining === 0;
  const resolvedCompletionStatus =
    completionStatus ??
    (levelComplete
      ? LevelCompletionStatus.COMPLETED
      : resolvedAllGoldCollected
        ? LevelCompletionStatus.ALL_GOLD_COLLECTED
        : LevelCompletionStatus.IN_PROGRESS);

  return {
    levelData: createLevelData(grid, { row: player.row, col: player.col }),
    playerPosition: { row: player.row, col: player.col },
    enemyPositions: [],
    isRunning: true,
    player,
    enemies: [],
    dugHoles: [],
    hiddenLadders,
    collectedGold: new Set<string>(collectedGold),
    totalGold: totalGold ?? inferredTotalGold,
    goldRemaining: resolvedGoldRemaining,
    allGoldCollected: resolvedAllGoldCollected,
    levelComplete,
    exitRowThreshold,
    score,
    completionStatus: resolvedCompletionStatus,
    levelName: "gold-test",
  };
}

describe("collectGold", () => {
  it("collects visible gold, updates accounting, and reveals hidden ladders when the last gold is taken", async () => {
    const { collectGold } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.HIDDEN_LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      hiddenLadders: [createHiddenLadder(0, 1)],
      totalGold: 99,
      goldRemaining: 99,
      allGoldCollected: false,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    const nextState = collectGold(state);

    expect(nextState.collectedGold).toEqual(new Set<string>([createGoldKey(1, 1)]));
    expect(nextState.totalGold).toBe(1);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.allGoldCollected).toBe(true);
    expect(nextState.levelData.grid[1][1]).toBe(TileType.EMPTY);
    expect(nextState.hiddenLadders).toEqual([createHiddenLadder(0, 1, true)]);
    expect(nextState.levelComplete).toBe(false);
    expect(nextState.score).toBe(0);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.ALL_GOLD_COLLECTED);
  });

  it("is a no-op when the current tile has already been collected", async () => {
    const { collectGold } = await loadGoldRules();
    const collectedGold = [createGoldKey(1, 1)];
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      collectedGold,
      totalGold: 1,
      goldRemaining: 0,
      allGoldCollected: true,
      completionStatus: LevelCompletionStatus.ALL_GOLD_COLLECTED,
    });

    const nextState = collectGold(state);

    expect(nextState.collectedGold).toEqual(new Set<string>(collectedGold));
    expect(nextState.totalGold).toBe(1);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.levelData.grid[1][1]).toBe(TileType.EMPTY);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.ALL_GOLD_COLLECTED);
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
        }),
      ),
    ).toThrow();
  });
});

describe("updateLevelCompletion", () => {
  it("recomputes totalGold and goldRemaining from the current grid and collectedGold", async () => {
    const { updateLevelCompletion } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.GOLD],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      collectedGold: [createGoldKey(0, 1)],
      totalGold: 0,
      goldRemaining: 99,
      allGoldCollected: false,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    const nextState = updateLevelCompletion(state);

    expect(nextState.totalGold).toBe(2);
    expect(nextState.goldRemaining).toBe(1);
    expect(nextState.allGoldCollected).toBe(false);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.IN_PROGRESS);
  });

  it("transitions to ALL_GOLD_COLLECTED and reveals hidden ladders when no gold remains", async () => {
    const { updateLevelCompletion } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.HIDDEN_LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      collectedGold: [createGoldKey(0, 0), createGoldKey(1, 2)],
      hiddenLadders: [createHiddenLadder(0, 1)],
      totalGold: 0,
      goldRemaining: 2,
      allGoldCollected: false,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
      score: 3,
    });

    const nextState = updateLevelCompletion(state);

    expect(nextState.totalGold).toBe(2);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.allGoldCollected).toBe(true);
    expect(nextState.levelComplete).toBe(false);
    expect(nextState.score).toBe(3);
    expect(nextState.hiddenLadders).toEqual([createHiddenLadder(0, 1, true)]);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.ALL_GOLD_COLLECTED);
  });

  it("marks the level complete and increments score once the exit row is reached after all gold is collected", async () => {
    const { updateLevelCompletion } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      collectedGold: [createGoldKey(0, 0)],
      totalGold: 1,
      goldRemaining: 0,
      allGoldCollected: true,
      exitRowThreshold: 1,
      completionStatus: LevelCompletionStatus.ALL_GOLD_COLLECTED,
      score: 7,
    });

    const nextState = updateLevelCompletion(state);

    expect(nextState.levelComplete).toBe(true);
    expect(nextState.score).toBe(8);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.COMPLETED);
  });

  it("completes zero-gold levels as soon as the player reaches the exit row", async () => {
    const { updateLevelCompletion } = await loadGoldRules();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.HIDDEN_LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(0, 1),
      hiddenLadders: [createHiddenLadder(0, 1)],
      totalGold: 9,
      goldRemaining: 9,
      allGoldCollected: false,
      exitRowThreshold: 0,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
      score: 0,
    });

    const nextState = updateLevelCompletion(state);

    expect(nextState.totalGold).toBe(0);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.allGoldCollected).toBe(true);
    expect(nextState.levelComplete).toBe(true);
    expect(nextState.score).toBe(1);
    expect(nextState.hiddenLadders).toEqual([createHiddenLadder(0, 1, true)]);
    expect(nextState.completionStatus).toBe(LevelCompletionStatus.COMPLETED);
  });

  it("throws for nullish state and empty grids", async () => {
    const { updateLevelCompletion } = await loadGoldRules();

    expect(() => updateLevelCompletion(null as unknown as GameState)).toThrow();
    expect(() => updateLevelCompletion(undefined as unknown as GameState)).toThrow();
    expect(() =>
      updateLevelCompletion(
        createState({
          grid: [],
          player: createPlayer(0, 0),
        }),
      ),
    ).toThrow();
  });
});
