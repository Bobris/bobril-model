let actionHandlers = Object.create(null);
export let transactionNumber = 0;
let dispatchNesting = 0;
export let dispatch = (name, param) => {
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
export function createAction(injected, handler, name) {
    if (injected.length !== handler.length - 1)
        throw new Error('Injectors does not match parameter count');
    const injectedHandler = (param) => {
        let params = [param, ...injected];
        handler.apply(null, params);
    };
    const actionName = registerActionHandler(injectedHandler, name);
    let fn = ((param) => {
        dispatch(actionName, param);
    });
    fn.actionName = actionName;
    return fn;
}
