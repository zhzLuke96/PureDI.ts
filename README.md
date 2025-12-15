# PureDI.ts

A zero-dependency, type-safe Dependency Injection container for TypeScript.
**No decorators. No `reflect-metadata`. No compiler magic.**

Just pure Classes and TypeScript inference.

## Features

- 🚀 **Zero Runtime Overhead**: No reflection, no parsing metadata.
- 🛡 **Type Safe**: Constructor arguments are inferred automatically.
- 📦 **Single File**: Copy-paste `di.ts` into your project and you are done.
- 🔄 **Circular Dependencies**: Built-in support for lazy injection.

## Usage

### 1. Define Services

Define your dependencies in a `static dependencies` property. Types are inferred automatically!

```typescript
// config.service.ts
export class ConfigService {
  readonly db = "postgres://localhost:5432";
}

// logger.service.ts
export class LoggerService {
  log(msg: string) {
    console.log(msg);
  }
}
```

### 2. Inject Dependencies

Use the `Inject` utility type to type your constructor arguments.

```typescript
// app.service.ts
import type { Inject } from "./di";
import { ConfigService } from "./config.service";
import { LoggerService } from "./logger.service";

export class AppService {
  // 1. Define dependencies (Single Source of Truth)
  static dependencies = {
    config: ConfigService,
    logger: LoggerService,
  };

  // 2. Auto-inferred types!
  // props: { config: ConfigService; logger: LoggerService }
  constructor(private props: Inject<typeof AppService>) {}

  start() {
    this.props.logger.log(`Connecting to ${this.props.config.db}...`);
  }
}
```

### 3. Run

```typescript
import { Container } from "./di";
import { AppService } from "./app.service";

const container = new Container();

// Just get the root service, PureDI handles the rest.
const app = container.get(AppService);

app.start();
```

---

## Advanced: Circular Dependencies

If `Parent` imports `Child` and `Child` imports `Parent`, use the **Lazy Thunk** pattern:

1. Use a **getter** for `dependencies` (solves import order).
2. Wrap the class in a **function** `() => Class` (solves constructor deadlock).

```typescript
// parent.ts
import type { Inject } from "./di";
import { Child } from "./child";

export class Parent {
  // Lazy Define
  static get dependencies() {
    return {
      // Lazy Injection
      child: () => Child,
    };
  }

  constructor(private deps: Inject<typeof Parent.dependencies>) {}

  run() {
    // Call it as a function to get the instance
    this.deps.child().doSomething();
  }
}
```

## Installation

Just copy `di.ts` to your project. That's it.

## License

MIT
