import { describe, expect, it } from "vitest";

import { InputAction, type InputState } from "../../input/types";
import { TileType, type LevelCell } from "../../level/types";
import type { PlayerState } from "../types";

type MovePlayer = (
  player: PlayerState,
  input: InputState,
  grid: LevelCell[][],
  dt: number,
) => PlayerState;

const PLAYER_SPEED_DT = 1 / 8;
const MOVEMENT_MODULE_PATH = "../movement";

async function loadMovePlayer(): Promise<MovePlayer> {
  const movementModule = (await import(MOVEMENT_MODULE_PATH)) as {
    movePlayer?: MovePlayer;
  };

  expect(movementModule.movePlayer).toBeTypeOf("function");

  return movementModule.movePlayer as MovePlayer;
}

function createPlayer(row: number, col: number): PlayerState {
  return {
    row,
    col,
    isAlive: true,
  };
}

function createInput(activeAction: InputAction): InputState {
  return {
    activeAction,
    keysDown: new Set<string>(),
  };
}

function createGrid(rows: number, cols: number, fill: TileType = TileType.EMPTY): LevelCell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

describe("movePlayer", () => {
  it("moves left and right across empty tiles", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(5, 5);
    grid[4] = Array.from({ length: 5 }, () => TileType.SOLID);
    const player = createPlayer(3, 2);

    expect(movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT)).toEqual(
      createPlayer(3, 1),
    );
    expect(movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT)).toEqual(
      createPlayer(3, 3),
    );
    expect(player).toEqual(createPlayer(3, 2));
  });

  it("does not allow walking into solid tiles", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(3, 3);
    grid[1][2] = TileType.SOLID;
    grid[2] = Array.from({ length: 3 }, () => TileType.SOLID);
    const player = createPlayer(1, 1);

    expect(movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT)).toEqual(player);
  });

  it("does not allow walking into brick tiles", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(3, 3);
    grid[1][0] = TileType.BRICK;
    grid[2] = Array.from({ length: 3 }, () => TileType.SOLID);
    const player = createPlayer(1, 1);

    expect(movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT)).toEqual(player);
  });

  it("climbs up and down on ladder tiles", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(5, 3);
    grid[1][1] = TileType.LADDER;
    grid[2][1] = TileType.LADDER;
    grid[3][1] = TileType.LADDER;
    grid[4] = Array.from({ length: 3 }, () => TileType.SOLID);

    expect(
      movePlayer(createPlayer(2, 1), createInput(InputAction.CLIMB_UP), grid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(1, 1));
    expect(
      movePlayer(createPlayer(2, 1), createInput(InputAction.CLIMB_DOWN), grid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(3, 1));
  });

  it("allows horizontal traversal while hanging from bars", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(3, 5);
    grid[1][1] = TileType.BAR;
    grid[1][2] = TileType.BAR;
    grid[1][3] = TileType.BAR;
    const player = createPlayer(1, 2);

    expect(movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT)).toEqual(
      createPlayer(1, 1),
    );
    expect(movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT)).toEqual(
      createPlayer(1, 3),
    );
  });

  it("falls due to gravity when not supported by solid ground, a ladder, or a bar", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(5, 3);
    grid[4] = Array.from({ length: 3 }, () => TileType.SOLID);

    expect(movePlayer(createPlayer(2, 1), createInput(InputAction.NONE), grid, PLAYER_SPEED_DT)).toEqual(
      createPlayer(3, 1),
    );
  });

  it("stays in place when there is no input and the player is standing on solid ground", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(3, 3);
    grid[2] = Array.from({ length: 3 }, () => TileType.SOLID);
    const player = createPlayer(1, 1);

    expect(movePlayer(player, createInput(InputAction.NONE), grid, PLAYER_SPEED_DT)).toEqual(player);
  });

  it("does not move beyond the left, right, top, or bottom edges of the grid", async () => {
    const movePlayer = await loadMovePlayer();
    const horizontalGrid = createGrid(3, 3);
    horizontalGrid[2] = Array.from({ length: 3 }, () => TileType.SOLID);
    const verticalGrid = createGrid(3, 3);
    verticalGrid[0][1] = TileType.LADDER;
    verticalGrid[1][1] = TileType.LADDER;
    verticalGrid[2][1] = TileType.LADDER;

    expect(
      movePlayer(createPlayer(1, 0), createInput(InputAction.MOVE_LEFT), horizontalGrid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(1, 0));
    expect(
      movePlayer(createPlayer(1, 2), createInput(InputAction.MOVE_RIGHT), horizontalGrid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(1, 2));
    expect(
      movePlayer(createPlayer(0, 1), createInput(InputAction.CLIMB_UP), verticalGrid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(0, 1));
    expect(
      movePlayer(createPlayer(2, 1), createInput(InputAction.CLIMB_DOWN), verticalGrid, PLAYER_SPEED_DT),
    ).toEqual(createPlayer(2, 1));
  });

  it("does not allow climbing hidden ladders before they are revealed", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(5, 3);
    grid[1][1] = TileType.HIDDEN_LADDER;
    grid[2][1] = TileType.HIDDEN_LADDER;
    grid[3][1] = TileType.HIDDEN_LADDER;
    grid[4] = Array.from({ length: 3 }, () => TileType.SOLID);
    const player = createPlayer(2, 1);

    expect(movePlayer(player, createInput(InputAction.CLIMB_UP), grid, PLAYER_SPEED_DT)).toEqual(player);
    expect(movePlayer(player, createInput(InputAction.CLIMB_DOWN), grid, PLAYER_SPEED_DT)).toEqual(player);
  });

  it("throws for nullish required arguments", async () => {
    const movePlayer = await loadMovePlayer();
    const grid = createGrid(3, 3);
    grid[2] = Array.from({ length: 3 }, () => TileType.SOLID);
    const player = createPlayer(1, 1);
    const input = createInput(InputAction.NONE);

    expect(() =>
      movePlayer(null as unknown as PlayerState, input, grid, PLAYER_SPEED_DT),
    ).toThrow();
    expect(() =>
      movePlayer(player, null as unknown as InputState, grid, PLAYER_SPEED_DT),
    ).toThrow();
    expect(() =>
      movePlayer(player, input, null as unknown as LevelCell[][], PLAYER_SPEED_DT),
    ).toThrow();
    expect(() =>
      movePlayer(player, input, undefined as unknown as LevelCell[][], PLAYER_SPEED_DT),
    ).toThrow();
  });
});
