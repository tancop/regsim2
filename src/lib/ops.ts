import { HEAP_SIZE, State } from "./core";

const INT32_MAX = 2 ** 31 - 1;

function handleOverflow(st: State) {
  if (st.acc >= INT32_MAX) {
    st.acc %= INT32_MAX;
    st.of = true;
  }
  if (st.acc2 >= INT32_MAX) {
    st.acc2 %= INT32_MAX;
    st.of = true;
  }
}

export const uOps = {
  loadA(st) {
    st.acc = st.a;
  },
  storeA(st) {
    st.a = st.acc;
  },
  loadA2(st) {
    st.acc2 = st.a;
  },
  storeA2(st) {
    st.a = st.acc2;
  },
  loadB(st) {
    st.acc = st.b;
  },
  storeB(st) {
    st.b = st.acc;
  },
  loadB2(st) {
    st.acc2 = st.b;
  },
  storeB2(st) {
    st.b = st.acc2;
  },
  loadC(st) {
    st.acc = st.c;
  },
  storeC(st) {
    st.c = st.acc;
  },
  loadC2(st) {
    st.acc2 = st.c;
  },
  storeC2(st) {
    st.c = st.acc2;
  },
  loadD(st) {
    st.acc = st.d;
  },
  storeD(st) {
    st.d = st.acc;
  },
  loadD2(st) {
    st.acc2 = st.d;
  },
  storeD2(st) {
    st.d = st.acc2;
  },
  loadMem(st) {
    if (st.acc >= HEAP_SIZE) {
      throw new RangeError("Pointer out of range for heap size");
    }
    st.acc = st.heap[st.acc];
  },
  storeMem(st) {
    if (st.acc >= HEAP_SIZE) {
      throw new RangeError("Pointer out of range for heap size");
    }
    st.heap[st.acc] = st.acc2;
  },
  inc(st) {
    st.acc++;
    handleOverflow(st);
  },
  dec(st) {
    st.acc--;
    handleOverflow(st);
  },
  jump(st) {
    st.ip = st.acc;
  },
  jumpZf(st) {
    if (st.zf) {
      st.ip = st.acc;
    } else {
      st.ip++;
    }
  },
  jumpNotZf(st) {
    if (st.zf) {
      st.ip++;
    } else {
      st.ip = st.acc;
    }
  },
  jumpEf(st) {
    if (st.ef) {
      st.ip = st.acc;
    } else {
      st.ip++;
    }
  },
  jumpNotEf(st) {
    if (st.ef) {
      st.ip++;
    } else {
      st.ip = st.acc;
    }
  },
  jumpCf(st) {
    if (st.cf) {
      st.ip = st.acc;
    } else {
      st.ip++;
    }
  },
  jumpNotCf(st) {
    if (st.cf) {
      st.ip++;
    } else {
      st.ip = st.acc;
    }
  },
  jumpOf(st) {
    if (st.of) {
      st.ip = st.acc;
    } else {
      st.ip++;
    }
  },
  jumpNotOf(st) {
    if (st.of) {
      st.ip++;
    } else {
      st.ip = st.acc;
    }
  },
  incIp(st) {
    st.ip++;
  },
  test(st) {
    st.zf = st.acc == 0;
    st.cf = st.acc >= st.acc2;
    st.nf = st.acc < 0;
    st.ef = st.acc == st.acc2;
  },
  loadLiteral(st, val) {
    if (typeof val !== "number") {
      throw new TypeError("Literal value is null or undefined");
    }
    st.acc = val;
  },
  loadLiteral2(st, val) {
    if (typeof val !== "number") {
      throw new TypeError("Literal value is null or undefined");
    }
    st.acc2 = val;
  },
  add12(st) {
    st.acc += st.acc2;
    handleOverflow(st);
  },
  sub12(st) {
    st.acc -= st.acc2;
    handleOverflow(st);
  },
  mul12(st) {
    st.acc *= st.acc2;
    handleOverflow(st);
  },
  div12(st) {
    if (st.acc2 === 0) {
      st.xf = true;
      st.acc = 0;
    } else if (st.acc2 > st.acc) {
      st.of = true;
      st.acc = 0;
    } else {
      st.acc /= st.acc2;
    }
    handleOverflow(st);
  },
  shl12(st) {
    st.acc <<= st.acc2;
    handleOverflow(st);
  },
  shr12(st) {
    st.acc >>= st.acc2;
  },
  and12(st) {
    st.acc &= st.acc2;
  },
  or12(st) {
    st.acc |= st.acc2;
  },
  xor12(st) {
    st.acc ^= st.acc2;
  },
  not(st) {
    st.acc = ~st.acc;
  },
} satisfies Record<string, (st: State, ...args: number[]) => void>;

