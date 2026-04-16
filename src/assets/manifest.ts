import type { AssetManifest } from "./types";

export const defaultManifest: AssetManifest = {
  spriteSheets: {
    tiles: {
      imageUrl: "/assets/sprites/tiles.png",
      frameWidth: 32,
      frameHeight: 32,
      columns: 8,
      rows: 8,
    },
    player: {
      imageUrl: "/assets/sprites/player.png",
      frameWidth: 32,
      frameHeight: 32,
      columns: 6,
      rows: 1,
    },
    enemies: {
      imageUrl: "/assets/sprites/enemies.png",
      frameWidth: 32,
      frameHeight: 32,
      columns: 4,
      rows: 1,
    },
  },
  animations: {
    playerIdle: {
      name: "playerIdle",
      frames: [{ frameIndex: 0, durationMs: 200 }],
    },
    playerRunning: {
      name: "playerRunning",
      frames: [
        { frameIndex: 1, durationMs: 100 },
        { frameIndex: 2, durationMs: 100 },
      ],
    },
    playerClimbing: {
      name: "playerClimbing",
      frames: [
        { frameIndex: 3, durationMs: 120 },
        { frameIndex: 4, durationMs: 120 },
      ],
    },
    playerFalling: {
      name: "playerFalling",
      frames: [{ frameIndex: 5, durationMs: 150 }],
    },
    playerDigging: {
      name: "playerDigging",
      frames: [
        { frameIndex: 2, durationMs: 100 },
        { frameIndex: 5, durationMs: 140 },
      ],
    },
    enemyIdle: {
      name: "enemyIdle",
      frames: [{ frameIndex: 0, durationMs: 200 }],
    },
    enemyRunning: {
      name: "enemyRunning",
      frames: [
        { frameIndex: 1, durationMs: 120 },
        { frameIndex: 2, durationMs: 120 },
      ],
    },
  },
  audioCues: {
    digging: {
      id: "digging",
      srcUrl: "/assets/audio/dig.mp3",
      volume: 0.7,
      loop: false,
    },
    goldPickup: {
      id: "goldPickup",
      srcUrl: "/assets/audio/gold-pickup.mp3",
      volume: 0.8,
      loop: false,
    },
    enemyTrap: {
      id: "enemyTrap",
      srcUrl: "/assets/audio/enemy-trap.mp3",
      volume: 0.75,
      loop: false,
    },
    death: {
      id: "death",
      srcUrl: "/assets/audio/death.mp3",
      volume: 0.85,
      loop: false,
    },
    levelCompletion: {
      id: "levelCompletion",
      srcUrl: "/assets/audio/level-complete.mp3",
      volume: 0.9,
      loop: false,
    },
    backgroundMusic: {
      id: "backgroundMusic",
      srcUrl: "/assets/audio/background-music.mp3",
      volume: 0.5,
      loop: true,
    },
  },
};
