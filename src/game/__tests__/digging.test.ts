import { describe, expect, it } from "vitest";

import {
  EnemyMovementState,
  LevelCompletionStatus,
  type DugHole,
  type EnemyState,
  type GameState,
} from "../types";
import { TileType, type LevelData, type SpawnPoint } from "../../level/types";

type DigDirection = "left" | "right";
type InitGameState = (levelData: LevelData) => GameState;
type DigHole = (state: GameState, direction: DigDirection) => GameState;
type UpdateHoles = (state: GameState, deltaMs: number) => GameState;

const RULES_MODULE_PATH = "../rules";

async function loadDiggingRules(): Promise<{
  initGameState: InitGameState;
  digHole: DigHole;
  updateHoles: UpdateHoles;
}> {
  const rulesModule = (await import(RULES_MODULE_PATH)) as {
    initGameState?: InitGameState;
    digHole?: DigHole;
    updateHoles?: UpdateHoles;
  };

  expect(rulesModule.initGameState).toBeTypeOf("function");
  expect(rulesModule.digHole).toBeTypeOf("function");
  expect(rulesModule.updateHoles).toBeTypeOf("function");

  return {
    initGameState: rulesModule.initGameState as InitGameState,
    digHole: rulesModule.digHole as DigHole,
    updateHoles: rulesModule.updateHoles as UpdateHoles,
  };
}

function createSpawnPoint(row: number, col: number): SpawnPoint {
  return { row, col };
}

function createGrid(rows: TileType[][]): LevelData["grid"] {
  return rows.map((row) => [...row]);
}

function countGold(grid: LevelData["grid"]): number {
  return grid.flat().filter((tile) => tile === TileType.GOLD).length;
}

function createLevelData({
  grid,
  playerSpawn = createSpawnPoint(1, 1),
  enemySpawns = [],
  regenDelayMs = 1000,
  name = "digging-test",
}: {
  grid: LevelData["grid"];
  playerSpawn?: SpawnPoint;
  enemySpawns?: SpawnPoint[];
  regenDelayMs?: number;
  name?: string;
}): LevelData {
  return {
    formatVersion: 1,
    name,
    width: grid[0]?.length ?? 0,
    height: grid.length,
    grid: createGrid(grid),
    playerSpawn,
    enemySpawns: enemySpawns.map(({ row, col }) => ({ row, col })),
    timers: {
      regenDelayMs,
    },
  };
}

function createEnemy(
  row: number,
  col: number,
  overrides: Partial<EnemyState> = {},
): EnemyState {
  return {
    row,
    col,
    movementState: EnemyMovementState.IDLE,
    isTrappedInHole: false,
    trappedTimerMs: 0,
    ...overrides,
  };
}

function createDugHole(
  row: number,
  col: number,
  regenRemainingMs: number,
  originalTile: TileType = TileType.BRICK,
): DugHole {
  return {
    row,
    col,
    regenRemainingMs,
    originalTile,
  };
}

function createState({
  levelData,
  playerPosition = levelData.playerSpawn,
  enemies = levelData.enemySpawns.map(({ row, col }) => createEnemy(row, col)),
  dugHoles = [],
  collectedGold = [],
  completionStatus,
}: {
  levelData: LevelData;
  playerPosition?: SpawnPoint;
  enemies?: EnemyState[];
  dugHoles?: DugHole[];
  collectedGold?: string[];
  completionStatus?: LevelCompletionStatus;
}): GameState {
  const totalGold = countGold(levelData.grid);
  const goldRemaining = totalGold;
  const allGoldCollected = goldRemaining === 0;

  return {
    levelData,
    playerPosition: { row: playerPosition.row, col: playerPosition.col },
    enemyPositions: enemies.map(({ row, col }) => ({ row, col })),
    isRunning: true,
    player: {
      row: playerPosition.row,
      col: playerPosition.col,
      isAlive: true,
    },
    enemies,
    dugHoles,
    hiddenLadders: [],
    collectedGold: new Set<string>(collectedGold),
    totalGold,
    goldRemaining,
    allGoldCollected,
    levelComplete: false,
    exitRowThreshold: 0,
    score: 0,
    completionStatus:
      completionStatus ??
      (allGoldCollected
        ? LevelCompletionStatus.ALL_GOLD_COLLECTED
        : LevelCompletionStatus.IN_PROGRESS),
    levelName: levelData.name,
  };
}

