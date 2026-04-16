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

const TILE_TYPES = {
  brick: "#",
  stone: "=",
  empty: ".",
  player: "P",
  enemy: "E",
  gold: "$",
  ladder: "H",
  bar: "-",
} as const;

function assertNonEmptyInput(input: string | null | undefined): string {
  if (input == null || input === "") {
    throw new Error("Level input is empty");
  }

  return input;
}

function parseRows(input: string): string[] {
  const rows = input.replace(/\r\n?/g, "\n").split("\n");

  while (rows.length > 0 && rows[rows.length - 1] === "") {
    rows.pop();
  }

  return rows;
}

function createCoordinate(row: number, col: number): LevelCoordinate {
  return { row, col };
}

function classifyTiles(tiles: string[]): ParsedLevel {
  if (tiles.length === 0) {
    throw new Error("Level input is empty");
  }

  const rows = tiles.length;
  const cols = tiles[0]?.length ?? 0;
  const empty: LevelCoordinate[] = [];
  const bricks: LevelCoordinate[] = [];
  const stones: LevelCoordinate[] = [];
  const ladders: LevelCoordinate[] = [];
  const bars: LevelCoordinate[] = [];
  const gold: LevelCoordinate[] = [];
  const enemies: LevelCoordinate[] = [];
  let playerSpawn: LevelCoordinate | null = null;

  for (const row of tiles) {
    if (row.length !== cols) {
      throw new Error("Invalid row length");
    }
  }

  for (const [rowIndex, row] of tiles.entries()) {
    for (const [colIndex, tile] of [...row].entries()) {
      const coordinate = createCoordinate(rowIndex, colIndex);

      switch (tile) {
        case TILE_TYPES.empty:
          empty.push(coordinate);
          break;
        case TILE_TYPES.brick:
          bricks.push(coordinate);
          break;
        case TILE_TYPES.stone:
          stones.push(coordinate);
          break;
        case TILE_TYPES.ladder:
          ladders.push(coordinate);
          break;
        case TILE_TYPES.bar:
          if (row[colIndex + 1] !== TILE_TYPES.enemy) {
            bars.push(coordinate);
          }
          break;
        case TILE_TYPES.gold:
          gold.push(coordinate);
          break;
        case TILE_TYPES.enemy:
          enemies.push(coordinate);
          break;
        case TILE_TYPES.player:
          if (playerSpawn !== null) {
            throw new Error("Multiple player spawns found");
          }
          playerSpawn = coordinate;
          break;
        default:
          throw new Error(`Unknown tile: ${tile}`);
      }
    }
  }

  if (playerSpawn === null) {
    throw new Error("Missing player spawn");
  }

  return {
    rows,
    cols,
    tiles,
    empty,
    bricks,
    stones,
    ladders,
    bars,
    gold,
    enemies,
    playerSpawn,
  };
}

export function parseAsciiLevel(input: string | null | undefined): ParsedLevel {
  const ascii = assertNonEmptyInput(input);

  return classifyTiles(parseRows(ascii));
}

export function parseJsonLevel(input: string | null | undefined): ParsedLevel {
  const json = assertNonEmptyInput(input);
  const parsed = JSON.parse(json) as {
    tiles?: unknown;
  };

  if (!Array.isArray(parsed.tiles) || parsed.tiles.length === 0) {
    throw new Error("Level input is empty");
  }

  return classifyTiles(
    parsed.tiles.map((tile) => {
      if (typeof tile !== "string") {
        throw new Error("Invalid row length");
      }

      return tile;
    }),
  );
}
