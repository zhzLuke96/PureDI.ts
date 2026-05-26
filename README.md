# PureDI

Type‑safe DI container for TypeScript. No decorators, no `reflect-metadata`, no magic.

## Quick start

Copy [`di.ts`](./di.ts) into your project.

```ts
import { Container, Inject } from "./di";

class Logger {
  log(msg: string) {
    console.log(msg);
  }
}

class App {
  static dependencies = { logger: Logger };
  constructor(private ctx: Inject<typeof App>) {}
  run() {
    this.ctx.logger.log("Hello");
  }
}

const container = new Container();
container.get(App).run();
```

## API

| Method                            | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| `get<T>(CTOR)`                    | Resolves a singleton instance (creates if missing).        |
| `register<T>(CTOR, instance)`     | Manually registers an existing instance (mocks / sharing). |
| `registerThunk<T>(CTOR, factory)` | Lazy factory: called once on first `get()`.                |

## Circular dependencies

Use **arrow functions** inside `static get dependencies()`:

```ts
class Parent {
  static get dependencies() {
    return { child: () => Child }; // lazy
  }
  constructor(private ctx: Inject<typeof Parent>) {}
  hello() {
    this.ctx.child().world();
  }
}

class Child {
  static get dependencies() {
    return { parent: () => Parent };
  }
  world() {
    this.ctx.parent().hello();
  }
}
```

> ⚠️ Arrow functions are mandatory – regular `function` have a prototype and will be mistaken for classes.

## Lazy factories

```ts
container.registerThunk(ExpensiveService, (c) => {
  const config = c.get(ConfigService);
  return new ExpensiveService(config);
});
```

## Limitations

- Every class that needs DI must have a `static dependencies` object (or getter).
- Synchronous resolution only.
- One container = one singleton scope. For per‑request scopes, create a new container.
