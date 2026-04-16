import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssetManifest } from "../../assets/types";
import { TileType } from "../../level/types";
import type { CharacterSpriteMapping, RenderConfig, TileSpriteMapping } from "../../types";

type SpriteRendererInstance = {
  drawTile: (tileType: TileType, col: number, row: number) => void;
  drawCharacterFrame: (
    spriteKey: string,
    animationName: string,
    frameIndex: number,
    x: number,
    y: number,
  ) => void;
};

type SpriteRendererCtor = new (
  ctx: CanvasRenderingContext2D,
  manifest: AssetManifest,
  config: RenderConfig,
) => SpriteRendererInstance;

interface MockCanvasContext {
  drawImage: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  fillStyle: string | CanvasGradient | CanvasPattern;
}

interface MockImageRecord {
  src: string;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
}

const SPRITE_RENDERER_MODULE_PATH = "../sprite-renderer";
const TILE_SHEET_URL = "/sprites/tiles.png";
const PLAYER_SHEET_URL = "/sprites/player.png";
const DEFAULT_FALLBACK_COLOR = "#ff4d6d";

async function loadSpriteRenderer(): Promise<SpriteRendererCtor> {
  const spriteRendererModule = (await import(SPRITE_RENDERER_MODULE_PATH)) as {
    SpriteRenderer?: SpriteRendererCtor;
  };

  expect(spriteRendererModule.SpriteRenderer).toBeTypeOf("function");

  return spriteRendererModule.SpriteRenderer as SpriteRendererCtor;
}

function createMockContext(): { ctx: CanvasRenderingContext2D; mock: MockCanvasContext } {
  const mock: MockCanvasContext = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "#000000",
  };

  return {
    ctx: mock as unknown as CanvasRenderingContext2D,
    mock,
  };
}

function installImageMock(loadedUrls: string[]): void {
  const loadedUrlSet = new Set(loadedUrls);

  class MockImage implements MockImageRecord {
    private currentSrc = "";

    complete = false;
    naturalWidth = 0;
    naturalHeight = 0;
    width = 0;
    height = 0;

    get src(): string {
      return this.currentSrc;
    }

    set src(value: string) {
      this.currentSrc = value;
      this.complete = loadedUrlSet.has(value);
      this.naturalWidth = this.complete ? 256 : 0;
      this.naturalHeight = this.complete ? 256 : 0;
      this.width = this.naturalWidth;
      this.height = this.naturalHeight;
    }
  }

  vi.stubGlobal("Image", MockImage as unknown as typeof Image);
}

function createManifest(): AssetManifest {
  return {
    spriteSheets: {
      tiles: {
        imageUrl: TILE_SHEET_URL,
        frameWidth: 16,
        frameHeight: 16,
        columns: 4,
        rows: 4,
      },
      player: {
        imageUrl: PLAYER_SHEET_URL,
        frameWidth: 16,
        frameHeight: 24,
        columns: 4,
        rows: 2,
      },
    },
    animations: {
      playerIdle: {
        name: "playerIdle",
        frames: [{ frameIndex: 0, durationMs: 100 }],
      },
      playerRunning: {
        name: "playerRunning",
        frames: [
          { frameIndex: 1, durationMs: 100 },
          { frameIndex: 5, durationMs: 100 },
        ],
      },
      playerClimbing: {
        name: "playerClimbing",
        frames: [{ frameIndex: 2, durationMs: 100 }],
      },
      playerFalling: {
        name: "playerFalling",
        frames: [{ frameIndex: 3, durationMs: 100 }],
      },
      playerDigging: {
        name: "playerDigging",
        frames: [{ frameIndex: 4, durationMs: 100 }],
      },
    },
    audioCues: {},
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

function createTileSpriteMap(): Record<TileType, TileSpriteMapping> {
  return {
    [TileType.EMPTY]: { spriteSheetKey: "tiles", frame: 0 },
    [TileType.BRICK]: { spriteSheetKey: "tiles", frame: 6 },
    [TileType.SOLID]: { spriteSheetKey: "tiles", frame: 1 },
    [TileType.LADDER]: { spriteSheetKey: "tiles", frame: 2 },
    [TileType.BAR]: { spriteSheetKey: "tiles", frame: 3 },
    [TileType.GOLD]: { spriteSheetKey: "tiles", frame: 4 },
    [TileType.HIDDEN_LADDER]: { spriteSheetKey: "tiles", frame: 5 },
    [TileType.SPAWN_PLAYER]: { spriteSheetKey: "tiles", frame: 7 },
    [TileType.SPAWN_ENEMY]: { spriteSheetKey: "tiles", frame: 8 },
  };
}

function createRenderConfig(tileSize: number, fallbackColor = DEFAULT_FALLBACK_COLOR): RenderConfig {
  return {
    tileSize,
    tileSpriteMap: createTileSpriteMap(),
    characterSprites: createCharacterSprites(),
    fallbackColor,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SpriteRenderer", () => {
  it("drawTile uses the mapped sprite-sheet frame and tileSize-scaled destination bounds", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    installImageMock([TILE_SHEET_URL]);
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer(ctx, createManifest(), createRenderConfig(32));

    renderer.drawTile(TileType.BRICK, 3, 2);

    expect(mock.fillRect).not.toHaveBeenCalled();
    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ src: TILE_SHEET_URL }),
      32,
      16,
      16,
      16,
      96,
      64,
      32,
      32,
    );
  });

  it("drawCharacterFrame resolves the animation frame and draws it with tileSize dimensions", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    installImageMock([PLAYER_SHEET_URL]);
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer(ctx, createManifest(), createRenderConfig(28));

    renderer.drawCharacterFrame("player", "running", 1, 48, 80);

    expect(mock.fillRect).not.toHaveBeenCalled();
    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ src: PLAYER_SHEET_URL }),
      16,
      24,
      16,
      24,
      48,
      80,
      28,
      28,
    );
  });

  it("falls back to fillRect with the configured fallbackColor when a sprite sheet image is not loaded", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    installImageMock([]);
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer(ctx, createManifest(), createRenderConfig(20, "#123456"));

    renderer.drawTile(TileType.GOLD, 1, 4);

    expect(mock.drawImage).not.toHaveBeenCalled();
    expect(mock.fillStyle).toBe("#123456");
    expect(mock.fillRect).toHaveBeenCalledTimes(1);
    expect(mock.fillRect).toHaveBeenCalledWith(20, 80, 20, 20);
  });

  it("throws for nullish constructor arguments and invalid draw requests", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    installImageMock([TILE_SHEET_URL, PLAYER_SHEET_URL]);
    const { ctx } = createMockContext();
    const manifest = createManifest();
    const config = createRenderConfig(24);

    expect(() => new SpriteRenderer(null as unknown as CanvasRenderingContext2D, manifest, config)).toThrow();
    expect(() => new SpriteRenderer(ctx, null as unknown as AssetManifest, config)).toThrow();
    expect(() => new SpriteRenderer(ctx, manifest, undefined as unknown as RenderConfig)).toThrow();

    const renderer = new SpriteRenderer(ctx, manifest, config);

    expect(() => renderer.drawTile(undefined as unknown as TileType, 0, 0)).toThrow();
    expect(() => renderer.drawCharacterFrame("", "running", 0, 0, 0)).toThrow();
    expect(() =>
      renderer.drawCharacterFrame("player", undefined as unknown as string, 0, 0, 0),
    ).toThrow();
    expect(() => renderer.drawCharacterFrame("player", "running", 99, 0, 0)).toThrow();
  });
});
