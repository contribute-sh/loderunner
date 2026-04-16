import type { BrickTimers, LevelData, SpawnPoint, TileType } from "../level/types";

export enum EnemyMovementState {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  CLIMBING = "CLIMBING",
  FALLING = "FALLING",
}

export interface EnemyState extends SpawnPoint {
  movementState: EnemyMovementState;
  isTrappedInHole: boolean;
  trappedTimerMs: BrickTimers["regenDelayMs"];
}

export interface DugHole extends SpawnPoint {
  regenRemainingMs: BrickTimers["regenDelayMs"];
  originalTile: TileType;
}

export interface HiddenLadderState extends SpawnPoint {
  revealed: boolean;
}

export type GoldKey = `${SpawnPoint["row"]},${SpawnPoint["col"]}`;

export enum LevelCompletionStatus {
  IN_PROGRESS = "IN_PROGRESS",
  ALL_GOLD_COLLECTED = "ALL_GOLD_COLLECTED",
  COMPLETED = "COMPLETED",
}

export interface PlayerState extends SpawnPoint {
  isAlive: boolean;
}

export interface GameState {
  levelData: LevelData;
  playerPosition: SpawnPoint;
  enemyPositions: SpawnPoint[];
  isRunning: boolean;
  player: PlayerState;
  enemies: EnemyState[];
  dugHoles: DugHole[];
  hiddenLadders: SpawnPoint[];
  collectedGold: Set<string>;
  totalGold: number;
  goldRemaining: number;
  allGoldCollected: boolean;
  levelComplete: boolean;
  exitRowThreshold: number;
  score: number;
  completionStatus: LevelCompletionStatus;
  levelName: string;
}
