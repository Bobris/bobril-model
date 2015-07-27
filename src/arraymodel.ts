import * as dispatcher from './dispatcher';
import * as model from './model';
import * as objectmodel from './objectmodel';
import { RuntimeFunctionGenerator } from './RuntimeFunctionGenerator';
import * as genModelHelpers from './genModelHelpers';

class ArrayItemAccessor extends objectmodel.ObjectMemberAccessor {
    getKey(): number | string {
        return this.index - 1;
    }
}

class ArrayAccessor implements model.IAccessModel {
    constructor(model: ArrayModel<any>, raw: model.IRawAccessModel) {
        this.model = model;
        this.raw = raw;
    }

    model: ArrayModel<any>;
    raw: model.IRawAccessModel;

    getModel(): model.IModel { return this.model; }
    getParent(): model.IModelCtx { return this.raw.getParent(); }
    getKey(): number | string { return this.raw.getKey(); }
    get(): any { return this.raw.get(); }
    getReadOnly(): boolean { return this.raw.getReadOnly(); }
    getLastModified(): number { return this.get()[0]; }
    set(value: any): boolean {
        let inst = this.get();
        if (inst === value) return false;
        let currentCount = inst.length - 1;
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Type does not match');
        }
        if (currentCount !== value.length - 1) {
            value = value.split(0);
            value[0] = dispatcher.transactionNumber;
            this.raw.set(value);
            return true;
        }
        let i = 0;
        let ii = 1;
        for (; i < currentCount; i++ , ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < currentCount; i++ , ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
    getChildCount(): number { return this.get().length - 1; }
    getChild(index: number): model.IRawAccessModel {
        return new ArrayItemAccessor(this, index);
    }
    modify(): any {
        let i = this.get();
        if (i[0] === dispatcher.transactionNumber)
            return i;
        i = i.split(0);
        i[0] = dispatcher.transactionNumber;
        this.raw.set(i);
        return i;
    }
}

const emptyArrayInstance = [0];

export class ArrayModel<T extends model.IModel> implements model.IModel {
    modelType = model.ModelType.Array;
    uniqueName: string;
    parent: model.IModel;
    name: string;
    itemModel: T;
    constructor(itemModel: T) {
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        itemModel.parent = this;
        this.needCtx = false;
        this.itemModel = itemModel;
        itemModel.setNeedCtx();
        this.name = itemModel.name + '[]';
    }

    needCtx: boolean;
    getNeedCtx(): boolean { return this.needCtx; }
    setNeedCtx() {
        this.needCtx = true;
    }

    getMemberCount(): number { return 0; }
    getMember(index: number): model.IModel { return undefined; }

    createEmptyInstance(): any {
        return emptyArrayInstance;
    }

    createReadOnlyRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadOnlyRawAccess(this);
    }

    createReadWriteRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadWriteRawAccess(this);
    }

    createAccessModel(rawAccess: model.IRawAccessModel): model.IAccessModel {
        return new ArrayAccessor(this, rawAccess);
    }
}

export function injectArrayAppender(arrayModel: model.IModel, ...memberSetterModels: model.IModel[]): Function {
    if (arrayModel.modelType !== model.ModelType.Array) {
        throw new Error('First parameter must be Array Model');
    }
    let gen = new RuntimeFunctionGenerator();
    if (arrayModel.getNeedCtx()) {
        throw new Error('Model needs context use injectArrayAppenderWithCtx instead')
    }
    let itemModel = arrayModel.itemModel;
    let locArrayAccessor = genModelHelpers.genReadWriteAccessor(gen, arrayModel);
    let locNewItem = gen.addLocal();
    gen.addBody(`var ${locNewItem}`);

    return gen.build();
}
