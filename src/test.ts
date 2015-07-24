let actionHandlers: { [name: string]: (any) => void } = Object.create(null);

let transactionNumber = 0;
let dispatchNesting = 0;

let dispatch = (name: string, param: any): void => {
    console.log('dispatching', name, param, 'nesting', dispatchNesting);
    if (dispatchNesting === 0) {
        transactionNumber++;
    }
    dispatchNesting++;
    try {
        actionHandlers[name](param);
    } finally {
        dispatchNesting--;
    }
}

function registerActionHandler(handler: (any) => void, name?: string): string {
    name = name || 'noname';
    if (name in actionHandlers) {
        let counter = 1;
        while (true) {
            counter++;
            let name2 = name + "-" + counter;
            if (!(name2 in actionHandlers)) {
                name = name2;
                break;
            }
        }
    }
    actionHandlers[name] = handler;
    return name;
}

interface IInjector {
    create(): any;
}

interface IAction<T> {
    (param: T): void;
    actionName: string;
}

function createAction<T>(injectors: IInjector[], handler: (T, ...injected: any[]) => void, name?: string): IAction<T> {
    if (injectors.length !== handler.length - 1) throw new Error('Injectors does not match parameter count');
    const injectedCreators = injectors.map(i=> i.create());
    const injectedHandler = (param: T): void => {
        let params = [param, ...injectedCreators];
        handler.apply(null, params);
    }
    const actionName = registerActionHandler(injectedHandler, name);
    let fn = <IAction<T>>((param: T): void => {
        dispatch(actionName, param);
    });
    fn.actionName = actionName;
    return fn;
}

interface IModelCtx {
    getModel(): IModel;
    getParent(): IModelCtx;
    getKey(): number | string;
}

interface IRawAccessModel extends IModelCtx {
    get(): any;
    getReadOnly(): boolean;
    getLastModified(): number;
    set(value: any): boolean; // returns true if modified
}

interface IAccessModel extends IRawAccessModel {
    // makes sence to call only on nonscalar
    getChildCount(): number;
    getChild(index: number): IRawAccessModel;
    modify(): any;
}

interface IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    createEmptyInstance(): any;
    createReadOnlyRawAccess(): IRawAccessModel;
    createReadWriteRawAccess(): IRawAccessModel;
    createAccessModel(rawAccess: IRawAccessModel): IAccessModel;
}

let uniqueNameModelCounter = 0;
function uniqueNameModelGenerator(): string {
    return '' + (uniqueNameModelCounter++);
}

let rootModifiedInTransaction: number = 0;
let rootModelInstance: IModel = null;
let rootModelData: any = null;
let rootAccessModel: IAccessModel = null;

function throwReadOnly() {
    throw new Error('ReadOnly');
}

const rootModelReadOnlyAccessor: IAccessModel = {
    getModel(): IModel {
        return rootModelInstance;
    },
    getParent(): IModelCtx {
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
        throwReadOnly(); return false;
    },
    getChildCount(): number {
        return 0;
    },
    getChild(index: number): IRawAccessModel {
        return undefined;
    },
    modify(): any {
        throwReadOnly(); return undefined;
    }
}

const rootModelReadWriteAccessor: IAccessModel = {
    getModel(): IModel {
        return rootModelInstance;
    },
    getParent(): IModelCtx {
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
            rootModifiedInTransaction = transactionNumber;
            return true;
        }
        return false;
    },
    getChildCount(): number {
        return false;
    },
    getChild(index: number): IRawAccessModel {
        return undefined;
    },
    modify(): any {
        return rootModelData;
    }
}

class RootModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel: IModel;
    constructor(model: IModel) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = 'root';
        this.itemModel = model;
        model.parent = this;
        model.name = model.name || 'rootModel';
        rootModelInstance = this;
        rootModelData = undefined;
    }

    createEmptyInstance(): any {
        throw new Error('You cannot create root instance. It always exists');
    }

    createReadOnlyRawAccess(): IRawAccessModel {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadOnlyAccessor;
    }

    createReadWriteRawAccess(): IRawAccessModel {
        if (rootModelData === undefined) {
            rootModelData = this.itemModel.createEmptyInstance();
        }
        return rootModelReadWriteAccessor;
    }

    createAccessModel(rawAccess: IRawAccessModel): IAccessModel {
        return <IAccessModel>rawAccess;
    }
}

