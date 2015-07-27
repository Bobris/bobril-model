import * as dispatcher from './dispatcher';
import * as model from './model';
let rootModifiedInTransaction = 0;
export let rootModelInstance = null;
let rootModelData = null;
let rootAccessModel = null;
const rootModelReadOnlyAccessor = {
    getModel() {
        return rootModelInstance;
    },
    getParent() {
        return null;
    },
    getKey() {
        return undefined;
    },
    get() {
        return rootModelData;
    },
    getReadOnly() {
        return true;
    },
    getLastModified() {
        return rootModifiedInTransaction;
    },
    set(value) {
        model.throwReadOnly();
        return false;
    },
    getChildCount() {
        return 0;
    },
    getChild(index) {
        return undefined;
    },
    modify() {
        model.throwReadOnly();
        return undefined;
    }
};
const rootModelReadWriteAccessor = {
    getModel() {
        return rootModelInstance;
    },
    getParent() {
        return null;
    },
    getKey() {
        return undefined;
    },
    get() {
        return rootModelData;
    },
    getReadOnly() {
        return false;
    },
    getLastModified() {
        return rootModifiedInTransaction;
    },
    set(value) {
        if (rootModelData !== value) {
            rootModelData = value;
            rootModifiedInTransaction = dispatcher.transactionNumber;
            return true;
        }
        return false;
    },
    getChildCount() {
        return 0;
    },
    getChild(index) {
        return undefined;
    },
    modify() {
        return rootModelData;
    }
};
export class RootModel {
    constructor(itemModel) {
        this.modelType = 0;
        this.uniqueName = model.uniqueNameModelGenerator();
        this.parent = null;
        this.name = 'root';
        this.itemModel = itemModel;
        itemModel.parent = this;
        itemModel.name = itemModel.name || 'rootModel';
        rootModelInstance = this;
        rootModelData = undefined;
    }
    getNeedCtx() { return false; }
    setNeedCtx() { throw new Error('Root cannot need ctx'); }
    getMemberCount() { return 0; }
    getMember(index) { return undefined; }
    createEmptyInstance() {
        throw new Error('You cannot create root instance. It always exists');
    }
    createReadOnlyRawAccess() {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadOnlyAccessor;
    }
    createReadWriteRawAccess() {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadWriteAccessor;
    }
    createAccessModel(rawAccess) {
        return rawAccess;
    }
}
