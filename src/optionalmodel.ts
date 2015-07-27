import * as dispatcher from './dispatcher';
import * as model from './model';

class OptionalItemAccessor implements model.IRawAccessModel {
    constructor(owner: model.IAccessModel) {
        this.owner = owner;
    }

    owner: model.IAccessModel;

    getModel(): model.IModel {
        return this.owner.getModel();
    }
    getParent(): model.IModelCtx {
        return this.owner;
    }
    getKey(): number | string {
        return undefined;
    }
    get(): any {
        return this.owner.get()[0];
    }
    getReadOnly(): boolean {
        return this.owner.getReadOnly();
    }
    getLastModified(): number {
        return this.owner.getLastModified();
    }
    set(value: any): boolean {
        if (this.get() !== value) {
            this.owner.set([value]);
            return true;
        }
        return false;
    }
}

class OptionalAccessor implements model.IAccessModel {
    constructor(model: OptionalModel<any>, raw: model.IRawAccessModel) {
        this.model = model;
        this.raw = raw;
    }

    model: OptionalModel<any>;
    raw: model.IRawAccessModel;

    getModel(): model.IModel { return this.model; }
    getParent(): model.IModelCtx { return this.raw.getParent(); }
    getKey(): number | string { return this.raw.getKey(); }
    get(): any { return this.raw.get(); }
    getReadOnly(): boolean { return this.raw.getReadOnly(); }
    getLastModified(): number { return this.raw.getLastModified(); }
    set(value: any): boolean {
        let inst = this.get();
        if (inst === value) return false;
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
    getChildCount(): number { return this.raw.get() === null ? 0 : 1; }
    getChild(index: number): model.IRawAccessModel {
        return new OptionalItemAccessor(this);
    }
    modify(): any {
        let i = this.get();
        if (i === null) return i;
        i = [i[0]];
        this.raw.set(i);
        return i;
    }
}

export class OptionalModel<T extends model.IModel> implements model.IModel {
    modelType = model.ModelType.Optional;
    uniqueName: string;
    parent: model.IModel;
    name: string;
    itemModel: T;
    constructor(itemModel: T) {
        this.needCtx = false;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = itemModel.name + '?';
        this.itemModel = itemModel;
    }

    needCtx: boolean;
    getNeedCtx(): boolean { return this.needCtx; }
    setNeedCtx() {
        if (this.needCtx) return;
        this.needCtx = true;
        this.itemModel.setNeedCtx();
    }

    getMemberCount(): number { return 0; }
    getMember(index: number): model.IModel { return undefined; }

    createEmptyInstance(): any {
        return null;
    }

    createReadOnlyRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadOnlyRawAccess(this);
    }

    createReadWriteRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadWriteRawAccess(this);
    }

    createAccessModel(rawAccess: model.IRawAccessModel): model.IAccessModel {
        return new OptionalAccessor(this, rawAccess);
    }
}
