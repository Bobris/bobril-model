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
function throwReadOnly() {
    throw new Error('ReadOnly');
}
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
        throwReadOnly();
        return false;
    },
    getChildCount() {
        return 0;
    },
    getChild(index) {
        return undefined;
    },
    modify() {
        throwReadOnly();
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
            rootModifiedInTransaction = transactionNumber;
            return true;
        }
        return false;
    },
    getChildCount() {
        return false;
    },
    getChild(index) {
        return undefined;
    },
    modify() {
        return rootModelData;
    }
};
class RootModel {
    constructor(model) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = 'root';
        this.itemModel = model;
        model.parent = this;
        model.name = model.name || 'rootModel';
        rootModelInstance = this;
        rootModelData = undefined;
    }
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
class StandaloneReadOnlyRawAccess {
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
class StandaloneReadWriteRawAccess {
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
        return this.modified ? transactionNumber : 0;
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
class ObjectMemberAccessor {
    constructor(owner, index) {
        this.owner = owner;
        this.index = index + 1;
    }
    getModel() {
        return null;
    }
    getParent() {
        return this.owner;
    }
    getKey() {
        return undefined;
    }
    get() {
        return this.owner.get()[this.index];
    }
    getReadOnly() {
        return this.owner.getReadOnly();
    }
    getLastModified() {
        return this.owner.getLastModified();
    }
    set(value) {
        if (this.get() !== value) {
            let i = this.owner.modify();
            i[this.index] = value;
            return true;
        }
        return false;
    }
}
class ObjectAccessor {
    constructor(model, raw) {
        this.model = model;
        this.raw = raw;
    }
    getModel() { return this.model; }
    getParent() { return this.raw.getParent(); }
    getKey() { return this.raw.getKey(); }
    get() { return this.raw.get(); }
    getReadOnly() { return this.raw.getReadOnly(); }
    getLastModified() { return this.get()[0]; }
    set(value) {
        let inst = this.get();
        if (inst === value)
            return false;
        const memberCount = this.model.memberNames.length;
        if (!Array.isArray(value) || value.length !== memberCount + 1) {
            throw new Error('Type does not match');
        }
        let i = 0;
        let ii = 1;
        for (; i < memberCount; i++, ii++) {
            if (inst[ii] !== value[ii]) {
                inst = this.modify();
                for (; i < memberCount; i++, ii++) {
                    inst[ii] = value[ii];
                }
                return true;
            }
        }
        return false;
    }
    getChildCount() { return this.model.memberNames.length; }
    getChild(index) {
        return new ObjectMemberAccessor(this, index);
    }
    modify() {
        let i = this.get();
        if (i[0] === transactionNumber)
            return i;
        i = i.split(0);
        i[0] = transactionNumber;
        this.raw.set(i);
        return i;
    }
}
class ObjectModel {
    constructor(name) {
        this.uniqueName = uniqueNameModelGenerator();
        this.parent = null;
        this.name = name || 'object';
        this.members = Object.create(null);
        this.memberNames = [];
        this.emptyInstance = undefined;
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
        for (let i = 0; i < this.memberNames.length; i++) {
            let k = this.memberNames[i];
            let m = this.members[k];
            inst.push(m.createEmptyInstance());
        }
        this.emptyInstance = inst;
    }
    createEmptyInstance() {
        this.closeModelForModification();
        return this.emptyInstance;
    }
    createReadOnlyRawAccess() {
        this.closeModelForModification();
        return new StandaloneReadOnlyRawAccess(this);
    }
    createReadWriteRawAccess() {
        this.closeModelForModification();
        return new StandaloneReadWriteRawAccess(this);
    }
    createAccessModel(rawAccess) {
        return new ObjectAccessor(this, rawAccess);
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
new RootModel(rootModel);
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
