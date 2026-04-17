import { afterEach, describe, expect, it, vi } from "vitest";

const INPUT_MODULE_PATH = "../input";
const DIRECTIONS = ["down", "left", "right", "up"] as const;
const MOVEMENT_KEYS: ReadonlyArray<readonly [string, Direction]> = [
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["a", "left"],
  ["d", "right"],
  ["w", "up"],
  ["s", "down"],
];

type Direction = (typeof DIRECTIONS)[number];
type DirectionResult = Direction | Iterable<Direction> | null | undefined;

type InputHandlerInstance = {
  attach(target: EventTarget | null | undefined): void;
  detach(target?: EventTarget): void;
  getDirection?(): DirectionResult;
  getDirections?(): Iterable<Direction>;
};

type InputHandlerCtor = new () => InputHandlerInstance;
type KeyboardListener = EventListenerOrEventListenerObject;

class MockKeyboardTarget implements EventTarget {
  private readonly listeners = new Map<string, Set<KeyboardListener>>();

  addEventListener(
    type: string,
    callback: KeyboardListener | null,
    _options?: AddEventListenerOptions | boolean,
  ): void {
    if (callback === null) {
      return;
    }

    const listeners = this.listeners.get(type) ?? new Set<KeyboardListener>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    callback: KeyboardListener | null,
    _options?: EventListenerOptions | boolean,
  ): void {
    if (callback === null) {
      return;
    }

    this.listeners.get(type)?.delete(callback);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === "function") {
        listener.call(this, event);
      } else {
        listener.handleEvent(event);
      }
    }

    return true;
  }

  dispatchKeyboardEvent(type: "keydown" | "keyup", key: string): void {
    this.dispatchEvent(createKeyboardEvent(type, key) as unknown as Event);
  }
}

async function loadInputHandler(): Promise<InputHandlerCtor> {
  const inputModule = (await import(INPUT_MODULE_PATH)) as {
    InputHandler?: InputHandlerCtor;
  };

  expect(inputModule.InputHandler).toBeTypeOf("function");

  return inputModule.InputHandler as InputHandlerCtor;
}

function createKeyboardEvent(type: "keydown" | "keyup", key: string): KeyboardEvent {
  return {
    type,
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

function normalizeDirections(result: DirectionResult): Direction[] {
  if (result == null) {
    return [];
  }

  if (typeof result === "string") {
    return [result];
  }

  return [...new Set(result)];
}

function getActiveDirections(handler: InputHandlerInstance): Direction[] {
  if (typeof handler.getDirections === "function") {
    return [...handler.getDirections()].sort();
  }

  if (typeof handler.getDirection === "function") {
    return normalizeDirections(handler.getDirection()).sort();
  }

  throw new Error("InputHandler must expose getDirection() or getDirections()");
}

function expectActiveDirections(
  handler: InputHandlerInstance,
  expected: readonly Direction[],
): void {
  expect(getActiveDirections(handler)).toEqual([...expected].sort());
}

function findRegisteredListener(
  calls: unknown[][],
  type: "keydown" | "keyup",
): KeyboardListener {
  const call = calls.find((candidate) => candidate[0] === type);

  expect(call).toBeDefined();
  expect(call?.[1]).toBeDefined();
  expect(call?.[1]).not.toBeNull();

  return call?.[1] as KeyboardListener;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InputHandler", () => {
  it("attaches keyboard listeners to a target and removes them on detach", async () => {
    const InputHandler = await loadInputHandler();
    const handler = new InputHandler();
    const target = new MockKeyboardTarget();
    const addSpy = vi.spyOn(target, "addEventListener");
    const removeSpy = vi.spyOn(target, "removeEventListener");

    handler.attach(target);

    expect(addSpy).toHaveBeenCalledTimes(2);
    const keydownListener = findRegisteredListener(addSpy.mock.calls, "keydown");
    const keyupListener = findRegisteredListener(addSpy.mock.calls, "keyup");

    handler.detach(target);

    expect(removeSpy).toHaveBeenCalledTimes(2);
    expect(
      removeSpy.mock.calls.some(
        (call) => call[0] === "keydown" && call[1] === keydownListener,
      ),
    ).toBe(true);
    expect(
      removeSpy.mock.calls.some((call) => call[0] === "keyup" && call[1] === keyupListener),
    ).toBe(true);

    target.dispatchKeyboardEvent("keydown", "ArrowLeft");

    expectActiveDirections(handler, []);
  });

  it.each(MOVEMENT_KEYS)(
    "maps %s to %s while pressed and clears it on release",
    async (key, direction) => {
      const InputHandler = await loadInputHandler();
      const handler = new InputHandler();
      const target = new MockKeyboardTarget();

      handler.attach(target);

      expectActiveDirections(handler, []);

      target.dispatchKeyboardEvent("keydown", key);
      expectActiveDirections(handler, [direction]);

      target.dispatchKeyboardEvent("keyup", key);
      expectActiveDirections(handler, []);
    },
  );

  it("returns every active direction when multiple movement keys are held", async () => {
    const InputHandler = await loadInputHandler();
    const handler = new InputHandler();
    const target = new MockKeyboardTarget();

    handler.attach(target);
    target.dispatchKeyboardEvent("keydown", "ArrowLeft");
    target.dispatchKeyboardEvent("keydown", "w");

    expectActiveDirections(handler, ["left", "up"]);

    target.dispatchKeyboardEvent("keyup", "ArrowLeft");

    expectActiveDirections(handler, ["up"]);
  });

  it("ignores empty and unsupported keys", async () => {
    const InputHandler = await loadInputHandler();
    const handler = new InputHandler();
    const target = new MockKeyboardTarget();

    handler.attach(target);
    target.dispatchKeyboardEvent("keydown", "");
    target.dispatchKeyboardEvent("keydown", "x");

    expectActiveDirections(handler, []);
  });

  it("throws for nullish targets passed to attach", async () => {
    const InputHandler = await loadInputHandler();
    const handler = new InputHandler();

    expect(() => handler.attach(null)).toThrow();
    expect(() => handler.attach(undefined)).toThrow();
  });
});
