export interface LevelCoordinate {
  row: number;
  col: number;
}

export interface ParsedLevel {
  rows: number;
  cols: number;
  tiles: string[];
  empty: LevelCoordinate[];
  bricks: LevelCoordinate[];
  stones: LevelCoordinate[];
  ladders: LevelCoordinate[];
  bars: LevelCoordinate[];
  gold: LevelCoordinate[];
  enemies: LevelCoordinate[];
  playerSpawn: LevelCoordinate;
}

export function parseAsciiLevel(_input: string | null | undefined): ParsedLevel {
  throw new Error("not implemented");
}

export function parseJsonLevel(_input: string | null | undefined): ParsedLevel {
  throw new Error("not implemented");
}
