import _ from 'lodash';

const ADD = 0, RIGHT = 1,
  OUT = 2, IN = 3,
  OPEN = 4, CLOSE = 5,
  CLEAR = 6, MUL = 7,
  SCAN_LEFT = 8, SCAN_RIGHT = 9;

function* tokenize(programString) {
  for (let opCode of programString) {
    switch (opCode) {
      case '+':
        yield {type: ADD, x: 1};
        break;
      case '-':
        yield {type: ADD, x: -1};
        break;
      case '>':
        yield {type: RIGHT, x: 1};
        break;
      case '<':
        yield {type: RIGHT, x: -1};
        break;
      case '.':
        yield {type: OUT};
        break;
      case ',':
        yield {type: IN};
        break;
      case '[':
        yield {type: OPEN};
        break;
      case ']':
        yield {type: CLOSE};
        break;
    }
  }
}

function parseEnhancedNumber(x) {
  const hasStartParen = _.first(x) === '(';
  const hasEndParent = _.last(x) === ')';
  if (hasStartParen !== hasEndParent) {
    throw new Error("Parent mismatch: "+x);
  }
  if (hasStartParen) {
    return -x.slice(1, -1);
  } else {
    return +x;
  }
}

function* enhancedTokenize(programString) {
  programString = programString.replace(/\/\/.*/g, '');

  for (let i = 0; i < programString.length; i++) {
    const opCode = programString[i];
    switch (opCode) {
      case '+':
        yield {type: ADD, x: 1};
        break;
      case '-':
        yield {type: ADD, x: -1};
        break;
      case '>':
        yield {type: RIGHT, x: 1};
        break;
      case '<':
        yield {type: RIGHT, x: -1};
        break;
      case '.':
        yield {type: OUT};
        break;
      case ',':
        yield {type: IN};
        break;
      case '[':
        yield {type: OPEN};
        break;
      case ']':
        yield {type: CLOSE};
        break;
      case '^':
        yield {type: CLEAR};
        break;
      case '!':
        yield {type: SCAN_LEFT};
        break;
      case '@':
        yield {type: SCAN_RIGHT};
        break;
      case '*':
        throw new Error("* must be preceded by num:num");
      default:
        const slice = programString.substr(i, 500);
        const mulMatch = slice.match(/^(\(?\d+\)?):(\(?\d+\)?)\*/);
        if (mulMatch) {
          const x = parseEnhancedNumber(mulMatch[1]);
          const y = parseEnhancedNumber(mulMatch[2]);
          if (x === 0) {
            throw new Error("mul instruction can't be used with x=0");
          }
          yield {type: MUL, x, y};
          i += mulMatch[0].length-1;
          break;
        }
        const repeatedMatch = slice.match(/^(\(?\d+\)?)([+\-<>])/);
        if (repeatedMatch) {
          const num = parseEnhancedNumber(repeatedMatch[1]);
          switch (repeatedMatch[2]) {
            case '+':
              yield {type: ADD, x: num};
              break;
            case '-':
              yield {type: ADD, x: -num};
              break;
            case '>':
              yield {type: RIGHT, x: num};
              break;
            case '<':
              yield {type: RIGHT, x: -num};
              break;
            default:
              throw new Error("Should not happen");
          }
          i += repeatedMatch[0].length-1;
          break;
        }
    }
  }
}

const contractableInsTypes = [ADD, RIGHT];
function* contractProgram(program) {
  let prev;
  for (let ins of program) {
    if (!prev) {
      prev = ins;
    } else {
      if (prev.type === ins.type && _.includes(contractableInsTypes, ins.type)) {
        prev.x += ins.x;
      } else {
        yield prev;
        prev = ins;
      }
    }
  }
  if (prev) {
    yield prev;
  }
}

// Needs to run after contractProgram for best effectiveness.
function* clearLoop(program) {
  const buffer = [];
  const copyBuffer = [];
  let copyPos = 0;
  for (let ins of program) {
    if (buffer.length === 0) {
      if (ins.type === OPEN) {
        buffer.push(ins);
      } else {
        yield ins;
      }
    } else if (buffer.length === 1) {
      if (ins.type === ADD && ins.x === -1) {
        buffer.push(ins);
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    } else {
      if (ins.type === CLOSE && copyPos === 0) {
        yield* copyBuffer;
        yield {type: CLEAR};
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      } else if (ins.type === RIGHT) {
        buffer.push(ins);
        copyPos += ins.x;
      } else if (ins.type === ADD) {
        buffer.push(ins);
        copyBuffer.push({type: MUL, x: copyPos, y: ins.x});
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
        copyBuffer.length = 0;
        copyPos = 0;
      }
    }
  }
  yield* buffer;
}

function* scanners(program) {
  const buffer = [];
  for (let ins of program) {
    if (buffer.length === 0) {
      if (ins.type === OPEN) {
        buffer.push(ins);
      } else {
        yield ins;
      }
    } else if (buffer.length === 1) {
      if (ins.type === RIGHT && (ins.x === 1 || ins.x === -1)) {
        buffer.push(ins);
      } else {
        yield* buffer;
        yield ins;
        buffer.length = 0;
      }
    } else if (buffer.length === 2) {
      if (ins.type === CLOSE) {
        if (buffer[1].x === 1) {
          yield {type: SCAN_RIGHT};
        } else {
          yield {type: SCAN_LEFT};
        }
      } else {
        yield* buffer;
        yield ins;
      }
      buffer.length = 0;
    } else {
      throw new Error("Should not happen");
    }
  }
  yield* buffer;
}

// Must be last optimization
function loopAssociater(program) {
  program = Array.from(program);
  const programLen = program.length;
  const opens = [];
  for (let pc = 0; pc < programLen; pc++) {
    const ins = program[pc];
    if (ins.type === OPEN) {
      opens.push(pc);
    } else if (ins.type === CLOSE) {
      const openPc = opens.pop();
      if (openPc == null) {
        throw new Error("Unmatched ]");
      }
      ins.pair = openPc;
      program[openPc].pair = pc;
    }
  }
  if (opens.length) {
    throw new Error("Unmatched [");
  }
  return program;
}

export default function parse(programString, enhanced=false) {
  if (typeof programString !== 'string') {
    throw new Error("argument must be string");
  }
  const tokens = (enhanced ? enhancedTokenize : tokenize)(programString);
  return loopAssociater(clearLoop(scanners(contractProgram(tokens))));
}