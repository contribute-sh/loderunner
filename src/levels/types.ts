import type { LevelData, TileType } from "../level/types";

export type ParsedLevel = LevelData;

export type AsciiTileMap = Record<string, TileType>;

declare module "./parser" {
  export function parseAsciiLevel(
    input: string | null | undefined,
    tileMap?: AsciiTileMap,
  ): ParsedLevel;
}
