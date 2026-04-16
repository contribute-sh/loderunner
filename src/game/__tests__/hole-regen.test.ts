import { describe, expect, it } from "vitest";

import { LevelCompletionStatus, type DugHole, type GameState } from "../types";
import { TileType, type LevelCell, type LevelData, type SpawnPoint } from "../../level/types";

type UpdateHoleTimers = (
  state: GameState,
  grid: LevelCell[][],
  deltaMs: number,
) => GameState;

const HOLE_REGEN_MODULE_PATH = "../hole-regen";

async function loadUpdateHoleTimers(): Promise<UpdateHoleTimers> {
  const holeRegenModule = (await import(HOLE_REGEN_MODULE_PATH)) as {
    updateHoleTimers?: UpdateHoleTimers;
  };

  expect(holeRegenModule.updateHoleTimers).toBeTypeOf("function");

  return holeRegenModule.updateHoleTimers as UpdateHoleTimers;
}

function createSpawnPoint(row: number, col: number): SpawnPoint {
  return { row, col };
}

function createGrid(rows: TileType[][]): LevelCell[][] {
  return rows.map((row) => [...row]);
}

function countGold(grid: LevelCell[][]): number {
  return grid.flat().filter((tile) => tile === TileType.GOLD).length;
}

function createLevelData({
  grid,
  playerSpawn = createSpawnPoint(0, 0),
  regenDelayMs = 1000,
  name = "hole-regen-test",
}: {
  grid: LevelCell[][];
  playerSpawn?: SpawnPoint;
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
    enemySpawns: [],
    timers: {
      regenDelayMs,
    },
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
  grid,
  player = createSpawnPoint(0, 0),
  dugHoles = [],
}: {
  grid: LevelCell[][];
  player?: SpawnPoint;
  dugHoles?: DugHole[];
}): GameState {
  const totalGold = countGold(grid);
  const goldRemaining = totalGold;
  const allGoldCollected = goldRemaining === 0;
  const levelData = createLevelData({
    grid,
    playerSpawn: player,
  });

  return {
    levelData,
    playerPosition: { row: player.row, col: player.col },
    enemyPositions: [],
    isRunning: true,
    player: {
      row: player.row,
      col: player.col,
      isAlive: true,
    },
    enemies: [],
    dugHoles,
    hiddenLadders: [],
    collectedGold: new Set<string>(),
    totalGold,
    goldRemaining,
    allGoldCollected,
    levelComplete: false,
    exitRowThreshold: 0,
    score: 0,
    completionStatus: allGoldCollected
      ? LevelCompletionStatus.ALL_GOLD_COLLECTED
      : LevelCompletionStatus.IN_PROGRESS,
    levelName: levelData.name,
  };
}

describe("updateHoleTimers", () => {
  it("decrements each dug hole timer by deltaMs on every tick", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      dugHoles: [createDugHole(2, 0, 1000), createDugHole(2, 3, 750)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 250);

    expect(nextState.dugHoles).toEqual([
      createDugHole(2, 0, 750),
      createDugHole(2, 3, 500),
    ]);
    expect(nextState.levelData.grid[2][0]).toBe(TileType.EMPTY);
    expect(nextState.levelData.grid[2][3]).toBe(TileType.EMPTY);
  });

  it("removes holes whose timers reach zero or below and restores their original brick tiles", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      dugHoles: [createDugHole(2, 0, 100), createDugHole(2, 2, 50)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 100);

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][0]).toBe(TileType.BRICK);
    expect(nextState.levelData.grid[2][2]).toBe(TileType.BRICK);
  });

  it("regenerates multiple holes independently based on each hole's own timer", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      dugHoles: [createDugHole(2, 0, 600), createDugHole(2, 3, 200)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 250);

    expect(nextState.dugHoles).toEqual([createDugHole(2, 0, 350)]);
    expect(nextState.levelData.grid[2][0]).toBe(TileType.EMPTY);
    expect(nextState.levelData.grid[2][3]).toBe(TileType.BRICK);
  });

  it("keeps a hole open while time remains", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      dugHoles: [createDugHole(2, 1, 125)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 50);

    expect(nextState.dugHoles).toEqual([createDugHole(2, 1, 75)]);
    expect(nextState.levelData.grid[2][1]).toBe(TileType.EMPTY);
  });

  it("kills the player when a hole regenerates under the player's tile", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      player: createSpawnPoint(2, 1),
      dugHoles: [createDugHole(2, 1, 75)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 75);

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][1]).toBe(TileType.BRICK);
    expect(nextState.player).toEqual({
      row: 2,
      col: 1,
      isAlive: false,
    });
  });

  it("simply refills an empty hole when no entity is standing in it", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
      player: createSpawnPoint(0, 0),
      dugHoles: [createDugHole(2, 1, 40)],
    });

    const nextState = updateHoleTimers(state, state.levelData.grid, 50);

    expect(nextState.dugHoles).toEqual([]);
    expect(nextState.levelData.grid[2][1]).toBe(TileType.BRICK);
    expect(nextState.player).toEqual({
      row: 0,
      col: 0,
      isAlive: true,
    });
  });

  it("is a no-op for states with no holes and throws for nullish inputs and empty grids", async () => {
    const updateHoleTimers = await loadUpdateHoleTimers();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]),
    });

    expect(updateHoleTimers(state, state.levelData.grid, 16)).toEqual(state);
    expect(() =>
      updateHoleTimers(null as unknown as GameState, state.levelData.grid, 16),
    ).toThrow();
    expect(() =>
      updateHoleTimers(undefined as unknown as GameState, state.levelData.grid, 16),
    ).toThrow();
    expect(() =>
      updateHoleTimers(state, null as unknown as LevelCell[][], 16),
    ).toThrow();
    expect(() =>
      updateHoleTimers(state, undefined as unknown as LevelCell[][], 16),
    ).toThrow();
    expect(() =>
      updateHoleTimers(state, state.levelData.grid, null as unknown as number),
    ).toThrow();
    expect(() =>
      updateHoleTimers(state, state.levelData.grid, undefined as unknown as number),
    ).toThrow();
    expect(() =>
      updateHoleTimers(
        createState({
          grid: [],
        }),
        [],
        16,
      ),
    ).toThrow();
  });
});
