import { InputAction, type InputState } from "../input/types";
import { TileType, type LevelCell } from "../level/types";
import type { PlayerState } from "./types";

const PLAYER_MOVE_DT = 1 / 8;

function assertRequired<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new Error(`${name} is required`);
  }
}

function assertValidGrid(grid: LevelCell[][]): void {
  if (grid.length === 0) {
    throw new Error("grid must not be empty");
  }

  const columnCount = grid[0]?.length ?? 0;

  if (columnCount === 0) {
    throw new Error("grid rows must not be empty");
  }

  for (const row of grid) {
    if (row.length !== columnCount) {
      throw new Error("grid must be rectangular");
    }
  }
}

function isWithinBounds(grid: LevelCell[][], row: number, col: number): boolean {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
}

function getTile(
  grid: LevelCell[][],
  row: number,
  col: number,
): LevelCell | undefined {
  if (!isWithinBounds(grid, row, col)) {
    return undefined;
  }

  return grid[row][col];
}

function isBlockingTile(tile: LevelCell | undefined): boolean {
  return tile === TileType.BRICK || tile === TileType.SOLID;
}

function isSupported(currentTile: LevelCell | undefined, belowTile: LevelCell | undefined): boolean {
  return (
    currentTile === TileType.BAR ||
    currentTile === TileType.LADDER ||
    belowTile === TileType.BRICK ||
    belowTile === TileType.SOLID ||
    belowTile === TileType.LADDER
  );
}

function moveTo(
  player: PlayerState,
  grid: LevelCell[][],
  row: number,
  col: number,
): PlayerState {
  if (!isWithinBounds(grid, row, col) || isBlockingTile(getTile(grid, row, col))) {
    return player;
  }

  return {
    ...player,
    row,
    col,
  };
}

function applyGravity(player: PlayerState, grid: LevelCell[][]): PlayerState {
  const currentTile = getTile(grid, player.row, player.col);
  const targetRow = player.row + 1;
  const belowTile = getTile(grid, targetRow, player.col);

  if (!isWithinBounds(grid, targetRow, player.col) || isSupported(currentTile, belowTile)) {
    return player;
  }

  return moveTo(player, grid, targetRow, player.col);
}

export function movePlayer(
  player: PlayerState,
  input: InputState,
  grid: LevelCell[][],
  dt: number,
): PlayerState {
  assertRequired(player, "player");
  assertRequired(input, "input");
  assertRequired(grid, "grid");
  assertValidGrid(grid);

  if (dt < PLAYER_MOVE_DT) {
    return player;
  }

  const currentTile = getTile(grid, player.row, player.col);
  const belowTile = getTile(grid, player.row + 1, player.col);
  const supported = isSupported(currentTile, belowTile);

  let nextPlayer = player;

  switch (input.activeAction) {
    case InputAction.MOVE_LEFT:
      if (supported) {
        nextPlayer = moveTo(player, grid, player.row, player.col - 1);
      }
      break;

    case InputAction.MOVE_RIGHT:
      if (supported) {
        nextPlayer = moveTo(player, grid, player.row, player.col + 1);
      }
      break;

    case InputAction.CLIMB_UP:
      if (getTile(grid, player.row - 1, player.col) === TileType.LADDER) {
        nextPlayer = moveTo(player, grid, player.row - 1, player.col);
      }
      break;

    case InputAction.CLIMB_DOWN:
      if (getTile(grid, player.row + 1, player.col) === TileType.LADDER || currentTile === TileType.BAR) {
        nextPlayer = moveTo(player, grid, player.row + 1, player.col);
      }
      break;

    case InputAction.DIG_LEFT:
    case InputAction.DIG_RIGHT:
    case InputAction.NONE:
      break;

    default:
      break;
  }

  if (nextPlayer !== player) {
    return nextPlayer;
  }

  return applyGravity(player, grid);
}
