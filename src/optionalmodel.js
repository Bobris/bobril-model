import * as model from './model';
class OptionalItemAccessor {
    constructor(owner) {
        this.owner = owner;
    }
    getModel() {
        return this.owner.getModel();
    }
    getParent() {
        return this.owner;
    }
    getKey() {
        return undefined;
    }
    get() {
        return this.owner.get()[0];
    }
    getReadOnly() {
        return this.owner.getReadOnly();
    }
    getLastModified() {
        return this.owner.getLastModified();
    }
    set(value) {
        if (this.get() !== value) {
            this.owner.set([value]);
            return true;
        }
        return false;
    }
}
class OptionalAccessor {
    constructor(model, raw) {
        this.model = model;
        this.raw = raw;
    }
    getModel() { return this.model; }
    getParent() { return this.raw.getParent(); }
    getKey() { return this.raw.getKey(); }
    get() { return this.raw.get(); }
    getReadOnly() { return this.raw.getReadOnly(); }
    getLastModified() { return this.raw.getLastModified(); }
    set(value) {
        let inst = this.get();
        if (inst === value)
            return false;
        if (value === null) {
            return this.raw.set(null);
        }
        if (!Array.isArray(value) || value.length !== 1) {
            throw new Error('Type does not match');
        }
        if (inst !== null && value[0] === inst[0])
            return false;
        return this.raw.set([value]);
    }
    getChildCount() { return this.raw.get() === null ? 0 : 1; }
    getChild(index) {
        return new OptionalItemAccessor(this);
    }
    modify() {
        let i = this.get();
        if (i === null)
            return i;
        i = [i[0]];
        this.raw.set(i);
        return i;
    }
}
export class OptionalModel {
    constructor(itemModel) {
        this.modelType = 3;
        this.needCtx = false;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = itemModel.name + '?';
        this.itemModel = itemModel;
    }
    getNeedCtx() { return this.needCtx; }
    setNeedCtx() {
        if (this.needCtx)
            return;
        this.needCtx = true;
        this.itemModel.setNeedCtx();
    }
    getMemberCount() { return 0; }
    getMember(index) { return undefined; }
    createEmptyInstance() {
        return null;
    }
    createReadOnlyRawAccess() {
        return new model.StandaloneReadOnlyRawAccess(this);
    }
    createReadWriteRawAccess() {
        return new model.StandaloneReadWriteRawAccess(this);
    }
    createAccessModel(rawAccess) {
        return new OptionalAccessor(this, rawAccess);
    }
}
