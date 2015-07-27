import * as dispatcher from './dispatcher';
import { RootModel } from './rootmodel';
import { ObjectModel, injectObjectModifier } from './objectmodel';
import { ArrayModel, injectArrayAppender } from './arraymodel';
import { StringModel } from './stringmodel';
import { BooleanModel } from './booleanmodel';
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
var addTodo = dispatcher.createAction([
    injectArrayAppender(root.todos, todo.name, todo.done)
], (name, appender) => {
    appender(name, false);
}, 'addTodo');
addTodo("Promote Bobril");
var renameTodo = dispatcher.createAction([
    injectObjectModifier(root.todos.itemModel, todo.name)
], (param, modifier) => {
    if (modifier(param.todoCtx, param.name)) {
    }
}, 'renameTodo');
