import { InputAction, type InputState } from "../input/types";
import { TileType, type LevelCell } from "../level/types";
import {
  LevelCompletionStatus,
  type GameState,
  type PlayerState,
} from "./types";

const PLAYER_MOVEMENT_TICK_MS = 125;

const PLAYER_MOVEMENT_STATE = {
  CLIMBING: "CLIMBING",
  FALLING: "FALLING",
  ON_BAR: "ON_BAR",
} as const;

type PlayerMovementState =
  (typeof PLAYER_MOVEMENT_STATE)[keyof typeof PLAYER_MOVEMENT_STATE];

type PhysicsPlayerState = PlayerState & {
  movementState?: PlayerMovementState;
};

function assertRequired<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new Error(`${name} is required`);
  }
}

function assertValidDeltaMs(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("deltaMs must be a non-negative finite number");
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function isSupported(
  currentTile: LevelCell | undefined,
  belowTile: LevelCell | undefined,
): boolean {
  return (
    currentTile === TileType.BAR ||
    currentTile === TileType.LADDER ||
    belowTile === TileType.BRICK ||
    belowTile === TileType.SOLID ||
    belowTile === TileType.LADDER
  );
}

function createPlayer(
  player: PhysicsPlayerState,
  row: number,
  col: number,
  movementState?: PlayerMovementState,
): PhysicsPlayerState {
  const nextPlayer: PhysicsPlayerState = {
    ...player,
    row,
    col,
  };

  if (movementState === undefined) {
    delete nextPlayer.movementState;
  } else {
    nextPlayer.movementState = movementState;
  }

  return nextPlayer;
}

function clampPlayer(
  player: PhysicsPlayerState,
  grid: LevelCell[][],
): PhysicsPlayerState {
  return createPlayer(
    player,
    clamp(player.row, 0, grid.length - 1),
    clamp(player.col, 0, grid[0].length - 1),
    player.movementState,
  );
}

function moveTo(
  player: PhysicsPlayerState,
  grid: LevelCell[][],
  row: number,
  col: number,
  movementState?: PlayerMovementState,
): PhysicsPlayerState | null {
  if (!isWithinBounds(grid, row, col) || isBlockingTile(getTile(grid, row, col))) {
    return null;
  }

  return createPlayer(player, row, col, movementState);
}

function applyGravity(
  player: PhysicsPlayerState,
  grid: LevelCell[][],
): PhysicsPlayerState | null {
  const currentTile = getTile(grid, player.row, player.col);
  const targetRow = player.row + 1;
  const belowTile = getTile(grid, targetRow, player.col);

  if (!isWithinBounds(grid, targetRow, player.col) || isSupported(currentTile, belowTile)) {
    return null;
  }

  return moveTo(
    player,
    grid,
    targetRow,
    player.col,
    PLAYER_MOVEMENT_STATE.FALLING,
  );
}

function resolveHorizontalMovementState(
  grid: LevelCell[][],
  row: number,
  col: number,
): PlayerMovementState | undefined {
  return getTile(grid, row, col) === TileType.BAR
    ? PLAYER_MOVEMENT_STATE.ON_BAR
    : undefined;
}

function advancePlayer(
  player: PhysicsPlayerState,
  input: InputState,
  grid: LevelCell[][],
): PhysicsPlayerState {
  const currentTile = getTile(grid, player.row, player.col);
  const belowTile = getTile(grid, player.row + 1, player.col);
  const supported = isSupported(currentTile, belowTile);

  switch (input.activeAction) {
    case InputAction.MOVE_LEFT:
      if (supported) {
        const nextPlayer = moveTo(
          player,
          grid,
          player.row,
          player.col - 1,
          resolveHorizontalMovementState(grid, player.row, player.col - 1),
        );

        if (nextPlayer !== null) {
          return nextPlayer;
        }
      }
      break;

    case InputAction.MOVE_RIGHT:
      if (supported) {
        const nextPlayer = moveTo(
          player,
          grid,
          player.row,
          player.col + 1,
          resolveHorizontalMovementState(grid, player.row, player.col + 1),
        );

        if (nextPlayer !== null) {
          return nextPlayer;
        }
      }
      break;

    case InputAction.CLIMB_UP:
      if (currentTile === TileType.LADDER) {
        const nextPlayer = moveTo(
          player,
          grid,
          player.row - 1,
          player.col,
          PLAYER_MOVEMENT_STATE.CLIMBING,
        );

        if (nextPlayer !== null && getTile(grid, nextPlayer.row, nextPlayer.col) === TileType.LADDER) {
          return nextPlayer;
        }
      }
      break;

    case InputAction.CLIMB_DOWN:
      if (currentTile === TileType.LADDER && getTile(grid, player.row + 1, player.col) === TileType.LADDER) {
        const nextPlayer = moveTo(
          player,
          grid,
          player.row + 1,
          player.col,
          PLAYER_MOVEMENT_STATE.CLIMBING,
        );

        if (nextPlayer !== null) {
          return nextPlayer;
        }
      }
      break;

    case InputAction.DIG_LEFT:
    case InputAction.DIG_RIGHT:
    case InputAction.NONE:
      break;

    default:
      break;
  }

  return applyGravity(player, grid) ?? createPlayer(player, player.row, player.col);
}

function updatePlayerPosition(
  gameState: GameState,
  player: PhysicsPlayerState,
): GameState {
  return {
    ...gameState,
    player,
    playerPosition: {
      row: player.row,
      col: player.col,
    },
  };
}

function countVisibleGold(grid: LevelCell[][]): number {
  return grid.flat().filter((tile) => tile === TileType.GOLD).length;
}

function resolveCompletionStatus(
  gameState: GameState,
  allGoldCollected: boolean,
): LevelCompletionStatus {
  if (gameState.levelComplete || gameState.completionStatus === LevelCompletionStatus.COMPLETED) {
    return LevelCompletionStatus.COMPLETED;
  }

  return allGoldCollected
    ? LevelCompletionStatus.ALL_GOLD_COLLECTED
    : LevelCompletionStatus.IN_PROGRESS;
}

function collectGold(gameState: GameState): GameState {
  const { row, col } = gameState.player;
  const goldKey = `${row},${col}`;

  if (
    getTile(gameState.levelData.grid, row, col) !== TileType.GOLD ||
    gameState.collectedGold.has(goldKey)
  ) {
    return gameState;
  }

  const nextGrid = gameState.levelData.grid.map((gridRow, rowIndex) =>
    rowIndex === row ? [...gridRow] : [...gridRow],
  );

  nextGrid[row][col] = TileType.EMPTY;

  const nextCollectedGold = new Set(gameState.collectedGold);
  nextCollectedGold.add(goldKey);

  const goldRemaining = countVisibleGold(nextGrid);
  const totalGold = goldRemaining + nextCollectedGold.size;
  const allGoldCollected = goldRemaining === 0;

  return {
    ...gameState,
    levelData: {
      ...gameState.levelData,
      grid: nextGrid,
    },
    collectedGold: nextCollectedGold,
    totalGold,
    goldRemaining,
    allGoldCollected,
    completionStatus: resolveCompletionStatus(gameState, allGoldCollected),
  };
}

export function updatePlayer(
  gameState: GameState,
  input: InputState,
  deltaMs: number,
): GameState {
  assertRequired(gameState, "gameState");
  assertRequired(input, "input");
  assertRequired(deltaMs, "deltaMs");
  assertRequired(gameState.levelData, "gameState.levelData");
  assertRequired(gameState.levelData.grid, "gameState.levelData.grid");
  assertRequired(gameState.player, "gameState.player");
  assertValidDeltaMs(deltaMs);
  assertValidGrid(gameState.levelData.grid);

  let nextState = updatePlayerPosition(
    gameState,
    clampPlayer(gameState.player as PhysicsPlayerState, gameState.levelData.grid),
  );
  const movementSteps = Math.floor(deltaMs / PLAYER_MOVEMENT_TICK_MS);

  if (movementSteps === 0) {
    return collectGold(nextState);
  }

  for (let step = 0; step < movementSteps; step += 1) {
    const nextPlayer = advancePlayer(
      nextState.player as PhysicsPlayerState,
      input,
      nextState.levelData.grid,
    );

    nextState = collectGold(updatePlayerPosition(nextState, nextPlayer));
  }

  return nextState;
}