type UopCode = keyof typeof uOps;

type Uop = UopCode | [UopCode, ...number[]];
export type OpSeq = Uop[];

export type Register = "a" | "b" | "c" | "d";

export const isRegister = (s: string): s is Register =>
  ["a", "b", "c", "d"].includes(s);

function loadReg(reg: Register): Uop {
  switch (reg) {
    case "a":
      return "loadA";
    case "b":
      return "loadB";
    case "c":
      return "loadC";
    case "d":
      return "loadD";
  }
}

const loadReg2 = (reg: Register) => (loadReg(reg) + "2") as Uop;

function storeReg(reg: Register): Uop {
  switch (reg) {
    case "a":
      return "storeA";
    case "b":
      return "storeB";
    case "c":
      return "storeC";
    case "d":
      return "storeD";
  }
}

const storeReg2 = (reg: Register) => (storeReg(reg) + "2") as Uop;

export const ops = {
  dec: [
    (reg: Register) => [loadReg(reg), "dec", "test", storeReg(reg), "incIp"],
    "r",
  ],
  inc: [
    (reg: Register) => [loadReg(reg), "inc", "test", storeReg(reg), "incIp"],
    "r",
  ],
  cmp: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "test",
      "incIp",
    ],
    "rr",
  ],
  cmpl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "test",
      "incIp",
    ],
    "rl",
  ],
  jz: [(addr: number) => [["loadLiteral", addr], "jumpZf"], "l"],
  jnz: [(addr: number) => [["loadLiteral", addr], "jumpNotZf"], "l"],
  je: [(addr: number) => [["loadLiteral", addr], "jumpEf"], "l"],
  jne: [(addr: number) => [["loadLiteral", addr], "jumpNotEf"], "l"],
  jc: [(addr: number) => [["loadLiteral", addr], "jumpCf"], "l"],
  jnc: [(addr: number) => [["loadLiteral", addr], "jumpNotCf"], "l"],
  jo: [(addr: number) => [["loadLiteral", addr], "jumpOf"], "l"],
  jno: [(addr: number) => [["loadLiteral", addr], "jumpNotOf"], "l"],
  jmp: [(addr: number) => [["loadLiteral", addr], "jump"], "l"],
  mov: [
    (r1: Register, r2: Register) => [loadReg(r1), storeReg(r2), "incIp"],
    "rr",
  ],
  ld: [
    (addr: number, reg: Register) => [
      ["loadLiteral", addr],
      "loadMem",
      storeReg(reg),
      "incIp",
    ],
    "lr",
  ],
  ldi: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      "loadMem",
      storeReg(r2),
      "incIp",
    ],
    "rr",
  ],
  st: [
    (reg: Register, addr: number) => [
      ["loadLiteral", addr],
      loadReg2(reg),
      "storeMem",
      "incIp",
    ],
    "rl",
  ],
  sti: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "storeMem",
      "incIp",
    ],
    "rr",
  ],
  set: [
    (reg: Register, val: number) => [
      ["loadLiteral", val],
      storeReg(reg),
      "incIp",
    ],
    "rl",
  ],
  add: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "add12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  addl: [
    (reg: Register, val: number) => [
      ["loadLiteral", val],
      loadReg2(reg),
      "add12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  sub: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "sub12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  subl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "sub12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  mul: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "mul12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  mull: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "mul12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  div: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "div12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  divl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "div12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  shl: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "shl12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  shll: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "shl12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  shr: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "shr12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  shrl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "shr12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  and: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "and12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  andl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "and12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  or: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "or12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  orl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "or12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  xor: [
    (r1: Register, r2: Register) => [
      loadReg(r1),
      loadReg2(r2),
      "xor12",
      storeReg(r1),
      "test",
      "incIp",
    ],
    "rr",
  ],
  xorl: [
    (reg: Register, val: number) => [
      loadReg(reg),
      ["loadLiteral2", val],
      "xor12",
      storeReg(reg),
      "test",
      "incIp",
    ],
    "rl",
  ],
  not: [
    (reg: Register) => [loadReg(reg), "not", storeReg(reg), "test", "incIp"],
    "r",
  ],
} satisfies Record<string, [(...args: (Register & number)[]) => OpSeq, string]>;

export type OpCode = keyof typeof ops;
