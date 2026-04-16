import { describe, expect, it } from "vitest";

import { InputAction } from "../../input/types";
import {
  TileType,
  type BrickTimers,
  type LevelCell,
  type SpawnPoint,
} from "../../level/types";
import type { DugHole } from "../types";

interface DigSystemResult {
  dugHoles: DugHole[];
  grid: LevelCell[][];
}

type DigHoleAction = (
  player: SpawnPoint,
  action: InputAction,
  grid: LevelCell[][],
  timers: BrickTimers,
  dugHoles: DugHole[],
) => DigSystemResult;

type TickDugHoles = (
  dugHoles: DugHole[],
  grid: LevelCell[][],
  elapsedMs: number,
) => DigSystemResult;

const DIG_SYSTEM_MODULE_PATH = "../dig-system";

async function loadDigSystem(): Promise<{
  digHole: DigHoleAction;
  tickDugHoles: TickDugHoles;
}> {
  const digSystemModule = (await import(DIG_SYSTEM_MODULE_PATH)) as {
    digHole?: DigHoleAction;
    tickDugHoles?: TickDugHoles;
  };

  expect(digSystemModule.digHole).toBeTypeOf("function");
  expect(digSystemModule.tickDugHoles).toBeTypeOf("function");

  return {
    digHole: digSystemModule.digHole as DigHoleAction,
    tickDugHoles: digSystemModule.tickDugHoles as TickDugHoles,
  };
}

function createGrid(rows: TileType[][]): LevelCell[][] {
  return rows.map((row) => [...row]);
}

function createPlayer(row: number, col: number): SpawnPoint {
  return { row, col };
}

function createTimers(regenDelayMs = 1000): BrickTimers {
  return { regenDelayMs };
}

function createDugHole(
  row: number,
  col: number,
  regenRemainingMs: BrickTimers["regenDelayMs"],
  originalTile: TileType = TileType.BRICK,
): DugHole {
  return {
    row,
    col,
    regenRemainingMs,
    originalTile,
  };
}

describe("digHole", () => {
  it("creates a dug hole from a brick diagonally below the player in the chosen direction", async () => {
    const { digHole } = await loadDigSystem();
    const timers = createTimers(900);
    const player = createPlayer(1, 1);

    const leftResult = digHole(
      player,
      InputAction.DIG_LEFT,
      createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.BRICK, TileType.EMPTY, TileType.EMPTY],
      ]),
      timers,
      [],
    );
    const rightResult = digHole(
      player,
      InputAction.DIG_RIGHT,
      createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.BRICK],
      ]),
      timers,
      [],
    );

    expect(leftResult.dugHoles).toEqual([createDugHole(2, 0, 900)]);
    expect(leftResult.grid[2][0]).toBe(TileType.EMPTY);

    expect(rightResult.dugHoles).toEqual([createDugHole(2, 2, 900)]);
    expect(rightResult.grid[2][2]).toBe(TileType.EMPTY);
  });

  it("rejects targets that are not bricks, including empty space and solid tiles", async () => {
    const { digHole } = await loadDigSystem();
    const player = createPlayer(1, 1);
    const timers = createTimers();
    const emptyTargetGrid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);
    const solidTargetGrid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.EMPTY, TileType.EMPTY],
    ]);

    expect(
      digHole(player, InputAction.DIG_LEFT, emptyTargetGrid, timers, []),
    ).toEqual({
      dugHoles: [],
      grid: emptyTargetGrid,
    });
    expect(
      digHole(player, InputAction.DIG_LEFT, solidTargetGrid, timers, []),
    ).toEqual({
      dugHoles: [],
      grid: solidTargetGrid,
    });
  });

  it("only digs a brick exactly one row below and one column to the chosen side", async () => {
    const { digHole } = await loadDigSystem();
    const player = createPlayer(1, 1);
    const timers = createTimers();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.BRICK, TileType.EMPTY, TileType.BRICK],
      [TileType.EMPTY, TileType.BRICK, TileType.EMPTY],
    ]);

    expect(digHole(player, InputAction.DIG_LEFT, grid, timers, [])).toEqual({
      dugHoles: [],
      grid,
    });
    expect(digHole(player, InputAction.DIG_RIGHT, grid, timers, [])).toEqual({
      dugHoles: [],
      grid,
    });
  });

  it("throws for nullish required arguments and empty grids", async () => {
    const { digHole } = await loadDigSystem();
    const player = createPlayer(1, 1);
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.BRICK, TileType.EMPTY, TileType.EMPTY],
    ]);
    const timers = createTimers();

    expect(() =>
      digHole(null as unknown as SpawnPoint, InputAction.DIG_LEFT, grid, timers, []),
    ).toThrow();
    expect(() =>
      digHole(player, InputAction.DIG_LEFT, undefined as unknown as LevelCell[][], timers, []),
    ).toThrow();
    expect(() =>
      digHole(player, InputAction.DIG_LEFT, [], timers, []),
    ).toThrow();
    expect(() =>
      digHole(player, InputAction.DIG_LEFT, grid, null as unknown as BrickTimers, []),
    ).toThrow();
    expect(() =>
      digHole(player, InputAction.DIG_LEFT, grid, timers, undefined as unknown as DugHole[]),
    ).toThrow();
  });
});

describe("tickDugHoles", () => {
  it("decrements regenRemainingMs without refilling the hole before the timer expires", async () => {
    const { tickDugHoles } = await loadDigSystem();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);

    const result = tickDugHoles([createDugHole(2, 0, 1000)], grid, 250);

    expect(result.dugHoles).toEqual([createDugHole(2, 0, 750)]);
    expect(result.grid[2][0]).toBe(TileType.EMPTY);
  });

  it("refills expired holes to their original tile and removes them from the dugHoles list", async () => {
    const { tickDugHoles } = await loadDigSystem();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);

    const result = tickDugHoles([createDugHole(2, 1, 100)], grid, 100);

    expect(result.dugHoles).toEqual([]);
    expect(result.grid[2][1]).toBe(TileType.BRICK);
  });

  it("ticks multiple holes independently", async () => {
    const { tickDugHoles } = await loadDigSystem();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);

    const result = tickDugHoles(
      [createDugHole(2, 0, 1000), createDugHole(2, 3, 250)],
      grid,
      300,
    );

    expect(result.dugHoles).toEqual([createDugHole(2, 0, 700)]);
    expect(result.grid[2][0]).toBe(TileType.EMPTY);
    expect(result.grid[2][3]).toBe(TileType.BRICK);
  });

  it("is a no-op for empty hole lists and throws for invalid required arguments", async () => {
    const { tickDugHoles } = await loadDigSystem();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);

    expect(tickDugHoles([], grid, 16)).toEqual({
      dugHoles: [],
      grid,
    });
    expect(() =>
      tickDugHoles(null as unknown as DugHole[], grid, 16),
    ).toThrow();
    expect(() =>
      tickDugHoles([], undefined as unknown as LevelCell[][], 16),
    ).toThrow();
    expect(() =>
      tickDugHoles([], [], 16),
    ).toThrow();
  });
});
