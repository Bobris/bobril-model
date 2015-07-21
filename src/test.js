let actionHandlers = Object.create(null);
let transactionNumber = 0;
let dispatchNesting = 0;
let dispatch = (name, param) => {
    console.log('dispatching', name, param, 'nesting', dispatchNesting);
    if (dispatchNesting === 0) {
        transactionNumber++;
    }
    dispatchNesting++;
    try {
        actionHandlers[name](param);
    }
    finally {
        dispatchNesting--;
    }
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
    let fn = ((param) => {
        dispatch(actionName, param);
    });
    fn.actionName = actionName;
    return fn;
}
let uniqueNameModelCounter = 0;
function uniqueNameModelGenerator() {
    return '' + (uniqueNameModelCounter++);
}
let rootModifiedInTransaction = 0;
let rootModelInstance = null;
let rootModelData = null;
let rootAccessModel = null;
class RootModel {
    constructor(model) {
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
        let itemAccessModel = null;
        rootAccessModel = {
            get() {
                return rootModelData;
            },
            model: rootModelInstance,
            modelCtx: null,
            modifiedInTransaction() {
                return rootModifiedInTransaction;
            },
            childCount() {
                return 1;
            },
            child(index) {
                return itemAccessModel;
            },
            modify() {
                return rootModelData;
            },
            set(value) {
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
    createEmptyInstance() {
        throw new Error('You cannot create root instance. It always exists');
    }
    createAccessModel(parentModel) {
        return () => rootAccessModel;
    }
}
class ObjectAccessModelWithScalarParent {
    constructor(model, parent) {
        this.model = model;
        this.parent = parent;
        this.modelCtx = parent.modelCtx;
        this.memberCount = this.model.memberNames.length;
    }
    get() {
        let i = this.parent.get();
        if (i == null) {
            i = this.model.createEmptyInstance();
            this.parent.set(i);
        }
    }
    modifiedInTransaction() {
        return this.get()[0];
    }
    childCount() {
        return this.memberCount;
    }
    child(index) {
        return this.model.memberAccessCreators[index](this.parent);
    }
    modify() {
        let i = this.get();
        if (i[0] === transactionNumber)
            return i;
        i = i.split(0);
        i[0] = transactionNumber;
        this.parent.set(i);
        return i;
    }
    set(value) {
        let inst = this.get();
        if (inst === value)
            return false;
        const memberCount = this.memberCount;
        if (!Array.isArray(value) || value.length !== memberCount + 1) {
            throw new Error('Type does not match');
        }
        let i = 0;
        let ii = 1;
        for (; i < this.memberCount; i++, ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < this.memberCount; i++, ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
}
class ObjectModel {
    constructor(name) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.isScalar = false;
        this.members = Object.create(null);
        this.memberNames = [];
        this.emptyInstance = undefined;
        this.memberAccessCreators = undefined;
    }
    memberModel(name) {
        return this.members[name];
    }
    add(name, model) {
        if (this.emptyInstance !== undefined)
            throw new Error('Cannot modify freezed/used structure');
        if (name in this.members)
            throw new Error('Member ' + name + ' already exists in ' + this.name);
        this.memberNames.push(name);
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
    createEmptyInstance() {
        this.closeModelForModification();
        return this.emptyInstance;
    }
    createAccessModel(parentModel) {
        this.closeModelForModification();
        if (parentModel.isScalar) {
            return (parent) => {
                return new ObjectAccessModelWithScalarParent(this, parent);
            };
        }
        else {
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
    createEmptyInstance() {
        return [];
    }
}
class OptionalModel {
    constructor(itemModel) {
        this.itemModel = itemModel;
    }
    createEmptyInstance() {
        return null;
    }
}
class StringModel {
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }
    createEmptyInstance() {
        return '';
    }
}
class BooleanModel {
    constructor() {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = null;
    }
    createEmptyInstance() {
        return false;
    }
}
var rootModel = new ObjectModel();
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
