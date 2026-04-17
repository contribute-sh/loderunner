import { describe, expect, it } from "vitest";

import { InputAction, type InputState } from "../../input/types";
import { TileType, type LevelCell, type LevelData, type SpawnPoint } from "../../level/types";
import { LevelCompletionStatus, type GameState } from "../types";

const PHYSICS_MODULE_PATH = "../physics";
const MOVEMENT_TICK_MS = 125;

const PLAYER_MOVEMENT_STATE = {
  CLIMBING: "CLIMBING",
  FALLING: "FALLING",
  ON_BAR: "ON_BAR",
} as const;

type PlayerMovementState =
  (typeof PLAYER_MOVEMENT_STATE)[keyof typeof PLAYER_MOVEMENT_STATE];

type PhysicsPlayerState = GameState["player"] & {
  movementState?: PlayerMovementState;
};

type PhysicsGameState = Omit<GameState, "player"> & {
  player: PhysicsPlayerState;
};

type UpdatePlayer = (
  state: PhysicsGameState,
  input: InputState,
  deltaMs: number,
) => PhysicsGameState;

async function loadUpdatePlayer(): Promise<UpdatePlayer> {
  const physicsModule = (await import(PHYSICS_MODULE_PATH)) as {
    updatePlayer?: UpdatePlayer;
  };

  expect(physicsModule.updatePlayer).toBeTypeOf("function");

  return physicsModule.updatePlayer as UpdatePlayer;
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

function createPlayer(
  row: number,
  col: number,
  overrides: Partial<PhysicsPlayerState> = {},
): PhysicsPlayerState {
  return {
    row,
    col,
    isAlive: true,
    ...overrides,
  };
}

function createInput(activeAction: InputAction): InputState {
  return {
    activeAction,
    keysDown: new Set<string>(),
  };
}

function createLevelData({
  grid,
  playerSpawn = createSpawnPoint(0, 0),
  name = "physics-test",
}: {
  grid: LevelCell[][];
  playerSpawn?: SpawnPoint;
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
      regenDelayMs: 1000,
    },
  };
}

