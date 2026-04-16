import type { LevelData, SpawnPoint } from "../level/types";

export interface GameState {
  levelData: LevelData;
  playerPosition: SpawnPoint;
  score: number;
  collectedGold: Set<string>;
  isRunning: boolean;
}

export interface InputState {
  heldKeys: Set<string>;
  readAndClearSnapshot: () => Set<string>;
}

export interface LoopConfig {
  fixedTimestepMs: number;
  maxFrameSkip: number;
}

export interface FrameTiming {
  deltaTime: number;
  accumulator: number;
  lastTimestamp: number;
}
