import { isRegister, ops, type OpCode, type OpSeq } from "./ops";

export class ParseError extends Error {}

function parseLine(line: string): OpSeq {
  let [opCode, ...args] = line.trim().split(" ");

  if (opCode in ops) {
    let [fn, sig] = ops[opCode as OpCode];

    if (args.length != fn.length) {
      throw new ParseError(
        `Wrong number of arguments passed to '${opCode}': expected ${fn.length}, found ${args.length}`,
      );
    }

    let parsed = [];

    let i = 0;
    for (const c of sig) {
      switch (c) {
        case "l":
          parsed.push(Number.parseInt(args[i]));
          if (
            typeof Number(args[i]) !== "number" ||
            !Number.isInteger(parsed[i])
          ) {
            throw new ParseError(
              `Expected literal number in argument ${i + 1}: '${args[i]}'`,
            );
          }
          break;
        case "r":
          parsed.push(args[i]);
          if (!isRegister(args[i])) {
            throw new ParseError(
              `Expected register name in argument ${i + 1}: '${args[i]}'`,
            );
          }
          break;
        default:
          throw new TypeError(`Unexpected character in op signature: '${c}'`);
      }
      i++;
    }

    // @ts-ignore 2684: arrow functions don't even use `this`
    return fn.call(null, ...parsed);
  }

  throw new ParseError(`Unknown opcode '${opCode}'`);
}

export function parseCode(code: string): OpSeq[] {
  let result = [];
  for (const line of code.split("\n")) {
    if (line.trim().length === 0) continue;
    result.push(parseLine(line));
  }
  return result;
}
