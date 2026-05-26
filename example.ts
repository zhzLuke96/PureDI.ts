import { Container, Inject } from "./di";

// ---------- 1. 基础用法 ----------
class Logger {
  log(msg: string) {
    console.log(msg);
  }
}

class App {
  static dependencies = { logger: Logger };
  constructor(private ctx: Inject<typeof App>) {}
  run() {
    this.ctx.logger.log("Hello, world!");
  }
}

const container = new Container();
container.get(App).run();

// ---------- 2. 循环依赖（懒加载）----------
class Parent {
  static get dependencies() {
    return { child: () => Child };
  }
  constructor(private ctx: Inject<typeof Parent>) {}
  hello() {
    console.log("Parent");
    this.ctx.child().world();
  }
}

class Child {
  static get dependencies() {
    return { parent: () => Parent };
  }
  constructor(private ctx: Inject<typeof Child>) {}
  world() {
    console.log("Child");
    this.ctx.parent().hello();
  }
}

container.get(Parent).hello(); // Parent → Child → Parent → ...

// ---------- 3. 懒加载工厂 (registerThunk) ----------
class Heavy {
  constructor(public id: number) {}
  work() {
    console.log(`Heavy #${this.id}`);
  }
}

let counter = 0;
container.registerThunk(Heavy, () => new Heavy(++counter));

const h1 = container.get(Heavy); // 创建 #1
const h2 = container.get(Heavy); // 复用
h1.work(); // Heavy #1
console.log(h1 === h2); // true

// ---------- 4. 手动注册（测试/mock）----------
class MockLogger {
  log(msg: string) {
    console.log(`[MOCK] ${msg}`);
  }
}
const testContainer = new Container();
testContainer.register(Logger, new MockLogger());
testContainer.get(App).run(); // [MOCK] Hello, world!
