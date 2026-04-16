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

const MOVEMENT_MODULE_PATH = "../movement";
const PLAYER_SPEED_DT = 1 / 8;

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

function createGrid(rows: TileType[][]): LevelCell[][] {
  return rows.map((row) => [...row]);
}

describe("movePlayer", () => {
  describe("walking", () => {
    it("moves left and right when standing on solid ground", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);
      const player = createPlayer(1, 2);

      expect(
        movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 1));
      expect(
        movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 3));
      expect(player).toEqual(createPlayer(1, 2));
    });

    it("moves left and right when standing on brick ground", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.BRICK, TileType.BRICK, TileType.BRICK, TileType.BRICK, TileType.BRICK],
      ]);
      const player = createPlayer(1, 2);

      expect(
        movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 1));
      expect(
        movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 3));
    });

    it("does not move into brick or solid walls", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.BRICK, TileType.EMPTY, TileType.SOLID, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);
      const player = createPlayer(1, 2);

      expect(
        movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT),
      ).toEqual(player);
      expect(
        movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT),
      ).toEqual(player);
    });
  });

  describe("climbing", () => {
    it("climbs up and down ladder tiles", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);

      expect(
        movePlayer(createPlayer(2, 1), createInput(InputAction.CLIMB_UP), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 1));
      expect(
        movePlayer(
          createPlayer(2, 1),
          createInput(InputAction.CLIMB_DOWN),
          grid,
          PLAYER_SPEED_DT,
        ),
      ).toEqual(createPlayer(3, 1));
    });
  });

  describe("bar traversal", () => {
    it("moves left and right while hanging from bars", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.BAR, TileType.BAR, TileType.BAR, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]);
      const player = createPlayer(1, 2);

      expect(
        movePlayer(player, createInput(InputAction.MOVE_LEFT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 1));
      expect(
        movePlayer(player, createInput(InputAction.MOVE_RIGHT), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(1, 3));
    });
  });

  describe("falling", () => {
    it("falls when the player is over empty space without ladder or bar support", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);

      expect(
        movePlayer(createPlayer(1, 1), createInput(InputAction.NONE), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(2, 1));
    });

    it("does not fall when supported by brick or solid ground", async () => {
      const movePlayer = await loadMovePlayer();
      const player = createPlayer(1, 1);
      const solidGroundGrid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);
      const brickGroundGrid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.BRICK, TileType.BRICK, TileType.BRICK],
      ]);

      expect(
        movePlayer(player, createInput(InputAction.NONE), solidGroundGrid, PLAYER_SPEED_DT),
      ).toEqual(player);
      expect(
        movePlayer(player, createInput(InputAction.NONE), brickGroundGrid, PLAYER_SPEED_DT),
      ).toEqual(player);
    });

    it("does not fall while standing on the bottom rung of a ladder", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      ]);

      expect(
        movePlayer(createPlayer(2, 1), createInput(InputAction.NONE), grid, PLAYER_SPEED_DT),
      ).toEqual(createPlayer(2, 1));
    });
  });

  describe("boundaries", () => {
    it("does not move beyond the left and right edges of the grid", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);

      expect(
        movePlayer(
          createPlayer(1, 0),
          createInput(InputAction.MOVE_LEFT),
          grid,
          PLAYER_SPEED_DT,
        ),
      ).toEqual(createPlayer(1, 0));
      expect(
        movePlayer(
          createPlayer(1, 2),
          createInput(InputAction.MOVE_RIGHT),
          grid,
          PLAYER_SPEED_DT,
        ),
      ).toEqual(createPlayer(1, 2));
    });

    it("does not move beyond the top and bottom edges of the grid", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
        [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
      ]);

      expect(
        movePlayer(
          createPlayer(0, 1),
          createInput(InputAction.CLIMB_UP),
          grid,
          PLAYER_SPEED_DT,
        ),
      ).toEqual(createPlayer(0, 1));
      expect(
        movePlayer(
          createPlayer(2, 1),
          createInput(InputAction.CLIMB_DOWN),
          grid,
          PLAYER_SPEED_DT,
        ),
      ).toEqual(createPlayer(2, 1));
    });
  });

  describe("invalid input", () => {
    it("throws for nullish required arguments", async () => {
      const movePlayer = await loadMovePlayer();
      const grid = createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]);
      const player = createPlayer(1, 1);
      const input = createInput(InputAction.NONE);

      expect(() => movePlayer(null as unknown as PlayerState, input, grid, PLAYER_SPEED_DT)).toThrow();
      expect(() =>
        movePlayer(undefined as unknown as PlayerState, input, grid, PLAYER_SPEED_DT),
      ).toThrow();
      expect(() => movePlayer(player, null as unknown as InputState, grid, PLAYER_SPEED_DT)).toThrow();
      expect(() =>
        movePlayer(player, undefined as unknown as InputState, grid, PLAYER_SPEED_DT),
      ).toThrow();
      expect(() => movePlayer(player, input, null as unknown as LevelCell[][], PLAYER_SPEED_DT)).toThrow();
      expect(() =>
        movePlayer(player, input, undefined as unknown as LevelCell[][], PLAYER_SPEED_DT),
      ).toThrow();
    });

    it("throws for an empty grid", async () => {
      const movePlayer = await loadMovePlayer();
      const player = createPlayer(0, 0);
      const input = createInput(InputAction.NONE);

      expect(() => movePlayer(player, input, [], PLAYER_SPEED_DT)).toThrow();
    });
  });
});
