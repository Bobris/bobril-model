export var ModelType;
(function (ModelType) {
    ModelType[ModelType["Root"] = 0] = "Root";
    ModelType[ModelType["Object"] = 1] = "Object";
    ModelType[ModelType["Array"] = 2] = "Array";
    ModelType[ModelType["Optional"] = 3] = "Optional";
    ModelType[ModelType["String"] = 4] = "String";
    ModelType[ModelType["Boolean"] = 5] = "Boolean";
})(ModelType || (ModelType = {}));
let uniqueNameModelCounter = 0;
export function uniqueNameModelGenerator() {
    return '' + (uniqueNameModelCounter++);
}
export function throwReadOnly() {
    throw new Error('ReadOnly');
}
export class StandaloneReadOnlyRawAccess {
    constructor(model) {
        this.model = model;
        this.instance = model.createEmptyInstance();
    }
    getModel() {
        return this.model;
    }
    getParent() {
        return null;
    }
    getKey() {
        return undefined;
    }
    get() {
        return this.instance;
    }
    getReadOnly() {
        return true;
    }
    getLastModified() {
        return 0;
    }
    set(value) {
        throwReadOnly();
        return false;
    }
}
export class StandaloneReadWriteRawAccess {
    constructor(model) {
        this.model = model;
        this.instance = model.createEmptyInstance();
        this.modified = false;
    }
    getModel() {
        return this.model;
    }
    getParent() {
        return null;
    }
    getKey() {
        return undefined;
    }
    get() {
        return this.instance;
    }
    getReadOnly() {
        return false;
    }
    getLastModified() {
        return this.modified ? 1 : 0;
    }
    set(value) {
        if (this.instance !== value) {
            this.instance = value;
            this.modified = true;
            return true;
        }
        return false;
    }
}
