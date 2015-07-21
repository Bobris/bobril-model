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
    modelTo: IModel;
    parentCtx: IModelCtx;
    key: number | string;
}

interface IAccessModel {
    get(): any;
    model: IModel;
    modelCtx: IModelCtx;
    modifiedInTransaction(): number;
    childCount(): number;
    child(index: number): IAccessModel;

    modify(): any; // makes sence to call only on nonscalar
    set(value: any): boolean; // makes sence to call mostly on scalars, returns true when change detected
}

interface IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    isScalar: boolean;
    createEmptyInstance(): any;
    createAccessModel(parentModel: IModel): (parent: IAccessModel) => IAccessModel;
}

let uniqueNameModelCounter = 0;
function uniqueNameModelGenerator(): string {
    return '' + (uniqueNameModelCounter++);
}

let rootModifiedInTransaction: number = 0;
let rootModelInstance: IModel = null;
let rootModelData: any = null;
let rootAccessModel: IAccessModel = null;

class RootModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel: IModel;
    isScalar: boolean;
    constructor(model: IModel) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = 'root';
        this.itemModel = model;
        this.isScalar = true;
        model.parent = this;
        model.name = model.name || 'rootModel';
        rootModelInstance = this;
        rootModelData = null;
        let itemAccessModelCreator = model.createAccessModel(this);
        let itemAccessModel: IAccessModel = null;
        rootAccessModel = {
            get(): any {
                return rootModelData;
            },
            model: rootModelInstance,
            modelCtx: null,
            modifiedInTransaction(): number {
                return rootModifiedInTransaction;
            },
            childCount(): number {
                return 1;
            },
            child(index: number): IAccessModel {
                return itemAccessModel;
            },
            modify(): any {
                return rootModelData;
            },
            set(value: any): boolean {
                if (value !== rootModelData) {
                    rootModelData = value;
                    rootModifiedInTransaction = transactionNumber;
                    return true;
                }
                return false;
            }
        };
        itemAccessModel = itemAccessModelCreator(rootAccessModel);
    }

    createEmptyInstance(): any {
        throw new Error('You cannot create root instance. It always exists');
    }

    createAccessModel(parentModel: IModel): (parent: IAccessModel) => IAccessModel {
        return () => rootAccessModel;
    }
}

class ObjectAccessModelWithScalarParent implements IAccessModel {
    modelCtx: IModelCtx;
    memberCount: number;

    constructor(public model: ObjectModel, public parent: IAccessModel) {
        this.modelCtx = parent.modelCtx;
        this.memberCount = this.model.memberNames.length;
    }

    get(): any {
        let i = this.parent.get();
        if (i == null) {
            i = this.model.createEmptyInstance();
            this.parent.set(i);
        }
    }

    modifiedInTransaction(): number {
        return this.get()[0];
    }

    childCount(): number {
        return this.memberCount;
    }

    child(index: number): IAccessModel {
        return this.model.memberAccessCreators[index](this.parent);
    }

    modify(): any {
        let i = this.get();
        if (i[0] === transactionNumber)
            return i;
        i = i.split(0);
        i[0] = transactionNumber;
        this.parent.set(i);
        return i;
    }

    set(value: any): boolean {
        let inst = this.get();
        if (inst === value) return false;
        const memberCount = this.memberCount;
        if (!Array.isArray(value) || value.length !== memberCount + 1) {
            throw new Error('Type does not match');
        }
        let i = 0;
        let ii = 1;
        for (; i < this.memberCount; i++ , ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < this.memberCount; i++ , ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
}

class ObjectModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    isScalar: boolean;
    members: { [name: string]: IModel };
    memberNames: string[];

    constructor(name?: string) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.isScalar = false;
        this.members = Object.create(null);
        this.memberNames = [];
        this.emptyInstance = undefined;
        this.memberAccessCreators = undefined;
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
    memberAccessCreators: ((parent: IAccessModel) => IAccessModel)[];

    closeModelForModification() {
        if (this.emptyInstance !== undefined)
            return;
        let inst = [0];
        let creators = [];
        for (let i = 0; i < this.memberNames.length; i++) {
            let k = this.memberNames[i];
            let m = this.members[k];
            inst.push(m.createEmptyInstance());
            creators.push(m.createAccessModel(this));
        }
        this.emptyInstance = inst;
        this.memberAccessCreators = creators;
    }

    createEmptyInstance(): any {
        this.closeModelForModification();
        return this.emptyInstance;
    }

    createAccessModel(parentModel: IModel): (parent: IAccessModel) => IAccessModel {
        this.closeModelForModification();
        if (parentModel.isScalar) {
            return (parent: IAccessModel) => {
                return new ObjectAccessModelWithScalarParent(this, parent);
            };
        } else {

        }
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
