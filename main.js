import fs from 'fs';
import Machine from './bf';
import lint from './lint';
import {benchmark} from './benchmarking';

function fromCharCodes(arr) {
  return arr.map(n => String.fromCharCode(n)).join('');
}

function toCharCodes(str) {
  const charCodes = [];
  for (let i=0; i<str.length; i++) {
    charCodes.push(str.charCodeAt(i));
  }
  return charCodes;
}

const HELLO_WORLD = '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.' +
  '>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.';

const ROT13 = '-,+[-[>>++++[>++++++++<-]<+<-[>+>+>-[>>>]<[[>+<-]>>+>]<<<<<-]' +
  ']>>>[-]+>--[-[<->+++[-]]]<[++++++++++++<[>-[>+>>]>[+[<+>-]>+>>]<<<<<-' +
  ']>>[<+>-]>[-[-<<[-]>>]<<[<<->>-]>>]<<[<<+>>-]]<[-]<.[-]<-,+]';

const FACTOR = fs.readFileSync(__dirname+'/../bfoptimization/progs/factor.b', 'utf8');
const LONG = fs.readFileSync(__dirname+'/../bfoptimization/progs/long.b', 'utf8');
const AWIB = fs.readFileSync(__dirname+'/../bfoptimization/progs/awib-0.4.b', 'utf8');

function main() {
  const {result, timeSpent} = benchmark(() => {
    const mac = new Machine(FACTOR, toCharCodes('65\n'), n => {
      process.stdout.write(String.fromCharCode(n));
    }, {EOF: -1});
    return mac.run();
  }, 10);
  console.log('cycles', result);
  console.log('time spent', timeSpent);
}

main();