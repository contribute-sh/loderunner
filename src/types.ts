import { TileType } from "./level/types";

export { TileType } from "./level/types";
export type {
  BrickTimers,
  LevelCell,
  LevelData,
  SpawnPoint,
} from "./level/types";

export interface RenderConfig {
  tileSize: number;
  colors: Record<TileType, string>;
}
