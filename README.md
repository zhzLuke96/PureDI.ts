# PureDI.ts

A zero-dependency, type-safe Dependency Injection container for TypeScript.  
**No decorators. No `reflect-metadata`. No compiler magic.**

Just pure Classes and TypeScript inference.

## Features

- 🚀 **Zero Runtime Overhead**: No reflection, no parsing metadata.
- 🛡 **Type Safe**: Constructor arguments are inferred automatically.
- 📦 **Single File**: Copy-paste `di.ts` into your project and you are done.
- 🔄 **Circular Dependencies**: Built-in support for lazy injection using Arrow Functions.

## Usage

### 1. Define Services

Define your dependencies in a `static dependencies` property.

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

Use `Inject<typeof MyClass>` to automatically infer the constructor type.

```typescript
// app.service.ts
import { Inject } from "./di";
import { ConfigService } from "./config.service";
import { LoggerService } from "./logger.service";

export class AppService {
  // 1. Define dependencies (Single Source of Truth)
  static dependencies = {
    config: ConfigService,
    logger: LoggerService,
  };

  // 2. Auto-inferred types!
  // ctx: { config: ConfigService; logger: LoggerService }
  constructor(private ctx: Inject<typeof AppService>) {}

  start() {
    this.ctx.logger.log(`Connecting to ${this.ctx.config.db}...`);
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

## Important Limitations

1. **Static Property Required**: You must define `static dependencies` in your class to tell the container what to inject.
2. **Arrow Functions for Lazy Loading**: If you use lazy injection (for circular dependencies), you **must use Arrow Functions** (`() => Class`). Regular functions (`function() {}`) have prototypes and will be mistaken for Classes.

## Handling Circular Dependencies

If `Parent` imports `Child` and `Child` imports `Parent`:

1. Use a **getter** for `dependencies` (solves module import order).
2. Wrap the class in an **Arrow Function** (solves constructor deadlock).

```typescript
// parent.ts
export class Parent {
  static get dependencies() {
    return {
      // Must use Arrow Function here!
      child: () => Child,
    };
  }

  constructor(private ctx: Inject<typeof Parent>) {}

  run() {
    // Call as function to get instance
    this.ctx.child().doSomething();
  }
}
```

## Scoping

PureDI is simple. **One Container = One Scope.**

If you need a Request Scope (e.g., for an HTTP request), simply create a new `Container` instance for that request.

```typescript
// Global services (Singleton across app)
const rootContainer = new Container();
rootContainer.register(DbService, new DbService());

function handleRequest(req) {
  // Request Scope
  const reqContainer = new Container();

  // Share global singletons by registering them manually into the scoped container
  reqContainer.register(DbService, rootContainer.get(DbService));

  // New instances for this request
  const handler = reqContainer.get(RequestHandler);
  handler.process();
}
```

## Installation

Just copy di.ts to your project. That's it.

## License

MIT
