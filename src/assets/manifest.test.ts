import { describe, expect, it } from "vitest";

import { defaultManifest } from "./manifest";
import type { AnimationDef, AssetManifest, AudioCue, SpriteSheet } from "./types";

const REQUIRED_AUDIO_CUE_IDS = [
  "digging",
  "goldCollect",
  "enemyTrap",
  "levelComplete",
  "death",
  "backgroundMusic",
] as const;

function assertManifestDefined(
  manifest: AssetManifest | null | undefined,
): AssetManifest {
  if (!manifest) {
    throw new TypeError("Asset manifest is required.");
  }

  return manifest;
}

function assertNonEmptyRegistry<T>(
  registry: Record<string, T>,
  registryName: keyof AssetManifest,
): [string, T][] {
  const entries = Object.entries(registry);

  if (entries.length === 0) {
    throw new Error(`${registryName} must define at least one asset.`);
  }

  for (const [assetId] of entries) {
    if (assetId.trim().length === 0) {
      throw new Error(`${registryName} asset ids must be non-empty strings.`);
    }
  }

  return entries;
}

function assertValidSpriteSheets(
  manifest: AssetManifest | null | undefined,
): [string, SpriteSheet][] {
  const definedManifest = assertManifestDefined(manifest);
  const entries = assertNonEmptyRegistry(
    definedManifest.spriteSheets,
    "spriteSheets",
  );

  for (const [, spriteSheet] of entries) {
    if (!Number.isInteger(spriteSheet.frameWidth) || spriteSheet.frameWidth <= 0) {
      throw new Error("Sprite sheet frameWidth must be a positive integer.");
    }

    if (!Number.isInteger(spriteSheet.frameHeight) || spriteSheet.frameHeight <= 0) {
      throw new Error("Sprite sheet frameHeight must be a positive integer.");
    }

    if (!Number.isInteger(spriteSheet.columns) || spriteSheet.columns <= 0) {
      throw new Error("Sprite sheet columns must be a positive integer.");
    }

    if (!Number.isInteger(spriteSheet.rows) || spriteSheet.rows <= 0) {
      throw new Error("Sprite sheet rows must be a positive integer.");
    }
  }

  return entries;
}

function inferSpriteSheetId(animationId: string): string {
  const match = /^([a-z]+)[A-Z]/.exec(animationId);

  if (!match) {
    throw new Error(
      `Animation "${animationId}" must start with the sprite sheet id it uses.`,
    );
  }

  return match[1];
}

function assertAnimationsReferenceSpriteSheets(
  manifest: AssetManifest | null | undefined,
): [string, AnimationDef][] {
  const definedManifest = assertManifestDefined(manifest);
  const spriteSheetEntries = assertValidSpriteSheets(definedManifest);
  const animationEntries = assertNonEmptyRegistry(
    definedManifest.animations,
    "animations",
  );
  const spriteSheets = new Map<string, SpriteSheet>(spriteSheetEntries);

  for (const [animationId, animation] of animationEntries) {
    const spriteSheetId = inferSpriteSheetId(animationId);
    const spriteSheet = spriteSheets.get(spriteSheetId);

    if (!spriteSheet) {
      throw new Error(
        `Animation "${animationId}" references missing sprite sheet "${spriteSheetId}".`,
      );
    }

    if (animation.name !== animationId) {
      throw new Error(`Animation "${animationId}" must use the same name in its definition.`);
    }

    if (animation.frames.length === 0) {
      throw new Error(`Animation "${animationId}" must define at least one frame.`);
    }

    const maxFrameCount = spriteSheet.columns * spriteSheet.rows;

    for (const frame of animation.frames) {
      if (!Number.isInteger(frame.frameIndex) || frame.frameIndex < 0) {
        throw new Error(`Animation "${animationId}" frame indices must be non-negative integers.`);
      }

      if (frame.frameIndex >= maxFrameCount) {
        throw new Error(
          `Animation "${animationId}" frame ${frame.frameIndex} exceeds sprite sheet bounds.`,
        );
      }

      if (!Number.isInteger(frame.durationMs) || frame.durationMs <= 0) {
        throw new Error(
          `Animation "${animationId}" frame durations must be positive integers.`,
        );
      }
    }
  }

  return animationEntries;
}

function assertRequiredAudioCues(
  manifest: AssetManifest | null | undefined,
): [string, AudioCue][] {
  const definedManifest = assertManifestDefined(manifest);
  const entries = assertNonEmptyRegistry(
    definedManifest.audioCues,
    "audioCues",
  );

  for (const requiredCueId of REQUIRED_AUDIO_CUE_IDS) {
    const audioCue = definedManifest.audioCues[requiredCueId];

    if (!audioCue) {
      throw new Error(`Missing required audio cue "${requiredCueId}".`);
    }

    if (audioCue.id !== requiredCueId) {
      throw new Error(`Audio cue "${requiredCueId}" must use a matching id field.`);
    }
  }

  return entries;
}

function assertUniqueAssetIds(
  manifest: AssetManifest | null | undefined,
): string[] {
  const definedManifest = assertManifestDefined(manifest);
  const assetIds = [
    ...Object.keys(definedManifest.spriteSheets),
    ...Object.keys(definedManifest.animations),
    ...Object.keys(definedManifest.audioCues),
  ];

  for (const assetId of assetIds) {
    if (assetId.trim().length === 0) {
      throw new Error("Asset ids must be non-empty strings.");
    }
  }

  if (new Set(assetIds).size !== assetIds.length) {
    throw new Error("Asset ids must be unique across the manifest.");
  }

  return assetIds;
}

describe("defaultManifest", () => {
  it("contains sprite sheet entries with positive frame dimensions and non-zero grid sizes", () => {
    expect(() => assertValidSpriteSheets(defaultManifest)).not.toThrow();
  });

  it("maps every animation to an existing sprite sheet id and in-bounds frame sequence", () => {
    expect(() => assertAnimationsReferenceSpriteSheets(defaultManifest)).not.toThrow();
  });

  it("contains audio cues for digging, gold collection, enemy traps, level completion, death, and background music", () => {
    expect(() => assertRequiredAudioCues(defaultManifest)).not.toThrow();
  });

  it("uses unique non-empty string ids across sprite sheets, animations, and audio cues", () => {
    expect(() => assertUniqueAssetIds(defaultManifest)).not.toThrow();
  });
});

describe("asset manifest contract", () => {
  it.each([null, undefined])(
    "rejects a %s manifest when validating manifest data",
    (manifest) => {
      expect(() => assertValidSpriteSheets(manifest)).toThrow(
        "Asset manifest is required.",
      );
      expect(() => assertAnimationsReferenceSpriteSheets(manifest)).toThrow(
        "Asset manifest is required.",
      );
      expect(() => assertRequiredAudioCues(manifest)).toThrow(
        "Asset manifest is required.",
      );
      expect(() => assertUniqueAssetIds(manifest)).toThrow(
        "Asset manifest is required.",
      );
    },
  );

  it("rejects empty registries when validating manifest data", () => {
    const emptyManifest: AssetManifest = {
      spriteSheets: {},
      animations: {},
      audioCues: {},
    };

    expect(() => assertValidSpriteSheets(emptyManifest)).toThrow(
      "spriteSheets must define at least one asset.",
    );
    expect(() => assertAnimationsReferenceSpriteSheets(emptyManifest)).toThrow(
      "spriteSheets must define at least one asset.",
    );
    expect(() => assertRequiredAudioCues(emptyManifest)).toThrow(
      "audioCues must define at least one asset.",
    );
  });
});
