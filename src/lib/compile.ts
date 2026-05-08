import type { State } from "./core";
import { isRegister, uOps, type OpSeq } from "./ops";

export type CompiledInsn = ((
  uOpsList: typeof uOps,
  st: State,
  ...args: number[]
) => IterableIterator<number>) & { ops: OpSeq };

function sanitizeReg(s: string): string {
  if (isRegister(s)) {
    return `'${s}'`;
  } else {
    return "";
  }
}

export function compileOps(ops: OpSeq): CompiledInsn {
  // reset error flag
  let text = "return (function*(){s.xf=false;";

  let i = 0;

  for (const op of ops) {
    if (typeof op === "string") {
      text += ` u.${op}(s);`;
    } else {
      const [opCode, ...args] = op;
      text += ` u.${opCode}(s,${args.map((arg) =>
        typeof arg === "number" ? arg.toString() : sanitizeReg(arg),
      )});`;
    }

    if (i === ops.length - 1) {
      text += `return ${i};`;
    } else {
      text += `yield ${i};`;
    }
    i++;
  }

  text += "})()";

  const fn = new Function("u", "s", "...a", text) as CompiledInsn;
  fn.ops = ops;
  return fn;
}
