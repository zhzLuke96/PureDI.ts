type Constructor<T = any> = new (...args: any[]) => T;
type DepValue = Constructor | (() => Constructor);
type DepMap = Record<string, DepValue>;

/**
 * 辅助类型：用于解包 static dependencies
 * 如果是 getter 函数，提取返回值；如果是对象，直接使用；否则返回 never
 */
type UnwrapDeps<T> = T extends () => infer R ? R : T;
/**
 * [Type Magic] 自动推导依赖注入类型
 */
type InjectDeps<T> = UnwrapDeps<T> extends infer Map extends DepMap
  ? {
      [K in keyof Map]: Map[K] extends () => infer C
        ? C extends Constructor
          ? () => InstanceType<C>
          : never // Lazy: 注入 () => Instance
        : Map[K] extends Constructor
        ? InstanceType<Map[K]>
        : never; // Normal: 注入 Instance
    }
  : {}; // 如果没有依赖或类型不匹配，返回空对象
/**
 * [Type Magic] 自动推导依赖注入类型
 */
export type Inject<T> = T extends { dependencies?: infer R }
  ? InjectDeps<R>
  : {};

export class Container {
  private instances = new Map<Constructor, any>();
  private resolving = new Set<Constructor>();

  get<T>(Service: Constructor<T>): T {
    if (this.instances.has(Service)) return this.instances.get(Service);

    // 只有在非 Lazy 解析时才需要检测死锁
    if (this.resolving.has(Service)) {
      throw new Error(`Circular dependency: ${Service.name}`);
    }

    this.resolving.add(Service);

    try {
      const depsDef = (Service as any).dependencies;
      const depsMap = typeof depsDef === "function" ? depsDef() : depsDef || {};
      const context: any = {};

      for (const [key, DepOrThunk] of Object.entries(depsMap)) {
        // 判断是 Class 还是 Thunk (() => Class)
        // 简单的判断方式：看有没有 prototype
        if (
          "prototype" in (DepOrThunk as any) &&
          (DepOrThunk as any).prototype
        ) {
          // 是普通 Class -> 立即解析
          context[key] = this.get(DepOrThunk as Constructor);
        } else {
          // 是 Thunk -> 延迟解析 (注入一个 getter 函数)
          // 这里的核心：直到用户调用 this.ctx.serviceB() 时，才去执行 container.get
          const Thunk = DepOrThunk as () => Constructor;
          context[key] = () => this.get(Thunk());
        }
      }

      const instance = new Service(context);
      this.instances.set(Service, instance);
      return instance;
    } finally {
      this.resolving.delete(Service);
    }
  }
}
