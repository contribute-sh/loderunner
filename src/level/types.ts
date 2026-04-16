export enum TileType {
  EMPTY = "EMPTY",
  BRICK = "BRICK",
  SOLID = "SOLID",
  LADDER = "LADDER",
  BAR = "BAR",
  GOLD = "GOLD",
  HIDDEN_LADDER = "HIDDEN_LADDER",
  SPAWN_PLAYER = "SPAWN_PLAYER",
  SPAWN_ENEMY = "SPAWN_ENEMY",
}

export type LevelCell = TileType;

export interface SpawnPoint {
  row: number;
  col: number;
}

export interface ParsedLevel {
  rows: number;
  cols: number;
  tiles: string[];
  empty: SpawnPoint[];
  bricks: SpawnPoint[];
  stones: SpawnPoint[];
  ladders: SpawnPoint[];
  bars: SpawnPoint[];
  gold: SpawnPoint[];
  enemies: SpawnPoint[];
  playerSpawn: SpawnPoint;
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
