/**
 * ============================================================================
 *  PureDI - Minimal Type-Safe DI Container
 * ============================================================================
 */

// 1. Core Type Definitions
// ----------------------------------------------------------------------------

type Constructor<T = any> = new (...args: any[]) => T;
type DepValue = Constructor | (() => Constructor);
type DepMap = Record<string, DepValue>;

/**
 * Helper: Unwraps the dependency definition.
 * Handles cases where dependencies might be returned by a function (runtime thunk).
 */
type UnwrapDeps<T> = T extends () => infer R ? R : T;

/**
 * [Type Magic] logic to map dependencies to instances.
 */
type InjectDeps<T> = UnwrapDeps<T> extends infer Map extends DepMap
  ? {
      [K in keyof Map]: Map[K] extends () => infer C
        ? C extends Constructor
          ? () => InstanceType<C>
          : never // Lazy: Injects `() => Instance`
        : Map[K] extends Constructor
        ? InstanceType<Map[K]>
        : never; // Normal: Injects `Instance`
    }
  : {};

/**
 * Public Type: Infers constructor arguments from the static `dependencies` property.
 *
 * Usage: constructor(ctx: Inject<typeof MyService>) {}
 */
export type Inject<T> = T extends { dependencies?: infer R }
  ? InjectDeps<R>
  : {};

// 2. Container Implementation
// ----------------------------------------------------------------------------

export class Container {
  /** Cache for singleton instances */
  private instances = new Map<Constructor, any>();

  /** Track services currently being created to detect non-lazy circular loops */
  private resolving = new Set<Constructor>();

  /**
   * Manually register an instance (useful for testing/mocking).
   * @param token The class constructor
   * @param instance The instance to register
   */
  register<T>(token: Constructor<T>, instance: T): void {
    this.instances.set(token, instance);
  }

  /**
   * Resolve and retrieve a service instance.
   * Automatically resolves the dependency tree defined in `static dependencies`.
   *
   * @param Service The class constructor to resolve
   */
  get<T>(Service: Constructor<T>): T {
    // 1. Return cached instance if available (Singleton)
    if (this.instances.has(Service)) {
      return this.instances.get(Service);
    }

    // 2. Detect deadlock (Recursion without Lazy Thunk)
    if (this.resolving.has(Service)) {
      throw new Error(`Circular dependency detected: ${Service.name}`);
    }

    this.resolving.add(Service);

    try {
      // 3. Read dependencies definition
      const rawDeps = (Service as any).dependencies;

      // Support both `static dependencies = { ... }` and `static get dependencies() { return ... }`
      const depsMap: DepMap =
        typeof rawDeps === "function" ? rawDeps() : rawDeps || {};

      const context: any = {};

      // 4. Recursively resolve dependencies
      for (const [key, DepOrThunk] of Object.entries(depsMap)) {
        // Check if it is a Class or an Arrow Function (Thunk).
        // We use `prototype` check because Arrow Functions do not have a prototype.
        const isClass =
          "prototype" in (DepOrThunk as any) && !!(DepOrThunk as any).prototype;

        if (isClass) {
          // Normal Injection: Resolve immediately
          context[key] = this.get(DepOrThunk as Constructor);
        } else {
          // Lazy Injection: Inject a getter function to delay resolution
          const thunk = DepOrThunk as () => Constructor;
          context[key] = () => this.get(thunk());
        }
      }

      // 5. Instantiate and cache
      const instance = new Service(context);
      this.instances.set(Service, instance);
      return instance;
    } finally {
      this.resolving.delete(Service);
    }
  }
}
