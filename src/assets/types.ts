export interface SpriteSheet {
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
}

export interface AnimationFrame {
  frameIndex: number;
  durationMs: number;
}

export interface AnimationDef {
  name: string;
  frames: AnimationFrame[];
}

export interface AudioCue {
  id: string;
  srcUrl: string;
  volume: number;
  loop: boolean;
}

export interface AssetManifest {
  spriteSheets: Record<string, SpriteSheet>;
  animations: Record<string, AnimationDef>;
  audioCues: Record<string, AudioCue>;
}
