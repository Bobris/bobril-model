let actionHandlers: { [name: string]: (any) => void } = Object.create(null);

export let transactionNumber = 0;
let dispatchNesting = 0;

export let dispatch = (name: string, param: any): void => {
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

export interface IAction<T> {
    (param: T): void;
    actionName: string;
}

export function createAction<T>(injected: Function[], handler: (T, ...injected: Function[]) => void, name?: string): IAction<T> {
    if (injected.length !== handler.length - 1) throw new Error('Injectors does not match parameter count');
    const injectedHandler = (param: T): void => {
        let params = [param, ...injected];
        handler.apply(null, params);
    }
    const actionName = registerActionHandler(injectedHandler, name);
    let fn = <IAction<T>>((param: T): void => {
        dispatch(actionName, param);
    });
    fn.actionName = actionName;
    return fn;
}
