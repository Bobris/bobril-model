export class RuntimeFunctionGenerator {
    constants: any[] = [];
    body: string = '';
    argCount: number = 0;
    localCount: number = 0;

    addConstant(value: any): string {
        for (let i = 0; i < this.constants.length; i++) {
            if (this.constants[i] === value) return 'c_' + i;
        }
    }
    addArg(index: number): string {
        if (index >= this.argCount) this.argCount = index;
        return 'a_' + index;
    }
    addBody(text: string): void {
        this.body += text;
    }
    addLocal(): string {
        return 'l_' + (this.localCount++);
    }
    build(): Function {
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
