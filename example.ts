import { Container, Inject } from "./di";
export class Child {
  static get dependencies() {
    return {
      // 循环依赖：同样包裹
      parent: () => Parent,
    };
  }

  constructor(private deps: Inject<typeof Child>) {}

  pong() {
    console.log("Child here");
    this.deps.parent().hello();
  }
}

export class Parent {
  static get dependencies() {
    return {
      child: Child,
    };
  }

  constructor(private deps: Inject<typeof Parent>) {}

  hello() {
    console.log("Parent here");
    // 调用 Lazy 依赖：需要加 ()
    // this.deps.child.pong();
  }
}

const container = new Container();
container.get(Child).pong();
