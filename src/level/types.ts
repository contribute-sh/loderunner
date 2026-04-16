export enum TileType {
  EMPTY = "EMPTY",
  BRICK = "BRICK",
  SOLID = "SOLID",
  LADDER = "LADDER",
  BAR = "BAR",
  GOLD = "GOLD",
  HIDDEN_LADDER = "HIDDEN_LADDER",
}

export type LevelCell = TileType;

export interface SpawnPoint {
  row: number;
  col: number;
}

export interface BrickTimers {
  regenDelayMs: number;
}

export interface LevelData {
  formatVersion: number;
  name: string;
  width: number;
  height: number;
  grid: LevelCell[][];
  playerSpawn: SpawnPoint;
  enemySpawns: SpawnPoint[];
  timers: BrickTimers;
}
