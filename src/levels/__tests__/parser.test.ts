/// <reference types="vite/client" />

import { describe, expect, it } from "vitest";

import { parseAsciiLevel, parseJsonLevel } from "../parser";
import goldAndEnemiesFixture from "./fixtures/gold-and-enemies.txt?raw";
import simpleAsciiFixture from "./fixtures/simple.txt?raw";
import simpleJsonFixture from "./fixtures/simple.json?raw";

describe("parseAsciiLevel", () => {
  it("parses a simple 5x5 ASCII level with player, bricks, and empty space", () => {
    expect(parseAsciiLevel(simpleAsciiFixture)).toEqual({
      rows: 5,
      cols: 5,
      tiles: [
        "#####",
        "#P..#",
        "#.#.#",
        "#...#",
        "#####",
      ],
      empty: [
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 1 },
        { row: 2, col: 3 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ],
      bricks: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 1, col: 0 },
        { row: 1, col: 4 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
        { row: 2, col: 4 },
        { row: 3, col: 0 },
        { row: 3, col: 4 },
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 4, col: 2 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
      stones: [],
      ladders: [],
      bars: [],
      gold: [],
      enemies: [],
      playerSpawn: { row: 1, col: 1 },
    });
  });

  it("parses gold, enemies, ladders, and bars into their coordinate arrays", () => {
    expect(parseAsciiLevel(goldAndEnemiesFixture)).toEqual({
      rows: 5,
      cols: 5,
      tiles: [
        "P.H-$",
        ".#E=.",
        "$-H-E",
        ".=#..",
        "..$..",
      ],
      empty: [
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 4 },
        { row: 3, col: 0 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
      bricks: [
        { row: 1, col: 1 },
        { row: 3, col: 2 },
      ],
      stones: [
        { row: 1, col: 3 },
        { row: 3, col: 1 },
      ],
      ladders: [
        { row: 0, col: 2 },
        { row: 2, col: 2 },
      ],
      bars: [
        { row: 0, col: 3 },
        { row: 2, col: 1 },
      ],
      gold: [
        { row: 0, col: 4 },
        { row: 2, col: 0 },
        { row: 4, col: 2 },
      ],
      enemies: [
        { row: 1, col: 2 },
        { row: 2, col: 4 },
      ],
      playerSpawn: { row: 0, col: 0 },
    });
  });

  it("throws when the input is empty, null, or undefined", () => {
    expect(() => parseAsciiLevel("")).toThrow(/empty/i);
    expect(() => parseAsciiLevel(null)).toThrow(/empty/i);
    expect(() => parseAsciiLevel(undefined)).toThrow(/empty/i);
  });

  it("throws when the level does not contain a player spawn", () => {
    expect(() =>
      parseAsciiLevel([
        ".....",
        ".###.",
        ".....",
      ].join("\n")),
    ).toThrow(/player/i);
  });

  it("throws when the level contains multiple player spawns", () => {
    expect(() =>
      parseAsciiLevel([
        "P....",
        "..P..",
        ".....",
      ].join("\n")),
    ).toThrow(/multiple/i);
  });

  it("throws when row lengths do not match", () => {
    expect(() =>
      parseAsciiLevel([
        "#####",
        "#P.#",
        "#####",
      ].join("\n")),
    ).toThrow(/row length/i);
  });
});

describe("parseJsonLevel", () => {
  it("parses a JSON level with the same data contract as the ASCII parser", () => {
    expect(parseJsonLevel(simpleJsonFixture)).toEqual({
      rows: 5,
      cols: 5,
      tiles: [
        "#####",
        "#P..#",
        "#.#.#",
        "#...#",
        "#####",
      ],
      empty: [
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 1 },
        { row: 2, col: 3 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ],
      bricks: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 1, col: 0 },
        { row: 1, col: 4 },
        { row: 2, col: 0 },
        { row: 2, col: 2 },
        { row: 2, col: 4 },
        { row: 3, col: 0 },
        { row: 3, col: 4 },
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 4, col: 2 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
      stones: [],
      ladders: [],
      bars: [],
      gold: [],
      enemies: [],
      playerSpawn: { row: 1, col: 1 },
    });
  });

  it("throws when the JSON input is empty, null, or undefined", () => {
    expect(() => parseJsonLevel("")).toThrow(/empty/i);
    expect(() => parseJsonLevel(null)).toThrow(/empty/i);
    expect(() => parseJsonLevel(undefined)).toThrow(/empty/i);
  });
});
