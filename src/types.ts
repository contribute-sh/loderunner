import type { LevelData as BaseLevelData, TileType } from "./level/types";

export { TileType } from "./level/types";
export type { BrickTimers, LevelCell, SpawnPoint } from "./level/types";

export interface TileSpriteMapping {
  spriteSheetKey: string;
  frame: number | string;
}

export interface CharacterSpriteMapping {
  idle: string;
  running: string;
  climbing: string;
  falling: string;
  digging: string;
}

/**
 * @deprecated Import `LevelData` from `src/level/types.ts` instead.
 */
export type LevelData = BaseLevelData;

export interface RenderConfig {
  tileSize: number;
  tileSpriteMap: Record<TileType, TileSpriteMapping>;
  characterSprites: Record<string, CharacterSpriteMapping>;
  fallbackColor?: string;
}
