import * as dispatcher from './dispatcher';
import * as model from './model';

class BooleanAccessor implements model.IAccessModel {
    constructor(model: model.IModel, raw: model.IRawAccessModel) {
        this.model = model;
        this.raw = raw;
    }

    model: model.IModel;
    raw: model.IRawAccessModel;

    getModel(): model.IModel { return this.model; }
    getParent(): model.IModelCtx { return this.raw.getParent(); }
    getKey(): number | string { return this.raw.getKey(); }
    get(): any { return this.raw.get(); }
    getReadOnly(): boolean { return this.raw.getReadOnly(); }
    getLastModified(): number { return this.raw.getLastModified(); }
    set(value: any): boolean {
        if (typeof value !== 'boolean') {
            throw new Error('Type does not match');
        }
        return this.raw.set(value);
    }
    getChildCount(): number { return 0; }
    getChild(index: number): model.IRawAccessModel {
        return undefined;
    }
    modify(): any {
        return this.get();
    }
}

export class BooleanModel implements model.IModel {
    modelType = model.ModelType.Boolean;
    uniqueName: string;
    parent: model.IModel;
    name: string;
    constructor() {
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
        this.needCtx = false;
    }

    needCtx: boolean;
    getNeedCtx(): boolean { return this.needCtx; }
    setNeedCtx() {
        this.needCtx = true;
    }

    getMemberCount(): number { return 0; }
    getMember(index: number): model.IModel { return undefined; }

    createEmptyInstance(): any {
        return false;
    }

    createReadOnlyRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadOnlyRawAccess(this);
    }

    createReadWriteRawAccess(): model.IRawAccessModel {
        return new model.StandaloneReadWriteRawAccess(this);
    }

    createAccessModel(rawAccess: model.IRawAccessModel): model.IAccessModel {
        return new BooleanAccessor(this, rawAccess);
    }
}
