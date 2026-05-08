import { compileOps, type CompiledInsn } from "./compile";
import { uOps, type OpSeq } from "./ops";

export const HEAP_SIZE = 4096;

export class State {
  heap = new Int32Array(HEAP_SIZE);
  code: CompiledInsn[];

  currentOp: CompiledInsn;
  currentIter: IterableIterator<number>;

  a = 0;
  b = 0;
  c = 0;
  d = 0;

  acc = 0;
  acc2 = 0;

  ip = 0;

  // zero flag
  zf = false;
  // negative flag
  nf = false;
  // overflow flag
  of = false;
  // compare flag (>=)
  cf = false;

  // equal flag
  ef = false;

  // exception flag
  xf = false;

  show(): string {
    let output = "";
    for (const [idx, cell] of this.heap.entries()) {
      if (cell != 0) {
        output += `${idx}: ${cell}\n`;
      }
    }
    output += `a: ${this.a}
b: ${this.b}
c: ${this.c}
d: ${this.d}
ip: ${this.ip} acc1: ${this.acc} acc2: ${this.acc2}
zf: ${this.zf} cf: ${this.cf} ef: ${this.ef} nf: ${this.nf}
xf: ${this.xf} of: ${this.of}`;
    return output;
  }

  stepOne(): { done: boolean; idx: number } {
    if (!this.currentIter) {
      throw new Error("currentIter is undefined");
    }

    const { done, value: idx } = this.currentIter.next();
    if (done) {
      const lastLength = this.currentOp.ops.length;

      this.currentOp = this.code[this.ip];
      if (this.currentOp) {
        this.currentIter = this.currentOp(uOps, this);
      }

      return { done: true, idx: lastLength - 1 };
    }
    return { done: false, idx };
  }

  stepAll() {
    this.currentOp = this.code[this.ip];
    this.currentIter = this.currentOp(uOps, this);
    // iterate over all uops
    for (const idx of this.currentIter) {
      console.log("run uOp:", this.currentOp.ops[idx]);
    }
  }

  run(limit: number) {
    let i = 0;
    while (i < limit && this.ip >= 0 && this.ip < this.code.length) {
      this.stepAll();
      i++;
    }
  }

  constructor(code: OpSeq[] | CompiledInsn[]) {
    if (code[0] instanceof Function) {
      this.code = code as CompiledInsn[];
    } else {
      this.code = (code as OpSeq[]).map((ins) => compileOps(ins));
    }
    this.currentOp = this.code[0];
    if (this.currentOp) {
      this.currentIter = this.currentOp(uOps, this);
    } else {
      // empty iterator yields no values
      this.currentIter = (function* () {})();
    }
  }
}
