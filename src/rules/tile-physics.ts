import { TileType, type LevelData } from "../level/types";
import type { LevelState, Position } from "./types";

function assertRequired<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new Error(`${name} is required`);
  }
}

function assertValidGrid(grid: LevelData["grid"]): void {
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

function isWithinBounds(state: LevelState, pos: Position): boolean {
  return (
    pos.row >= 0 &&
    pos.row < state.grid.length &&
    pos.col >= 0 &&
    pos.col < state.grid[0].length
  );
}

function getTile(state: LevelState, pos: Position): TileType | undefined {
  if (!isWithinBounds(state, pos)) {
    return undefined;
  }

  return state.grid[pos.row][pos.col];
}

function assertValidState(state: LevelState): void {
  assertRequired(state, "state");
  assertValidGrid(state.grid);
}

export function createLevelState(level: LevelData): LevelState {
  assertRequired(level, "level");
  assertValidGrid(level.grid);

  return {
    levelData: level,
    grid: level.grid.map((row) => [...row]),
    dugBricks: [],
  };
}

export function canEnterTile(state: LevelState, pos: Position): boolean {
  assertValidState(state);
  assertRequired(pos, "pos");

  const tile = getTile(state, pos);

  return (
    tile === TileType.EMPTY ||
    tile === TileType.LADDER ||
    tile === TileType.BAR ||
    tile === TileType.GOLD ||
    tile === TileType.HIDDEN_LADDER
  );
}

export function isSupported(state: LevelState, pos: Position): boolean {
  assertValidState(state);
  assertRequired(pos, "pos");

  const tile = getTile(state, pos);

  if (tile === TileType.LADDER || tile === TileType.BAR) {
    return true;
  }

  if (!isWithinBounds(state, pos)) {
    return false;
  }

  if (pos.row === state.grid.length - 1) {
    return true;
  }

  const belowTile = getTile(state, {
    row: pos.row + 1,
    col: pos.col,
  });

  return belowTile === TileType.SOLID || belowTile === TileType.BRICK;
}

export function canClimb(state: LevelState, pos: Position): boolean {
  assertValidState(state);
  assertRequired(pos, "pos");

  return getTile(state, pos) === TileType.LADDER;
}

export function canTraverseBar(state: LevelState, pos: Position): boolean {
  assertValidState(state);
  assertRequired(pos, "pos");

  return getTile(state, pos) === TileType.BAR;
}
