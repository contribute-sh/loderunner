export enum TileType {
  EMPTY = "EMPTY",
  BRICK = "BRICK",
  LADDER = "LADDER",
  BAR = "BAR",
  GOLD = "GOLD",
  SPAWN_PLAYER = "SPAWN_PLAYER",
  SPAWN_ENEMY = "SPAWN_ENEMY",
}

export interface LevelData {
  name: string;
  width: number;
  height: number;
  tiles: TileType[][];
}

export interface RenderConfig {
  tileSize: number;
  colors: Record<TileType, string>;
}
