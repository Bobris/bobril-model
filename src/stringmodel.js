import * as model from './model';
class StringAccessor {
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
        if (typeof value !== 'string') {
            throw new Error('Type does not match');
        }
        return this.raw.set(value);
    }
    getChildCount() { return 0; }
    getChild(index) {
        return undefined;
    }
    modify() {
        return this.get();
    }
}
export class StringModel {
    constructor() {
        this.modelType = 4;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
        this.needCtx = false;
    }
    getNeedCtx() { return this.needCtx; }
    setNeedCtx() {
        this.needCtx = true;
    }
    getMemberCount() { return 0; }
    getMember(index) { return undefined; }
    createEmptyInstance() {
        return '';
    }
    createReadOnlyRawAccess() {
        return new model.StandaloneReadOnlyRawAccess(this);
    }
    createReadWriteRawAccess() {
        return new model.StandaloneReadWriteRawAccess(this);
    }
    createAccessModel(rawAccess) {
        return new StringAccessor(this, rawAccess);
    }
}
