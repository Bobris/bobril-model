import * as dispatcher from './dispatcher';
import * as model from './model';
export class ObjectMemberAccessor {
    constructor(owner, index) {
        this.owner = owner;
        this.index = index + 1;
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
        return this.owner.get()[this.index];
    }
    getReadOnly() {
        return this.owner.getReadOnly();
    }
    getLastModified() {
        return this.owner.getLastModified();
    }
    set(value) {
        if (this.get() !== value) {
            let i = this.owner.modify();
            i[this.index] = value;
            return true;
        }
        return false;
    }
}
class ObjectAccessor {
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
        const memberCount = this.model.memberNames.length;
        if (!Array.isArray(value) || value.length !== memberCount + 1) {
            throw new Error('Type does not match');
        }
        let i = 0;
        let ii = 1;
        for (; i < memberCount; i++, ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < memberCount; i++, ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
    getChildCount() { return this.model.memberNames.length; }
    getChild(index) {
        return new ObjectMemberAccessor(this, index);
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
export class ObjectModel {
    constructor(name) {
        this.modelType = 1;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
        this.memberNames = [];
        this.memberModels = [];
        this.emptyInstance = undefined;
        this.needCtx = false;
    }
    getNeedCtx() { return this.needCtx; }
    setNeedCtx() {
        if (this.needCtx)
            return;
        this.needCtx = true;
        for (let i = 0; i < this.memberModels.length; i++) {
            this.memberModels[i].setNeedCtx();
        }
    }
    getMemberCount() { return this.memberNames.length; }
    getMember(index) { return this.memberModels[index]; }
    add(name, model) {
        if (this.emptyInstance !== undefined)
            throw new Error('Cannot modify freezed/used structure');
        if (name in this.members)
            throw new Error('Member ' + name + ' already exists in ' + this.name);
        this.memberModels.push(model);
        this.memberNames.push(name);
        this.members[name] = model;
        model.name = name;
        model.parent = this;
        return model;
    }
    addFrom(members) {
        let names = Object.keys(members);
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            this.add(name, members[name]);
        }
    }
    closeModelForModification() {
        if (this.emptyInstance !== undefined)
            return;
        let inst = [0];
        for (let i = 0; i < this.memberNames.length; i++) {
            let k = this.memberNames[i];
            let m = this.members[k];
            inst.push(m.createEmptyInstance());
        }
        this.emptyInstance = inst;
    }
    createEmptyInstance() {
        this.closeModelForModification();
        return this.emptyInstance;
    }
    createReadOnlyRawAccess() {
        this.closeModelForModification();
        return new model.StandaloneReadOnlyRawAccess(this);
    }
    createReadWriteRawAccess() {
        this.closeModelForModification();
        return new model.StandaloneReadWriteRawAccess(this);
    }
    createAccessModel(rawAccess) {
        return new ObjectAccessor(this, rawAccess);
    }
}
export function injectObjectModifier(objectModel, ...memberSetterModels) {
    return null;
}