describe("initGameState", () => {
  it("initializes the player, enemies, gold counters, and completion status from level data", async () => {
    const { initGameState } = await loadDiggingRules();
    const levelData = createLevelData({
      grid: createGrid([
        [TileType.EMPTY, TileType.GOLD, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
        [TileType.BRICK, TileType.BRICK, TileType.BRICK, TileType.BRICK],
      ]),
      playerSpawn: createSpawnPoint(1, 0),
      enemySpawns: [createSpawnPoint(1, 2), createSpawnPoint(1, 3)],
      regenDelayMs: 900,
      name: "level-init",
    });

    const state = initGameState(levelData);

    expect(state.levelData).toEqual(levelData);
    expect(state.playerPosition).toEqual(createSpawnPoint(1, 0));
    expect(state.player).toEqual({
      row: 1,
      col: 0,
      isAlive: true,
    });
    expect(state.enemyPositions).toEqual([
      createSpawnPoint(1, 2),
      createSpawnPoint(1, 3),
    ]);
    expect(state.enemies).toEqual([
      expect.objectContaining({
        row: 1,
        col: 2,
        isTrappedInHole: false,
        trappedTimerMs: 0,
      }),
      expect.objectContaining({
        row: 1,
        col: 3,
        isTrappedInHole: false,
        trappedTimerMs: 0,
      }),
    ]);
    expect(state.dugHoles).toEqual([]);
    expect(state.totalGold).toBe(2);
    expect(state.goldRemaining).toBe(2);
    expect(state.allGoldCollected).toBe(false);
    expect(state.completionStatus).toBe(LevelCompletionStatus.IN_PROGRESS);
    expect(state.levelName).toBe("level-init");
  });

  it("throws for nullish level data and empty grids", async () => {
    const { initGameState } = await loadDiggingRules();

    expect(() => initGameState(null as unknown as LevelData)).toThrow();
    expect(() => initGameState(undefined as unknown as LevelData)).toThrow();
    expect(() =>
      initGameState(
        createLevelData({
          grid: [],
        }),
      ),
    ).toThrow();
  });
});

describe("digHole", () => {
  it("digs the brick diagonally below the player on either side and starts hole regeneration from the level timer", async () => {
    const { digHole } = await loadDiggingRules();
    const leftState = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.BRICK, TileType.EMPTY, TileType.EMPTY],
        ]),
        playerSpawn: createSpawnPoint(1, 1),
        regenDelayMs: 750,
      }),
    });
    const rightState = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.BRICK],
        ]),
        playerSpawn: createSpawnPoint(1, 1),
        regenDelayMs: 750,
      }),
    });

    const leftResult = digHole(leftState, "left");
    const rightResult = digHole(rightState, "right");

    expect(leftResult.levelData.grid[2][0]).toBe(TileType.EMPTY);
    expect(leftResult.dugHoles).toEqual([createDugHole(2, 0, 750)]);

    expect(rightResult.levelData.grid[2][2]).toBe(TileType.EMPTY);
    expect(rightResult.dugHoles).toEqual([createDugHole(2, 2, 750)]);
  });

  it.each([
    TileType.SOLID,
    TileType.EMPTY,
    TileType.LADDER,
    TileType.BAR,
  ])("rejects %s targets and leaves the grid unchanged", async (targetTile: TileType) => {
    const { digHole } = await loadDiggingRules();
    const state = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [targetTile, TileType.EMPTY, TileType.EMPTY],
        ]),
        playerSpawn: createSpawnPoint(1, 1),
        regenDelayMs: 500,
      }),
    });

    const nextState = digHole(state, "left");

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][0]).toBe(targetTile);
  });

  it("throws for nullish state, invalid directions, and empty grids", async () => {
    const { digHole } = await loadDiggingRules();
    const state = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.BRICK, TileType.EMPTY, TileType.EMPTY],
        ]),
        playerSpawn: createSpawnPoint(1, 1),
      }),
    });

    expect(() => digHole(null as unknown as GameState, "left")).toThrow();
    expect(() => digHole(undefined as unknown as GameState, "right")).toThrow();
    expect(() =>
      digHole(state, "down" as unknown as DigDirection),
    ).toThrow();
    expect(() =>
      digHole(
        createState({
          levelData: createLevelData({
            grid: [],
          }),
        }),
        "left",
      ),
    ).toThrow();
  });
});

