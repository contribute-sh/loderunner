/// <reference types="vitest/globals" />

declare module "*converter" {
  export function toLevelData(
    parsed: import("../../levels/parser").ParsedLevel,
    name?: string,
  ): import("../../level/types").LevelData;
}

declare module "*state" {
  interface Position {
    row: number;
    col: number;
  }

  export default class GameState {
    player?: Position;
    playerPosition?: Position;
    grid?: import("../../level/types").TileType[][];
    levelData?: Pick<import("../../level/types").LevelData, "grid">;
    goldCollected?: number;
    collectedGold?: number | Set<string>;

    constructor(level: import("../../levels/parser").ParsedLevel);

    moveLeft(): void;
    moveRight(): void;
    moveUp(): void;
    moveDown(): void;
    applyGravity(): void;
  }
}

type LevelData = import("../../level/types").LevelData;
type ParsedLevel = import("../../levels/parser").ParsedLevel;
type TileType = import("../../level/types").TileType;

type Position = {
  row: number;
  col: number;
};

type GameStateInstance = {
  player?: Position;
  playerPosition?: Position;
  grid?: LevelData["grid"];
  levelData?: Pick<LevelData, "grid">;
  goldCollected?: number;
  collectedGold?: number | Set<string>;
  moveLeft(): void;
  moveRight(): void;
  moveUp(): void;
  moveDown(): void;
  applyGravity(): void;
};

type GameStateConstructor = new (level: ParsedLevel) => GameStateInstance;

const STATE_MODULE_PATH = "../state";

const TILE = {
  EMPTY: "EMPTY",
  BRICK: "BRICK",
  SOLID: "SOLID",
  LADDER: "LADDER",
  BAR: "BAR",
  GOLD: "GOLD",
} as const;

function createPosition(row: number, col: number): Position {
  return { row, col };
}

function tileToGridCell(tile: string): TileType {
  switch (tile) {
    case ".":
    case "P":
    case "E":
      return TILE.EMPTY as TileType;
    case "#":
      return TILE.BRICK as TileType;
    case "=":
      return TILE.SOLID as TileType;
    case "H":
      return TILE.LADDER as TileType;
    case "-":
      return TILE.BAR as TileType;
    case "$":
      return TILE.GOLD as TileType;
    default:
      throw new Error(`Unknown test tile: ${tile}`);
  }
}

function createGrid(tiles: string[]): LevelData["grid"] {
  return tiles.map((row) => [...row].map(tileToGridCell));
}

function createParsedLevel({
  tiles,
  playerSpawn,
}: {
  tiles: string[];
  playerSpawn?: Position;
}): ParsedLevel {
  const rows = tiles.length;
  const cols = tiles[0]?.length ?? 0;
  const empty: Position[] = [];
  const bricks: Position[] = [];
  const stones: Position[] = [];
  const ladders: Position[] = [];
  const bars: Position[] = [];
  const gold: Position[] = [];
  const enemies: Position[] = [];
  let inferredPlayerSpawn: Position | null = null;

  for (const row of tiles) {
    if (row.length !== cols) {
      throw new Error("Test fixtures must use rectangular tile rows");
    }
  }

  for (const [rowIndex, row] of tiles.entries()) {
    for (const [colIndex, tile] of [...row].entries()) {
      const position = createPosition(rowIndex, colIndex);

      switch (tile) {
        case ".":
          empty.push(position);
          break;
        case "#":
          bricks.push(position);
          break;
        case "=":
          stones.push(position);
          break;
        case "H":
          ladders.push(position);
          break;
        case "-":
          bars.push(position);
          break;
        case "$":
          gold.push(position);
          break;
        case "E":
          enemies.push(position);
          break;
        case "P":
          if (inferredPlayerSpawn !== null) {
            throw new Error("Test fixtures may only declare one player spawn");
          }
          inferredPlayerSpawn = position;
          break;
        default:
          throw new Error(`Unknown test tile: ${tile}`);
      }
    }
  }

  return {
    rows,
    cols,
    tiles,
    empty,
    bricks,
    stones,
    ladders,
    bars,
    gold,
    enemies,
    playerSpawn:
      playerSpawn ??
      inferredPlayerSpawn ??
      (() => {
        throw new Error("Test fixtures must provide a player spawn");
      })(),
  };
}

function getPlayerPosition(state: GameStateInstance): Position {
  if (state.playerPosition !== undefined) {
    return state.playerPosition;
  }

  if (state.player !== undefined) {
    return state.player;
  }

  throw new Error("GameState must expose playerPosition or player");
}

function getGrid(state: GameStateInstance): LevelData["grid"] {
  if (state.grid !== undefined) {
    return state.grid;
  }

  if (state.levelData?.grid !== undefined) {
    return state.levelData.grid;
  }

  throw new Error("GameState must expose grid or levelData.grid");
}

function getCollectedGoldCount(state: GameStateInstance): number {
  if (typeof state.goldCollected === "number") {
    return state.goldCollected;
  }

  if (typeof state.collectedGold === "number") {
    return state.collectedGold;
  }

  if (state.collectedGold instanceof Set) {
    return state.collectedGold.size;
  }

  throw new Error("GameState must expose a collected gold counter");
}

async function loadGameState(): Promise<GameStateConstructor> {
  const { default: GameState } = (await import(STATE_MODULE_PATH)) as {
    default?: GameStateConstructor;
  };

  expect(GameState).toBeTypeOf("function");

  return GameState as GameStateConstructor;
}

async function createGameState(level: ParsedLevel): Promise<GameStateInstance> {
  const GameState = await loadGameState();

  return new GameState(level);
}

