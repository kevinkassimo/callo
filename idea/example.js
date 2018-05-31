//const cc = require('crosscall');

//function hello() {
//    return 'hello world!';
//}

class Test {
    constructor() {
        this.a = 10;
        this.b = 'bc';
    }
}

console.log(JSON.parse(new Test()))

//let handle = cc.register({
//    hello
//});

