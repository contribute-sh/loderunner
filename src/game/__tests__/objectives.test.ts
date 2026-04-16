import { describe, expect, it } from "vitest";

import { TileType, type LevelData } from "../../level/types";
import {
  LevelCompletionStatus,
  type GameState,
  type GoldKey,
  type HiddenLadderState,
} from "../types";

type CollectGold = (state: GameState, row: number, col: number) => void;
type RevealHiddenLadders = (state: GameState, grid: LevelData["grid"]) => void;
type CheckLevelComplete = (state: GameState) => boolean;

const OBJECTIVES_MODULE_PATH = "../objectives";
const GOLD_SCORE = 100;

async function loadObjectives(): Promise<{
  collectGold: CollectGold;
  revealHiddenLadders: RevealHiddenLadders;
  checkLevelComplete: CheckLevelComplete;
}> {
  const objectivesModule = (await import(OBJECTIVES_MODULE_PATH)) as {
    collectGold?: CollectGold;
    revealHiddenLadders?: RevealHiddenLadders;
    checkLevelComplete?: CheckLevelComplete;
  };

  expect(objectivesModule.collectGold).toBeTypeOf("function");
  expect(objectivesModule.revealHiddenLadders).toBeTypeOf("function");
  expect(objectivesModule.checkLevelComplete).toBeTypeOf("function");

  return {
    collectGold: objectivesModule.collectGold as CollectGold,
    revealHiddenLadders: objectivesModule.revealHiddenLadders as RevealHiddenLadders,
    checkLevelComplete: objectivesModule.checkLevelComplete as CheckLevelComplete,
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

function createHiddenLadder(row: number, col: number, revealed = false): HiddenLadderState {
  return {
    row,
    col,
    revealed,
  };
}

function createLevelData(grid: LevelData["grid"], playerSpawn: GameState["playerPosition"]): LevelData {
  return {
    formatVersion: 1,
    name: "objectives-test",
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
  hiddenLadders = [],
  collectedGold = [],
  totalGold,
  goldRemaining,
  allGoldCollected,
  exitRowThreshold = 0,
  completionStatus,
  score = 0,
}: {
  grid: LevelData["grid"];
  player?: GameState["player"];
  hiddenLadders?: HiddenLadderState[];
  collectedGold?: GoldKey[];
  totalGold?: number;
  goldRemaining?: number;
  allGoldCollected?: boolean;
  exitRowThreshold?: number;
  completionStatus?: LevelCompletionStatus;
  score?: number;
}): GameState {
  const resolvedGoldRemaining = goldRemaining ?? countVisibleGold(grid);
  const resolvedAllGoldCollected = allGoldCollected ?? resolvedGoldRemaining === 0;

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
    totalGold: totalGold ?? countVisibleGold(grid) + collectedGold.length,
    goldRemaining: resolvedGoldRemaining,
    allGoldCollected: resolvedAllGoldCollected,
    levelComplete: false,
    exitRowThreshold,
    score,
    completionStatus:
      completionStatus ??
      (resolvedAllGoldCollected
        ? LevelCompletionStatus.ALL_GOLD_COLLECTED
        : LevelCompletionStatus.IN_PROGRESS),
    levelName: "objectives-test",
  };
}

describe("collectGold", () => {
  it("adds the gold key, decrements remaining gold, and awards score for a non-final pickup", async () => {
    const { collectGold } = await loadObjectives();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.GOLD],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 2,
      totalGold: 2,
      allGoldCollected: false,
      score: 25,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    collectGold(state, 1, 1);

    expect(state.collectedGold).toEqual(new Set<string>([createGoldKey(1, 1)]));
    expect(state.goldRemaining).toBe(1);
    expect(state.score).toBe(25 + GOLD_SCORE);
    expect(state.allGoldCollected).toBe(false);
  });

  it("marks all gold collected when the last gold is taken", async () => {
    const { collectGold } = await loadObjectives();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 1,
      totalGold: 1,
      allGoldCollected: false,
      score: 0,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    collectGold(state, 1, 1);

    expect(state.collectedGold).toEqual(new Set<string>([createGoldKey(1, 1)]));
    expect(state.goldRemaining).toBe(0);
    expect(state.score).toBe(GOLD_SCORE);
    expect(state.allGoldCollected).toBe(true);
  });

  it("is a no-op when the cell does not contain gold or that gold was already collected", async () => {
    const { collectGold } = await loadObjectives();
    const noGoldState = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 2,
      totalGold: 2,
      allGoldCollected: false,
      score: 10,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });
    const duplicateGoldState = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      collectedGold: [createGoldKey(1, 1)],
      goldRemaining: 1,
      totalGold: 1,
      allGoldCollected: false,
      score: 30,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    collectGold(noGoldState, 1, 1);
    collectGold(duplicateGoldState, 1, 1);

    expect(noGoldState.collectedGold).toEqual(new Set<string>());
    expect(noGoldState.goldRemaining).toBe(2);
    expect(noGoldState.score).toBe(10);
    expect(noGoldState.allGoldCollected).toBe(false);

    expect(duplicateGoldState.collectedGold).toEqual(
      new Set<string>([createGoldKey(1, 1)]),
    );
    expect(duplicateGoldState.goldRemaining).toBe(1);
    expect(duplicateGoldState.score).toBe(30);
    expect(duplicateGoldState.allGoldCollected).toBe(false);
  });

  it("throws for nullish state and empty grids", async () => {
    const { collectGold } = await loadObjectives();

    expect(() => collectGold(null as unknown as GameState, 0, 0)).toThrow();
    expect(() => collectGold(undefined as unknown as GameState, 0, 0)).toThrow();
    expect(() =>
      collectGold(
        createState({
          grid: [],
          player: createPlayer(0, 0),
          goldRemaining: 0,
          totalGold: 0,
          allGoldCollected: true,
        }),
        0,
        0,
      ),
    ).toThrow();
  });
});

