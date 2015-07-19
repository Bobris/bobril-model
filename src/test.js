let actionHandlers = Object.create(null);
let dispatch = (name, param) => {
    console.log('dispatching', name, param);
    actionHandlers[name](param);
};
function registerActionHandler(handler, name) {
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
function createAction(injectors, handler, name) {
    if (injectors.length !== handler.length - 1)
        throw new Error('Injectors does not match parameter count');
    const injectedCreators = injectors.map(i => i.create());
    const injectedHandler = (param) => {
        let params = [param, ...injectedCreators];
        handler.apply(null, params);
    };
    const actionName = registerActionHandler(injectedHandler, name);
    let fn = (param) => {
        dispatch(actionName, param);
    };
    fn.actionName = actionName;
    return fn;
}
let uniqueNameModelCounter = 0;
function uniqueNameModelGenerator() {
    return '' + (uniqueNameModelCounter++);
}
class ObjectModel {
    constructor(name) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
    }
    memberModel(name) {
        return this.members[name];
    }
    add(name, model) {
        this.members[name] = model;
        model.name = name;
        model.parent = this;
        return model;
    }
    addFrom(members) {
        let names = Object.keys(members);
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            this.add(name, members[name]);
        }
    }
}
class ArrayModel {
    constructor(itemModel) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        itemModel.parent = this;
        this.itemModel = itemModel;
        this.name = itemModel.name + '[]';
    }
}
class OptionalModel {
    constructor(itemModel) {
        this.itemModel = itemModel;
    }
}
class StringModel {
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }
}
class BooleanModel {
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }
}
var rootModel = new ObjectModel('root');
var root = {
    todos: new ArrayModel(new ObjectModel('todo'))
};
rootModel.addFrom(root);
var todo = {
    name: new StringModel(),
    done: new BooleanModel()
};
root.todos.itemModel.addFrom(todo);
function injectArrayAppender(arrayModel, ...memberSetterModels) {
    return null;
}
function injectObjectModifier(objectModel, ...memberSetterModels) {
    return null;
}
var addTodo = createAction([
    injectArrayAppender(root.todos, todo.name, todo.done)
], (name, appender) => {
    appender(name, false);
}, 'addTodo');
addTodo("Promote Bobril");
var renameTodo = createAction([
    injectObjectModifier(root.todos.itemModel, todo.name)
], (param, modifier) => {
    if (modifier(param.todoCtx, param.name)) {
    }
}, 'renameTodo');
