import * as dispatcher from './dispatcher';
import * as model from './model';
import * as objectmodel from './objectmodel';
import { RuntimeFunctionGenerator } from './RuntimeFunctionGenerator';
import * as genModelHelpers from './genModelHelpers';
class ArrayItemAccessor extends objectmodel.ObjectMemberAccessor {
    getKey() {
        return this.index - 1;
    }
}
class ArrayAccessor {
    constructor(model, raw) {
        this.model = model;
        this.raw = raw;
    }
    getModel() { return this.model; }
    getParent() { return this.raw.getParent(); }
    getKey() { return this.raw.getKey(); }
    get() { return this.raw.get(); }
    getReadOnly() { return this.raw.getReadOnly(); }
    getLastModified() { return this.get()[0]; }
    set(value) {
        let inst = this.get();
        if (inst === value)
            return false;
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
        for (; i < currentCount; i++, ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < currentCount; i++, ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
    getChildCount() { return this.get().length - 1; }
    getChild(index) {
        return new ArrayItemAccessor(this, index);
    }
    modify() {
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
export class ArrayModel {
    constructor(itemModel) {
        this.modelType = 2;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        itemModel.parent = this;
        this.needCtx = false;
        this.itemModel = itemModel;
        itemModel.setNeedCtx();
        this.name = itemModel.name + '[]';
    }
    getNeedCtx() { return this.needCtx; }
    setNeedCtx() {
        this.needCtx = true;
    }
    getMemberCount() { return 0; }
    getMember(index) { return undefined; }
    createEmptyInstance() {
        return emptyArrayInstance;
    }
    createReadOnlyRawAccess() {
        return new model.StandaloneReadOnlyRawAccess(this);
    }
    createReadWriteRawAccess() {
        return new model.StandaloneReadWriteRawAccess(this);
    }
    createAccessModel(rawAccess) {
        return new ArrayAccessor(this, rawAccess);
    }
}
export function injectArrayAppender(arrayModel, ...memberSetterModels) {
    if (arrayModel.modelType !== 2) {
        throw new Error('First parameter must be Array Model');
    }
    let gen = new RuntimeFunctionGenerator();
    if (arrayModel.getNeedCtx()) {
        throw new Error('Model needs context use injectArrayAppenderWithCtx instead');
    }
    let itemModel = arrayModel.itemModel;
    let locArrayAccessor = genModelHelpers.genReadWriteAccessor(gen, arrayModel);
    let locNewItem = gen.addLocal();
    gen.addBody(`var ${locNewItem}`);
    return gen.build();
}