describe("revealHiddenLadders", () => {
  it("reveals hidden ladders in state and on the grid after all gold is collected", async () => {
    const { revealHiddenLadders } = await loadObjectives();
    const grid = createGrid([
      [TileType.HIDDEN_LADDER, TileType.EMPTY, TileType.HIDDEN_LADDER],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);
    const state = createState({
      grid,
      player: createPlayer(1, 1),
      hiddenLadders: [createHiddenLadder(0, 0), createHiddenLadder(0, 2)],
      goldRemaining: 0,
      totalGold: 2,
      allGoldCollected: true,
      completionStatus: LevelCompletionStatus.ALL_GOLD_COLLECTED,
    });

    revealHiddenLadders(state, grid);

    expect(state.hiddenLadders).toEqual([
      createHiddenLadder(0, 0, true),
      createHiddenLadder(0, 2, true),
    ]);
    expect(grid[0][0]).toBe(TileType.LADDER);
    expect(grid[0][2]).toBe(TileType.LADDER);
  });

  it("is a no-op while gold remains", async () => {
    const { revealHiddenLadders } = await loadObjectives();
    const grid = createGrid([
      [TileType.HIDDEN_LADDER, TileType.EMPTY, TileType.HIDDEN_LADDER],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);
    const state = createState({
      grid,
      player: createPlayer(1, 1),
      hiddenLadders: [createHiddenLadder(0, 0), createHiddenLadder(0, 2)],
      goldRemaining: 1,
      totalGold: 2,
      allGoldCollected: false,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    revealHiddenLadders(state, grid);

    expect(state.hiddenLadders).toEqual([
      createHiddenLadder(0, 0),
      createHiddenLadder(0, 2),
    ]);
    expect(grid[0][0]).toBe(TileType.HIDDEN_LADDER);
    expect(grid[0][2]).toBe(TileType.HIDDEN_LADDER);
  });

  it("throws for nullish state or grid", async () => {
    const { revealHiddenLadders } = await loadObjectives();
    const grid = createGrid([[TileType.HIDDEN_LADDER]]);
    const state = createState({
      grid,
      player: createPlayer(0, 0),
      hiddenLadders: [createHiddenLadder(0, 0)],
      goldRemaining: 0,
      totalGold: 0,
      allGoldCollected: true,
    });

    expect(() => revealHiddenLadders(null as unknown as GameState, grid)).toThrow();
    expect(() => revealHiddenLadders(undefined as unknown as GameState, grid)).toThrow();
    expect(() => revealHiddenLadders(state, null as unknown as LevelData["grid"])).toThrow();
    expect(() => revealHiddenLadders(state, undefined as unknown as LevelData["grid"])).toThrow();
  });
});

describe("checkLevelComplete", () => {
  it("returns true and sets COMPLETED when all gold is collected and the player reaches the exit row", async () => {
    const { checkLevelComplete } = await loadObjectives();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 0,
      totalGold: 1,
      allGoldCollected: true,
      exitRowThreshold: 1,
      completionStatus: LevelCompletionStatus.ALL_GOLD_COLLECTED,
    });

    expect(checkLevelComplete(state)).toBe(true);
    expect(state.completionStatus).toBe(LevelCompletionStatus.COMPLETED);
  });

  it("returns false when all gold is collected but the player has not reached the exit row", async () => {
    const { checkLevelComplete } = await loadObjectives();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
      goldRemaining: 0,
      totalGold: 1,
      allGoldCollected: true,
      exitRowThreshold: 0,
      completionStatus: LevelCompletionStatus.ALL_GOLD_COLLECTED,
    });

    expect(checkLevelComplete(state)).toBe(false);
    expect(state.completionStatus).toBe(LevelCompletionStatus.ALL_GOLD_COLLECTED);
  });

  it("returns false while gold remains even if the player reaches the exit row", async () => {
    const { checkLevelComplete } = await loadObjectives();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(0, 1),
      goldRemaining: 1,
      totalGold: 1,
      allGoldCollected: false,
      exitRowThreshold: 0,
      completionStatus: LevelCompletionStatus.IN_PROGRESS,
    });

    expect(checkLevelComplete(state)).toBe(false);
    expect(state.completionStatus).toBe(LevelCompletionStatus.IN_PROGRESS);
  });

  it("throws for a nullish state", async () => {
    const { checkLevelComplete } = await loadObjectives();

    expect(() => checkLevelComplete(null as unknown as GameState)).toThrow();
    expect(() => checkLevelComplete(undefined as unknown as GameState)).toThrow();
  });
});
