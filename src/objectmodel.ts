import * as dispatcher from './dispatcher';
import * as model from './model';
import * as rootmodel from './rootmodel';

export class ObjectMemberAccessor implements model.IRawAccessModel {
    constructor(owner: model.IAccessModel, index: number) {
        this.owner = owner;
        this.index = index + 1;
    }

    owner: model.IAccessModel;
    index: number;

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
        return this.owner.get()[this.index];
    }
    getReadOnly(): boolean {
        return this.owner.getReadOnly();
    }
    getLastModified(): number {
        return this.owner.getLastModified();
    }
    set(value: any): boolean {
        if (this.get() !== value) {
            let i = this.owner.modify();
            i[this.index] = value;
            return true;
        }
        return false;
    }
}

class ObjectAccessor implements model.IAccessModel {
    constructor(model: ObjectModel, raw: model.IRawAccessModel) {
        this.model = model;
        this.raw = raw;
    }

    model: ObjectModel;
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
        const memberCount = this.model.memberNames.length;
        if (!Array.isArray(value) || value.length !== memberCount + 1) {
            throw new Error('Type does not match');
        }
        let i = 0;
        let ii = 1;
        for (; i < memberCount; i++ , ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < memberCount; i++ , ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
    getChildCount(): number { return this.model.memberNames.length; }
    getChild(index: number): model.IRawAccessModel {
        return new ObjectMemberAccessor(this, index);
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

export class ObjectModel implements model.IModel {
    modelType = model.ModelType.Object;
    uniqueName: string;
    parent: model.IModel;
    name: string;
    members: { [name: string]: model.IModel };
    memberNames: string[];
    memberModels: model.IModel[];

    constructor(name?: string) {
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
        this.memberNames = [];
        this.memberModels = [];
        this.emptyInstance = undefined;
        this.needCtx = false;
    }

    needCtx: boolean;
    getNeedCtx(): boolean { return this.needCtx; }
    setNeedCtx() {
        if (this.needCtx) return;
        this.needCtx = true;
        for (let i = 0; i < this.memberModels.length; i++) {
            this.memberModels[i].setNeedCtx();
        }
    }

    getMemberCount(): number { return this.memberNames.length; }
    getMember(index: number): model.IModel { return this.memberModels[index]; }

    add<T extends model.IModel>(name: string, model: T): T {
        if (this.emptyInstance !== undefined) throw new Error('Cannot modify freezed/used structure');
        if (name in this.members) throw new Error('Member ' + name + ' already exists in ' + this.name);
        this.memberModels.push(model);
        this.memberNames.push(name);
        this.members[name] = model;
        model.name = name;
        model.parent = this;
        return model;
    }

    addFrom(members: Object) {
        let names = Object.keys(members);
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            this.add(name, <model.IModel>members[name]);
        }
    }

    emptyInstance: any[];

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

    createEmptyInstance(): any {
        this.closeModelForModification();
        return this.emptyInstance;
    }

    createReadOnlyRawAccess(): model.IRawAccessModel {
        this.closeModelForModification();
        return new model.StandaloneReadOnlyRawAccess(this);
    }

    createReadWriteRawAccess(): model.IRawAccessModel {
        this.closeModelForModification();
        return new model.StandaloneReadWriteRawAccess(this);
    }

    createAccessModel(rawAccess: model.IRawAccessModel): model.IAccessModel {
        return new ObjectAccessor(this, rawAccess);
    }
}

export function injectObjectModifier(objectModel: model.IModel, ...memberSetterModels: model.IModel[]): Function {
    return null;
}
