import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnimationDef, SpriteSheet } from "../types";

type SpriteRendererInstance = {
  drawFrame: (
    ctx: CanvasRenderingContext2D,
    spriteSheet: SpriteSheet,
    image: CanvasImageSource,
    frameIndex: number,
    x: number,
    y: number,
  ) => void;
  drawAnimation: (
    ctx: CanvasRenderingContext2D,
    spriteSheet: SpriteSheet,
    image: CanvasImageSource,
    animation: AnimationDef,
    elapsedMs: number,
    x: number,
    y: number,
  ) => void;
};

type SpriteRendererCtor = new () => SpriteRendererInstance;

interface MockCanvasContext {
  drawImage: ReturnType<typeof vi.fn>;
}

const SPRITE_RENDERER_MODULE_PATH = "../sprite-renderer";

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
  };

  return {
    ctx: mock as unknown as CanvasRenderingContext2D,
    mock,
  };
}

function createSpriteSheet(): SpriteSheet {
  return {
    imageUrl: "/sprites/player.png",
    frameWidth: 16,
    frameHeight: 24,
    columns: 4,
    rows: 2,
  };
}

function createImage(): CanvasImageSource {
  return { src: "/sprites/player.png" } as unknown as CanvasImageSource;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SpriteRenderer", () => {
  it("drawFrame computes the source clip from the frame index and draws the frame at the destination point", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer();
    const spriteSheet = createSpriteSheet();
    const image = createImage();

    renderer.drawFrame(ctx, spriteSheet, image, 5, 64, 80);

    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(image, 16, 24, 16, 24, 64, 80, 16, 24);
  });

  it("drawAnimation selects the frame whose cumulative duration contains the elapsed time", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer();
    const spriteSheet = createSpriteSheet();
    const image = createImage();
    const animation: AnimationDef = {
      name: "run",
      frames: [
        { frameIndex: 1, durationMs: 100 },
        { frameIndex: 6, durationMs: 150 },
        { frameIndex: 7, durationMs: 50 },
      ],
    };

    renderer.drawAnimation(ctx, spriteSheet, image, animation, 220, 40, 56);

    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(image, 32, 24, 16, 24, 40, 56, 16, 24);
  });

  it("loops back to the first frame after the animation duration is exhausted", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer();
    const spriteSheet = createSpriteSheet();
    const image = createImage();
    const animation: AnimationDef = {
      name: "loop",
      frames: [
        { frameIndex: 2, durationMs: 100 },
        { frameIndex: 5, durationMs: 100 },
        { frameIndex: 6, durationMs: 100 },
      ],
    };

    renderer.drawAnimation(ctx, spriteSheet, image, animation, 305, 12, 18);

    expect(mock.drawImage).toHaveBeenCalledTimes(1);
    expect(mock.drawImage).toHaveBeenCalledWith(image, 32, 0, 16, 24, 12, 18, 16, 24);
  });

  it("always draws the only frame for a single-frame animation", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    const { ctx, mock } = createMockContext();
    const renderer = new SpriteRenderer();
    const spriteSheet = createSpriteSheet();
    const image = createImage();
    const animation: AnimationDef = {
      name: "idle",
      frames: [{ frameIndex: 3, durationMs: 120 }],
    };

    renderer.drawAnimation(ctx, spriteSheet, image, animation, 0, 8, 10);
    renderer.drawAnimation(ctx, spriteSheet, image, animation, 999, 8, 10);

    expect(mock.drawImage).toHaveBeenCalledTimes(2);
    expect(mock.drawImage).toHaveBeenNthCalledWith(1, image, 48, 0, 16, 24, 8, 10, 16, 24);
    expect(mock.drawImage).toHaveBeenNthCalledWith(2, image, 48, 0, 16, 24, 8, 10, 16, 24);
  });

  it("throws for nullish drawing inputs and empty animation definitions", async () => {
    const SpriteRenderer = await loadSpriteRenderer();
    const { ctx } = createMockContext();
    const renderer = new SpriteRenderer();
    const spriteSheet = createSpriteSheet();
    const image = createImage();

    expect(() =>
      renderer.drawFrame(undefined as unknown as CanvasRenderingContext2D, spriteSheet, image, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawFrame(ctx, null as unknown as SpriteSheet, image, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawFrame(ctx, spriteSheet, undefined as unknown as CanvasImageSource, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawFrame(ctx, spriteSheet, image, undefined as unknown as number, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawAnimation(ctx, spriteSheet, image, null as unknown as AnimationDef, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawAnimation(ctx, spriteSheet, image, undefined as unknown as AnimationDef, 0, 0, 0),
    ).toThrow();
    expect(() =>
      renderer.drawAnimation(ctx, spriteSheet, image, { name: "empty", frames: [] }, 0, 0, 0),
    ).toThrow();
  });
});
