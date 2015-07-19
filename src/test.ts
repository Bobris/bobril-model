let actionHandlers: { [name: string]: (any) => void } = Object.create(null);

let dispatch = (name: string, param: any): void => {
    console.log('dispatching', name, param);
    actionHandlers[name](param);
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
    let fn = (param: T): void => {
        dispatch(actionName, param);
    };
    (<IAction<T>>fn).actionName = actionName;
    return <IAction<T>>fn;
}

interface IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
}

let uniqueNameModelCounter = 0;
function uniqueNameModelGenerator(): string {
    return '' + (uniqueNameModelCounter++);
}

class ObjectModel implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    members: { [name: string]: IModel };

    constructor(name?: string) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
    }

    memberModel(name: string): IModel {
        return this.members[name];
    }

    add<T extends IModel>(name: string, model: T): T {
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
}

class OptionalModel<T extends IModel> implements IModel {
    uniqueName: string;
    parent: IModel;
    name: string;
    itemModel: T;
    constructor(itemModel: T) {
        this.itemModel = itemModel;
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
}

interface IModelCtx {

}

var rootModel = new ObjectModel('root');

var root = {
    todos: new ArrayModel(new ObjectModel('todo'))
}
rootModel.addFrom(root);

var todo = {
    name: new StringModel(),
    done: new BooleanModel()
};

root.todos.itemModel.addFrom(todo);

interface Todo {
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
