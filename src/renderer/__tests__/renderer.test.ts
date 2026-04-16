import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnimationDef, SpriteSheet } from "../../assets/types";
import { TileType, type LevelCell, type LevelData } from "../../level/types";
import type { CharacterSpriteMapping, RenderConfig, TileSpriteMapping } from "../../types";

interface LoadedSpriteSheet {
  image: CanvasImageSource;
  spriteSheet: SpriteSheet;
}

interface Renderer {
  renderTileGrid: (levelData: LevelData) => void;
  renderEntity: (
    spriteSheetKey: string,
    animation: AnimationDef,
    x: number,
    y: number,
    elapsedMs: number,
  ) => void;
  clearFrame: () => void;
}

type CreateRenderer = (
  ctx: CanvasRenderingContext2D,
  config: RenderConfig,
  spriteSheets: Map<string, LoadedSpriteSheet>,
) => Renderer;

interface MockCanvasContext {
  canvas: {
    width: number;
    height: number;
  };
  clearRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

const RENDERER_MODULE_PATH = "../renderer";

async function loadCreateRenderer(): Promise<CreateRenderer> {
  const rendererModule = (await import(RENDERER_MODULE_PATH)) as {
    createRenderer?: CreateRenderer;
  };

  expect(rendererModule.createRenderer).toBeTypeOf("function");

  return rendererModule.createRenderer as CreateRenderer;
}

function createMockContext(width = 320, height = 192): {
  ctx: CanvasRenderingContext2D;
  mock: MockCanvasContext;
} {
  const mock: MockCanvasContext = {
    canvas: {
      width,
      height,
    },
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  };

  return {
    ctx: mock as unknown as CanvasRenderingContext2D,
    mock,
  };
}

function createTileSpriteMap(): Record<TileType, TileSpriteMapping> {
  return {
    [TileType.EMPTY]: { spriteSheetKey: "tiles", frame: 0 },
    [TileType.BRICK]: { spriteSheetKey: "tiles", frame: 6 },
    [TileType.SOLID]: { spriteSheetKey: "tiles", frame: 1 },
    [TileType.LADDER]: { spriteSheetKey: "tiles", frame: 9 },
    [TileType.BAR]: { spriteSheetKey: "tiles", frame: 3 },
    [TileType.GOLD]: { spriteSheetKey: "tiles", frame: 11 },
    [TileType.HIDDEN_LADDER]: { spriteSheetKey: "tiles", frame: 5 },
    [TileType.SPAWN_PLAYER]: { spriteSheetKey: "tiles", frame: 7 },
    [TileType.SPAWN_ENEMY]: { spriteSheetKey: "tiles", frame: 8 },
  };
}

function createCharacterSprites(): Record<string, CharacterSpriteMapping> {
  return {
    player: {
      idle: "playerIdle",
      running: "playerRunning",
      climbing: "playerClimbing",
      falling: "playerFalling",
      digging: "playerDigging",
    },
  };
}

function createRenderConfig(tileSize = 32): RenderConfig {
  return {
    tileSize,
    tileSpriteMap: createTileSpriteMap(),
    characterSprites: createCharacterSprites(),
  };
}

function createLevelData(grid: LevelCell[][]): LevelData {
  return {
    formatVersion: 1,
    name: "renderer-test",
    width: grid[0]?.length ?? 0,
    height: grid.length,
    grid: grid.map((row) => [...row]),
    playerSpawn: { row: 0, col: 0 },
    enemySpawns: [],
    timers: {
      regenDelayMs: 1000,
    },
  };
}

function createLoadedSpriteSheets(): {
  spriteSheets: Map<string, LoadedSpriteSheet>;
  tileImage: CanvasImageSource;
  actorImage: CanvasImageSource;
} {
  const tileImage = { src: "/sprites/tiles.png" } as unknown as CanvasImageSource;
  const actorImage = { src: "/sprites/actors.png" } as unknown as CanvasImageSource;

  return {
    spriteSheets: new Map<string, LoadedSpriteSheet>([
      [
        "tiles",
        {
          image: tileImage,
          spriteSheet: {
            imageUrl: "/sprites/tiles.png",
            frameWidth: 16,
            frameHeight: 16,
            columns: 4,
            rows: 4,
          },
        },
      ],
      [
        "actors",
        {
          image: actorImage,
          spriteSheet: {
            imageUrl: "/sprites/actors.png",
            frameWidth: 16,
            frameHeight: 24,
            columns: 4,
            rows: 2,
          },
        },
      ],
    ]),
    tileImage,
    actorImage,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRenderer", () => {
  it("accepts a canvas context, render config, and loaded sprite sheets and returns a renderer", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx } = createMockContext();
    const config = createRenderConfig();
    const { spriteSheets } = createLoadedSpriteSheets();

    const renderer = createRenderer(ctx, config, spriteSheets);

    expect(renderer).toMatchObject({
      renderTileGrid: expect.any(Function),
      renderEntity: expect.any(Function),
      clearFrame: expect.any(Function),
    });
  });