describe("updateHoles", () => {
  it("decrements regeneration timers and traps enemies standing in dug holes", async () => {
    const { updateHoles } = await loadDiggingRules();
    const levelData = createLevelData({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      playerSpawn: createSpawnPoint(1, 1),
      enemySpawns: [createSpawnPoint(2, 0)],
      regenDelayMs: 500,
    });
    const state = createState({
      levelData,
      enemies: [createEnemy(2, 0)],
      dugHoles: [createDugHole(2, 0, 500)],
    });

    const nextState = updateHoles(state, 100);

    expect(nextState.dugHoles).toEqual([createDugHole(2, 0, 400)]);
    expect(nextState.enemies).toEqual([
      expect.objectContaining({
        row: 2,
        col: 0,
        isTrappedInHole: true,
        trappedTimerMs: 400,
      }),
    ]);
    expect(nextState.enemyPositions).toEqual([createSpawnPoint(2, 0)]);
    expect(nextState.levelData.grid[2][0]).toBe(TileType.EMPTY);
  });

  it("restores regenerated tiles and removes expired holes", async () => {
    const { updateHoles } = await loadDiggingRules();
    const state = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        ]),
        playerSpawn: createSpawnPoint(1, 1),
      }),
      dugHoles: [createDugHole(2, 1, 75)],
    });

    const nextState = updateHoles(state, 75);

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][1]).toBe(TileType.BRICK);
  });

  it("respawns enemies at their original spawn when a hole regenerates under them", async () => {
    const { updateHoles } = await loadDiggingRules();
    const levelData = createLevelData({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      playerSpawn: createSpawnPoint(1, 1),
      enemySpawns: [createSpawnPoint(0, 2)],
      regenDelayMs: 50,
    });
    const state = createState({
      levelData,
      enemies: [
        createEnemy(2, 0, {
          isTrappedInHole: true,
          trappedTimerMs: 50,
        }),
      ],
      dugHoles: [createDugHole(2, 0, 50)],
    });

    const nextState = updateHoles(state, 50);

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][0]).toBe(TileType.BRICK);
    expect(nextState.enemies).toEqual([
      expect.objectContaining({
        row: 0,
        col: 2,
        isTrappedInHole: false,
        trappedTimerMs: 0,
      }),
    ]);
    expect(nextState.enemyPositions).toEqual([createSpawnPoint(0, 2)]);
  });

  it("throws for nullish state, nullish delta, and empty grids", async () => {
    const { updateHoles } = await loadDiggingRules();
    const state = createState({
      levelData: createLevelData({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        ]),
      }),
    });

    expect(() => updateHoles(null as unknown as GameState, 16)).toThrow();
    expect(() => updateHoles(undefined as unknown as GameState, 16)).toThrow();
    expect(() =>
      updateHoles(state, undefined as unknown as number),
    ).toThrow();
    expect(() =>
      updateHoles(
        createState({
          levelData: createLevelData({
            grid: [],
          }),
        }),
        16,
      ),
    ).toThrow();
  });
});
