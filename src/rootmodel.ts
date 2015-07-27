import * as dispatcher from './dispatcher';
import * as model from './model';

let rootModifiedInTransaction: number = 0;
export let rootModelInstance: model.IModel = null;
let rootModelData: any = null;
let rootAccessModel: model.IAccessModel = null;

const rootModelReadOnlyAccessor: model.IAccessModel = {
    getModel(): model.IModel {
        return rootModelInstance;
    },
    getParent(): model.IModelCtx {
        return null;
    },
    getKey(): number | string {
        return undefined;
    },
    get(): any {
        return rootModelData;
    },
    getReadOnly(): boolean {
        return true;
    },
    getLastModified(): number {
        return rootModifiedInTransaction;
    },
    set(value: any): boolean {
        model.throwReadOnly(); return false;
    },
    getChildCount(): number {
        return 0;
    },
    getChild(index: number): model.IRawAccessModel {
        return undefined;
    },
    modify(): any {
        model.throwReadOnly(); return undefined;
    }
}

const rootModelReadWriteAccessor: model.IAccessModel = {
    getModel(): model.IModel {
        return rootModelInstance;
    },
    getParent(): model.IModelCtx {
        return null;
    },
    getKey(): number | string {
        return undefined;
    },
    get(): any {
        return rootModelData;
    },
    getReadOnly(): boolean {
        return false;
    },
    getLastModified(): number {
        return rootModifiedInTransaction;
    },
    set(value: any): boolean {
        if (rootModelData !== value) {
            rootModelData = value;
            rootModifiedInTransaction = dispatcher.transactionNumber;
            return true;
        }
        return false;
    },
    getChildCount(): number {
        return 0;
    },
    getChild(index: number): model.IRawAccessModel {
        return undefined;
    },
    modify(): any {
        return rootModelData;
    }
}

export class RootModel implements model.IModel {
    modelType = model.ModelType.Root;
    uniqueName: string;
    parent: model.IModel;
    name: string;
    itemModel: model.IModel;
    constructor(itemModel: model.IModel) {
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = 'root';
        this.itemModel = itemModel;
        itemModel.parent = this;
        itemModel.name = itemModel.name || 'rootModel';
        rootModelInstance = this;
        rootModelData = undefined;
    }

    getNeedCtx(): boolean { return false; }
    setNeedCtx() { throw new Error('Root cannot need ctx'); }

    getMemberCount(): number { return 0; }
    getMember(index: number): model.IModel { return undefined; }

    createEmptyInstance(): any {
        throw new Error('You cannot create root instance. It always exists');
    }

    createReadOnlyRawAccess(): model.IRawAccessModel {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadOnlyAccessor;
    }

    createReadWriteRawAccess(): model.IRawAccessModel {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadWriteAccessor;
    }

    createAccessModel(rawAccess: model.IRawAccessModel): model.IAccessModel {
        return <model.IAccessModel>rawAccess;
    }
}