describe("GameState", () => {
  describe("initialization", () => {
    it("places the player at playerSpawn and populates the grid from ParsedLevel tiles", async () => {
      const state = await createGameState(
        createParsedLevel({
          tiles: [
            "P.H$",
            "#=E-",
          ],
        }),
      );

      expect(getPlayerPosition(state)).toEqual(createPosition(0, 0));
      expect(getGrid(state)).toEqual(
        createGrid([
          "P.H$",
          "#=E-",
        ]),
      );
      expect(getCollectedGoldCount(state)).toBe(0);
    });

    it("throws for nullish or empty parsed levels", async () => {
      const GameState = await loadGameState();

      expect(() => new GameState(null as unknown as ParsedLevel)).toThrow();
      expect(() => new GameState(undefined as unknown as ParsedLevel)).toThrow();
      expect(() =>
        new GameState({
          rows: 0,
          cols: 0,
          tiles: [],
          empty: [],
          bricks: [],
          stones: [],
          ladders: [],
          bars: [],
          gold: [],
          enemies: [],
          playerSpawn: createPosition(0, 0),
        }),
      ).toThrow();
    });
  });

  describe("horizontal movement", () => {
    it("moves left and right across empty tiles", async () => {
      const state = await createGameState(
        createParsedLevel({
          tiles: [
            ".....",
            ".....",
            "=====",
          ],
          playerSpawn: createPosition(1, 2),
        }),
      );

      state.moveLeft();
      expect(getPlayerPosition(state)).toEqual(createPosition(1, 1));

      state.moveRight();
      expect(getPlayerPosition(state)).toEqual(createPosition(1, 2));

      state.moveRight();
      expect(getPlayerPosition(state)).toEqual(createPosition(1, 3));
    });

    it("does not move into bricks, stones, solid walls, or beyond the level bounds", async () => {
      const blockedState = await createGameState(
        createParsedLevel({
          tiles: [
            "...",
            "#.=",
            "===",
          ],
          playerSpawn: createPosition(1, 1),
        }),
      );

      blockedState.moveLeft();
      expect(getPlayerPosition(blockedState)).toEqual(createPosition(1, 1));

      blockedState.moveRight();
      expect(getPlayerPosition(blockedState)).toEqual(createPosition(1, 1));

      const leftEdgeState = await createGameState(
        createParsedLevel({
          tiles: [
            "...",
            "...",
            "===",
          ],
          playerSpawn: createPosition(1, 0),
        }),
      );

      leftEdgeState.moveLeft();
      expect(getPlayerPosition(leftEdgeState)).toEqual(createPosition(1, 0));

      const rightEdgeState = await createGameState(
        createParsedLevel({
          tiles: [
            "...",
            "...",
            "===",
          ],
          playerSpawn: createPosition(1, 2),
        }),
      );

      rightEdgeState.moveRight();
      expect(getPlayerPosition(rightEdgeState)).toEqual(createPosition(1, 2));
    });
  });

  describe("ladder climbing", () => {
    it("moves up and down on ladder tiles", async () => {
      const state = await createGameState(
        createParsedLevel({
          tiles: [
            ".H.",
            ".H.",
            ".H.",
            "===",
          ],
          playerSpawn: createPosition(1, 1),
        }),
      );

      state.moveUp();
      expect(getPlayerPosition(state)).toEqual(createPosition(0, 1));

      state.moveDown();
      expect(getPlayerPosition(state)).toEqual(createPosition(1, 1));

      state.moveDown();
      expect(getPlayerPosition(state)).toEqual(createPosition(2, 1));
    });
  });

  describe("bar traversal", () => {
    it("moves left and right on bars and falls after stepping into unsupported space", async () => {
      const traversalState = await createGameState(
        createParsedLevel({
          tiles: [
            ".....",
            "---..",
            ".....",
            "=====",
          ],
          playerSpawn: createPosition(1, 1),
        }),
      );

      traversalState.moveLeft();
      expect(getPlayerPosition(traversalState)).toEqual(createPosition(1, 0));

      traversalState.moveRight();
      expect(getPlayerPosition(traversalState)).toEqual(createPosition(1, 1));

      traversalState.moveRight();
      expect(getPlayerPosition(traversalState)).toEqual(createPosition(1, 2));

      const fallingState = await createGameState(
        createParsedLevel({
          tiles: [
            ".....",
            "--...",
            ".....",
            "=====",
          ],
          playerSpawn: createPosition(1, 1),
        }),
      );

      fallingState.moveRight();
      expect(getPlayerPosition(fallingState)).toEqual(createPosition(1, 2));

      fallingState.applyGravity();
      expect(getPlayerPosition(fallingState)).toEqual(createPosition(2, 2));
    });
  });

  describe("gravity", () => {
    it("falls when there is empty space below and the player is not on a ladder or bar", async () => {
      const state = await createGameState(
        createParsedLevel({
          tiles: [
            "...",
            "...",
            "...",
            "===",
          ],
          playerSpawn: createPosition(1, 1),
        }),
      );

      state.applyGravity();

      expect(getPlayerPosition(state)).toEqual(createPosition(2, 1));
    });
  });

  describe("gold collection", () => {
    it("removes gold and increments the collected counter when the player moves onto a gold tile", async () => {
      const state = await createGameState(
        createParsedLevel({
          tiles: [
            "...",
            ".$.",
            "===",
          ],
          playerSpawn: createPosition(1, 0),
        }),
      );

      expect(getGrid(state)[1][1]).toBe(TILE.GOLD);
      expect(getCollectedGoldCount(state)).toBe(0);

      state.moveRight();

      expect(getPlayerPosition(state)).toEqual(createPosition(1, 1));
      expect(getGrid(state)[1][1]).toBe(TILE.EMPTY);
      expect(getCollectedGoldCount(state)).toBe(1);
    });
  });
});