class StandaloneReadOnlyRawAccess implements IRawAccessModel {
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

class StandaloneReadWriteRawAccess implements IRawAccessModel {
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
        return this.modified ? transactionNumber : 0;
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

class ObjectMemberAccessor implements IRawAccessModel {
    constructor(owner: IAccessModel, index: number) {
        this.owner = owner;
        this.index = index + 1;
    }

    owner: IAccessModel;
    index: number;

    getModel(): IModel {
        return null;
    }
    getParent(): IModelCtx {
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

class ObjectAccessor implements IAccessModel {
    constructor(model: ObjectModel, raw: IRawAccessModel) {
        this.model = model;
        this.raw = raw;
    }

    model: ObjectModel;
    raw: IRawAccessModel;

    getModel(): IModel { return this.model; }
    getParent(): IModelCtx { return this.raw.getParent(); }
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
    getChild(index: number): IRawAccessModel {
        return new ObjectMemberAccessor(this, index);
    }
    modify(): any {
        let i = this.get();
        if (i[0] === transactionNumber)
            return i;
        i = i.split(0);
        i[0] = transactionNumber;
        this.raw.set(i);
        return i;
    }
}

class ObjectModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    members: { [name: string]: IModel };
    memberNames: string[];

    constructor(name?: string) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
        this.memberNames = [];
        this.emptyInstance = undefined;
    }

    memberModel(name: string): IModel {
        return this.members[name];
    }

    add<T extends IModel>(name: string, model: T): T {
        if (this.emptyInstance !== undefined) throw new Error('Cannot modify freezed/used structure');
        if (name in this.members) throw new Error('Member ' + name + ' already exists in ' + this.name);
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
            this.add(name, <IModel>members[name]);
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

    createReadOnlyRawAccess(): IRawAccessModel {
        this.closeModelForModification();
        return new StandaloneReadOnlyRawAccess(this);
    }

    createReadWriteRawAccess(): IRawAccessModel {
        this.closeModelForModification();
        return new StandaloneReadWriteRawAccess(this);
    }

    createAccessModel(rawAccess: IRawAccessModel): IAccessModel {
        return new ObjectAccessor(this, rawAccess);
    }
}

class ArrayModel<T extends IModel> implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel: T;
    constructor(itemModel: T) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        itemModel.parent = this;
        this.itemModel = itemModel;
        this.name = itemModel.name + '[]';
    }

    createEmptyInstance(): any {
        return [];
    }
}

class OptionalModel<T extends IModel> implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel: T;
    constructor(itemModel: T) {
        this.itemModel = itemModel;
    }

    createEmptyInstance(): any {
        return null;
    }
}

class StringModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }

    createEmptyInstance(): any {
        return '';
    }

}

class BooleanModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }

    createEmptyInstance(): any {
        return false;
    }
}

var rootModel = new ObjectModel();
new RootModel(rootModel);

var root = {
    todos: new ArrayModel(new ObjectModel('todo'))
}
rootModel.addFrom(root);

var todo = {
    name: new StringModel(),
    done: new BooleanModel()
};

root.todos.itemModel.addFrom(todo);

interface ITodo {
    name: string;
    done: boolean;
}

function injectArrayAppender(arrayModel: IModel, ...memberSetterModels: IModel[]): IInjector {
    return null;
}

function injectObjectModifier(objectModel: IModel, ...memberSetterModels: IModel[]): IInjector {
    return null;
}

var addTodo = createAction<string>([
    injectArrayAppender(root.todos, todo.name, todo.done)
], (name: string,
    appender: (name: string, done: boolean) => void
) => {
        appender(name, false);
        // Send command to server
    }, 'addTodo');

addTodo("Promote Bobril");

interface RenameTodo {
    name: string;
    todoCtx: IModelCtx
}

var renameTodo = createAction<RenameTodo>([
    injectObjectModifier(root.todos.itemModel, todo.name)
], (param: RenameTodo,
    modifier: (todoCtx: IModelCtx, name: string) => boolean
) => {
        if (modifier(param.todoCtx, param.name)) {
            // Something changed send command to server
        }
    }, 'renameTodo');
