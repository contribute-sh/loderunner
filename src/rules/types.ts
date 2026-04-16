import type { LevelData, TileType } from "../level/types";

export enum Direction {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
  UP = "UP",
  DOWN = "DOWN",
}

export interface Position {
  row: number;
  col: number;
}

export interface DigResult {
  success: boolean;
  previousTile: TileType;
  regenAt: number;
}

export interface CollectResult {
  success: boolean;
  goldRemaining: number;
}

export interface LevelState {
  levelData: LevelData;
  grid: LevelData["grid"];
  dugBricks: Array<
    Position & {
      regenAt: number;
    }
  >;
}