  it("throws for nullish required arguments", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx } = createMockContext();
    const config = createRenderConfig();
    const { spriteSheets } = createLoadedSpriteSheets();

    expect(() =>
      createRenderer(null as unknown as CanvasRenderingContext2D, config, spriteSheets),
    ).toThrow();
    expect(() =>
      createRenderer(ctx, undefined as unknown as RenderConfig, spriteSheets),
    ).toThrow();
    expect(() =>
      createRenderer(ctx, config, null as unknown as Map<string, LoadedSpriteSheet>),
    ).toThrow();
  });
});

describe("renderTileGrid", () => {
  it("draws each cell with the sprite-sheet frame clipped from the configured tile sheet", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx, mock } = createMockContext();
    const config = createRenderConfig(32);
    const { spriteSheets, tileImage } = createLoadedSpriteSheets();
    const renderer = createRenderer(ctx, config, spriteSheets);
    const levelData = createLevelData([
      [TileType.EMPTY, TileType.BRICK],
      [TileType.LADDER, TileType.GOLD],
    ]);

    renderer.renderTileGrid(levelData);

    expect(mock.drawImage).toHaveBeenCalledTimes(4);
    expect(mock.drawImage).toHaveBeenNthCalledWith(1, tileImage, 0, 0, 16, 16, 0, 0, 32, 32);
    expect(mock.drawImage).toHaveBeenNthCalledWith(2, tileImage, 32, 16, 16, 16, 32, 0, 32, 32);
    expect(mock.drawImage).toHaveBeenNthCalledWith(3, tileImage, 16, 32, 16, 16, 0, 32, 32, 32);
    expect(mock.drawImage).toHaveBeenNthCalledWith(4, tileImage, 48, 32, 16, 16, 32, 32, 32, 32);
  });

  it("does nothing for an empty grid and throws for nullish level data", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx, mock } = createMockContext();
    const renderer = createRenderer(ctx, createRenderConfig(), createLoadedSpriteSheets().spriteSheets);

    renderer.renderTileGrid(createLevelData([]));

    expect(mock.drawImage).not.toHaveBeenCalled();
    expect(() => renderer.renderTileGrid(null as unknown as LevelData)).toThrow();
    expect(() => renderer.renderTileGrid(undefined as unknown as LevelData)).toThrow();
  });
});

describe("renderEntity", () => {
  it("selects the animation frame from elapsed time and draws it at the provided pixel position", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx, mock } = createMockContext();
    const { spriteSheets, actorImage } = createLoadedSpriteSheets();
    const renderer = createRenderer(ctx, createRenderConfig(32), spriteSheets);
    const runningAnimation: AnimationDef = {
      name: "playerRunning",
      frames: [
        { frameIndex: 1, durationMs: 100 },
        { frameIndex: 6, durationMs: 120 },
        { frameIndex: 7, durationMs: 80 },
      ],
    };

    renderer.renderEntity("actors", runningAnimation, 40, 56, 460);

    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(actorImage, 32, 24, 16, 24, 40, 56, 32, 32);
  });

  it("throws for missing sprite sheets and nullish or empty animation definitions", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx } = createMockContext();
    const renderer = createRenderer(ctx, createRenderConfig(), createLoadedSpriteSheets().spriteSheets);

    expect(() =>
      renderer.renderEntity("missing", { name: "idle", frames: [{ frameIndex: 0, durationMs: 100 }] }, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.renderEntity("actors", null as unknown as AnimationDef, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.renderEntity("actors", undefined as unknown as AnimationDef, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.renderEntity("actors", { name: "empty", frames: [] }, 0, 0, 0),
    ).toThrow();
  });
});

describe("clearFrame", () => {
  it("clears the entire canvas", async () => {
    const createRenderer = await loadCreateRenderer();
    const { ctx, mock } = createMockContext(640, 360);
    const renderer = createRenderer(ctx, createRenderConfig(), createLoadedSpriteSheets().spriteSheets);

    renderer.clearFrame();

    expect(mock.clearRect).toHaveBeenCalledTimes(1);
    expect(mock.clearRect).toHaveBeenCalledWith(0, 0, 640, 360);
  });
});
