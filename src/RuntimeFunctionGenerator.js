export class RuntimeFunctionGenerator {
    constructor() {
        this.constants = [];
        this.body = '';
        this.argCount = 0;
        this.localCount = 0;
    }
    addConstant(value) {
        for (let i = 0; i < this.constants.length; i++) {
            if (this.constants[i] === value)
                return 'c_' + i;
        }
    }
    addArg(index) {
        if (index >= this.argCount)
            this.argCount = index;
        return 'a_' + index;
    }
    addBody(text) {
        this.body += text;
    }
    addLocal() {
        return 'l_' + (this.localCount++);
    }
    build() {
        let innerParams = [];
        for (let i = 0; i < this.argCount; i++) {
            innerParams.push('a_' + i);
        }
        if (this.constants.length > 0) {
            let params = [];
            for (let i = 0; i < this.constants.length; i++) {
                params.push('c_' + i);
            }
            params.push('return function(' + innerParams.join(',') + ') {\n' + this.body + '\n}');
            return Function.apply(null, params).apply(null, this.constants);
        }
        innerParams.push(this.body);
        return Function.apply(null, innerParams);
    }
}
