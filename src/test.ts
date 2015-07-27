import * as dispatcher from './dispatcher';
import * as model from './model';
import { RootModel } from './rootmodel';
import { ObjectModel, injectObjectModifier } from './objectmodel';
import { ArrayModel, injectArrayAppender } from './arraymodel';
import { OptionalModel } from './optionalmodel';
import { StringModel } from './stringmodel';
import { BooleanModel } from './booleanmodel';

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

var addTodo = dispatcher.createAction<string>([
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
    todoCtx: model.IModelCtx
}

var renameTodo = dispatcher.createAction<RenameTodo>([
    injectObjectModifier(root.todos.itemModel, todo.name)
], (param: RenameTodo,
    modifier: (todoCtx: model.IModelCtx, name: string) => boolean
) => {
        if (modifier(param.todoCtx, param.name)) {
            // Something changed send command to server
        }
    }, 'renameTodo');
