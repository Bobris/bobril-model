export const enum ModelType {
    Root,
    Object,
    Array,
    Optional,
    String,
    Boolean
}

export interface IModelCtx {
    getModel(): IModel;
    getParent(): IModelCtx;
    getKey(): number | string;
}

export interface IRawAccessModel extends IModelCtx {
    get(): any;
    getReadOnly(): boolean;
    getLastModified(): number;
    set(value: any): boolean; // returns true if modified
}

export interface IAccessModel extends IRawAccessModel {
    // makes sence to call only on nonscalar
    getChildCount(): number;
    getChild(index: number): IRawAccessModel;
    modify(): any;
}

export interface IModel {
    modelType: ModelType;
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel?: IModel;
    getNeedCtx(): boolean;
    /// You can set need for ctx only to true
    setNeedCtx();
    getMemberCount(): number;
    getMember(index: number): IModel;
    createEmptyInstance(): any;
    createReadOnlyRawAccess(): IRawAccessModel;
    createReadWriteRawAccess(): IRawAccessModel;
    createAccessModel(rawAccess: IRawAccessModel): IAccessModel;
}

let uniqueNameModelCounter = 0;
export function uniqueNameModelGenerator(): string {
    return '' + (uniqueNameModelCounter++);
}

export function throwReadOnly() {
    throw new Error('ReadOnly');
}

export class StandaloneReadOnlyRawAccess implements IRawAccessModel {
    constructor(model: IModel) {
        this.model = model;
        this.instance = model.createEmptyInstance();
    }

    model: IModel;
    instance: any;

    getModel(): IModel {
        return this.model;
    }
    getParent(): IModelCtx {
        return null;
    }
    getKey(): number | string {
        return undefined;
    }
    get(): any {
        return this.instance;
    }
    getReadOnly(): boolean {
        return true;
    }
    getLastModified(): number {
        return 0;
    }
    set(value: any): boolean {
        throwReadOnly(); return false;
    }
}

export class StandaloneReadWriteRawAccess implements IRawAccessModel {
    constructor(model: IModel) {
        this.model = model;
        this.instance = model.createEmptyInstance();
        this.modified = false;
    }

    model: IModel;
    instance: any;
    modified: boolean;

    getModel(): IModel {
        return this.model;
    }
    getParent(): IModelCtx {
        return null;
    }
    getKey(): number | string {
        return undefined;
    }
    get(): any {
        return this.instance;
    }
    getReadOnly(): boolean {
        return false;
    }
    getLastModified(): number {
        return this.modified ? 1 : 0;
    }
    set(value: any): boolean {
        if (this.instance !== value) {
            this.instance = value;
            this.modified = true;
            return true;
        }
        return false;
    }
}