function createState({
  grid,
  player = createPlayer(0, 0),
  collectedGold = [],
}: {
  grid: LevelCell[][];
  player?: PhysicsPlayerState;
  collectedGold?: string[];
}): PhysicsGameState {
  const levelData = createLevelData({
    grid,
    playerSpawn: createSpawnPoint(player.row, player.col),
  });
  const visibleGold = countGold(levelData.grid);
  const totalGold = visibleGold + collectedGold.length;
  const goldRemaining = visibleGold;
  const allGoldCollected = goldRemaining === 0;

  return {
    levelData,
    playerPosition: createSpawnPoint(player.row, player.col),
    enemyPositions: [],
    isRunning: true,
    player,
    enemies: [],
    dugHoles: [],
    hiddenLadders: [],
    collectedGold: new Set<string>(collectedGold),
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

function expectPlayerAt(
  state: PhysicsGameState,
  row: number,
  col: number,
  movementState?: PlayerMovementState,
): void {
  const expectedPlayer: Partial<PhysicsPlayerState> = {
    row,
    col,
  };

  if (movementState !== undefined) {
    expectedPlayer.movementState = movementState;
  }

  expect(state.player).toEqual(expect.objectContaining(expectedPlayer));
  expect(state.playerPosition).toEqual(createSpawnPoint(row, col));
}

describe("updatePlayer", () => {
  it("moves left and right across solid ground at a consistent per-tick speed", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);

    const movedLeft = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 2),
      }),
      createInput(InputAction.MOVE_LEFT),
      MOVEMENT_TICK_MS,
    );
    const stepOneRight = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );
    const stepTwoRight = updatePlayer(
      stepOneRight,
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(movedLeft, 1, 1);
    expectPlayerAt(stepOneRight, 1, 2);
    expectPlayerAt(stepTwoRight, 1, 3);
  });

  it("stops horizontal movement when a brick or solid tile blocks the path", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.BRICK, TileType.EMPTY, TileType.SOLID, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);
    const state = createState({
      grid,
      player: createPlayer(1, 2),
    });

    const leftCollision = updatePlayer(
      state,
      createInput(InputAction.MOVE_LEFT),
      MOVEMENT_TICK_MS,
    );
    const rightCollision = updatePlayer(
      state,
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(leftCollision, 1, 2);
    expectPlayerAt(rightCollision, 1, 2);
  });

  it("applies gravity when the player is over empty space with no ladder or bar support", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const nextState = updatePlayer(
      createState({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.SOLID, TileType.SOLID, TileType.SOLID],
        ]),
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.NONE),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(nextState, 2, 1, PLAYER_MOVEMENT_STATE.FALLING);
  });

  it.each([
    TileType.BRICK,
    TileType.SOLID,
    TileType.LADDER,
  ])("stops falling when landing above %s support", async (supportTile) => {
    const updatePlayer = await loadUpdatePlayer();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [supportTile, supportTile, supportTile],
    ]);

    const afterFall = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.NONE),
      MOVEMENT_TICK_MS,
    );
    const afterLanding = updatePlayer(
      afterFall,
      createInput(InputAction.NONE),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(afterFall, 2, 1, PLAYER_MOVEMENT_STATE.FALLING);
    expectPlayerAt(afterLanding, 2, 1);
  });

  it("enters CLIMBING and moves upward when up is pressed on a ladder", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const nextState = updatePlayer(
      createState({
        grid: createGrid([
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.SOLID, TileType.SOLID, TileType.SOLID],
        ]),
        player: createPlayer(2, 1),
      }),
      createInput(InputAction.CLIMB_UP),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(nextState, 1, 1, PLAYER_MOVEMENT_STATE.CLIMBING);
  });

  it("moves downward when down is pressed on a ladder", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const nextState = updatePlayer(
      createState({
        grid: createGrid([
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
          [TileType.SOLID, TileType.SOLID, TileType.SOLID],
        ]),
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.CLIMB_DOWN),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(nextState, 2, 1, PLAYER_MOVEMENT_STATE.CLIMBING);
  });

  it("traverses horizontally across bars in ON_BAR state", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.BAR, TileType.BAR, TileType.BAR, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
    ]);
    const leftState = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 2),
      }),
      createInput(InputAction.MOVE_LEFT),
      MOVEMENT_TICK_MS,
    );
    const rightState = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 2),
      }),
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(leftState, 1, 1, PLAYER_MOVEMENT_STATE.ON_BAR);
    expectPlayerAt(rightState, 1, 3, PLAYER_MOVEMENT_STATE.ON_BAR);
  });

  it("falls on the next tick after moving off a bar into unsupported empty space", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const grid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.BAR, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);

    const afterMovingOffBar = updatePlayer(
      createState({
        grid,
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );
    const afterFalling = updatePlayer(
      afterMovingOffBar,
      createInput(InputAction.NONE),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(afterMovingOffBar, 1, 2);
    expectPlayerAt(afterFalling, 2, 2, PLAYER_MOVEMENT_STATE.FALLING);
  });

  it("collects gold under the player, clears the tile, and updates gold counters", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const nextState = updatePlayer(
      createState({
        grid: createGrid([
          [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
          [TileType.EMPTY, TileType.GOLD, TileType.EMPTY],
          [TileType.SOLID, TileType.SOLID, TileType.SOLID],
        ]),
        player: createPlayer(1, 1),
      }),
      createInput(InputAction.NONE),
      MOVEMENT_TICK_MS,
    );

    expect(nextState.levelData.grid[1][1]).toBe(TileType.EMPTY);
    expect(nextState.collectedGold).toEqual(new Set<string>(["1,1"]));
    expect(nextState.totalGold).toBe(1);
    expect(nextState.goldRemaining).toBe(0);
    expect(nextState.allGoldCollected).toBe(true);
  });

  it("prevents movement outside the grid bounds", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const horizontalGrid = createGrid([
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
      [TileType.SOLID, TileType.SOLID, TileType.SOLID],
    ]);
    const verticalGrid = createGrid([
      [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
      [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
      [TileType.EMPTY, TileType.LADDER, TileType.EMPTY],
    ]);

    const leftEdge = updatePlayer(
      createState({
        grid: horizontalGrid,
        player: createPlayer(1, 0),
      }),
      createInput(InputAction.MOVE_LEFT),
      MOVEMENT_TICK_MS,
    );
    const rightEdge = updatePlayer(
      createState({
        grid: horizontalGrid,
        player: createPlayer(1, 2),
      }),
      createInput(InputAction.MOVE_RIGHT),
      MOVEMENT_TICK_MS,
    );
    const topEdge = updatePlayer(
      createState({
        grid: verticalGrid,
        player: createPlayer(0, 1),
      }),
      createInput(InputAction.CLIMB_UP),
      MOVEMENT_TICK_MS,
    );
    const bottomEdge = updatePlayer(
      createState({
        grid: verticalGrid,
        player: createPlayer(2, 1),
      }),
      createInput(InputAction.CLIMB_DOWN),
      MOVEMENT_TICK_MS,
    );

    expectPlayerAt(leftEdge, 1, 0);
    expectPlayerAt(rightEdge, 1, 2);
    expectPlayerAt(topEdge, 0, 1);
    expectPlayerAt(bottomEdge, 2, 1);
  });

  it("throws for nullish required arguments and invalid grid shapes", async () => {
    const updatePlayer = await loadUpdatePlayer();
    const state = createState({
      grid: createGrid([
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.EMPTY, TileType.EMPTY, TileType.EMPTY],
        [TileType.SOLID, TileType.SOLID, TileType.SOLID],
      ]),
      player: createPlayer(1, 1),
    });
    const input = createInput(InputAction.NONE);

    expect(() => updatePlayer(null as unknown as PhysicsGameState, input, MOVEMENT_TICK_MS)).toThrow();
    expect(() =>
      updatePlayer(undefined as unknown as PhysicsGameState, input, MOVEMENT_TICK_MS),
    ).toThrow();
    expect(() => updatePlayer(state, null as unknown as InputState, MOVEMENT_TICK_MS)).toThrow();
    expect(() =>
      updatePlayer(state, undefined as unknown as InputState, MOVEMENT_TICK_MS),
    ).toThrow();
    expect(() => updatePlayer(state, input, null as unknown as number)).toThrow();
    expect(() => updatePlayer(state, input, undefined as unknown as number)).toThrow();
    expect(() =>
      updatePlayer(
        createState({
          grid: [],
          player: createPlayer(0, 0),
        }),
        input,
        MOVEMENT_TICK_MS,
      ),
    ).toThrow();
    expect(() =>
      updatePlayer(
        createState({
          grid: [[]],
          player: createPlayer(0, 0),
        }),
        input,
        MOVEMENT_TICK_MS,
      ),
    ).toThrow();
    expect(() =>
      updatePlayer(
        createState({
          grid: [
            [TileType.EMPTY, TileType.EMPTY],
            [TileType.EMPTY],
          ],
          player: createPlayer(0, 0),
        }),
        input,
        MOVEMENT_TICK_MS,
      ),
    ).toThrow();
  });
});
