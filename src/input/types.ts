export enum InputAction {
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  CLIMB_UP = "CLIMB_UP",
  CLIMB_DOWN = "CLIMB_DOWN",
  DIG_LEFT = "DIG_LEFT",
  DIG_RIGHT = "DIG_RIGHT",
  NONE = "NONE",
}

export interface InputState {
  activeAction: InputAction;
  keysDown: ReadonlySet<string>;
}

export interface KeyBinding {
  action: InputAction;
  keys: string[];
}
