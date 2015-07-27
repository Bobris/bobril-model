import { IModel, ModelType } from './model';
import * as rootmodel from './rootmodel';
import { RuntimeFunctionGenerator } from './RuntimeFunctionGenerator';

export function genReadWriteAccessor(gen: RuntimeFunctionGenerator, model: IModel): string {
    let l = gen.addLocal();
    let ca = gen.addConstant(rootmodel.rootModelInstance.createReadWriteRawAccess);
    let models = [];
    let m = model;
    while (m != null) {
        models.push(m);
        m = m.parent;
    }
    let i = models.length - 1;
    m = models[i];
    let c = gen.addConstant(m.createReadWriteRawAccess);
    let c2 = gen.addConstant(m);
    gen.addBody(`var ${l}=${c}.call(${c2})\n`);
    for (i--; i > 0; i--) {
        m = models[i];
        c = gen.addConstant(m.createAccessModel);
        c2 = gen.addConstant(m);
        gen.addBody(`${l}=${c}.call(${c2},${l})\n`);
        let mc = model[i - 1];
        if (m.modelType === ModelType.Object) {
            for (let j = 0; j < m.getMemberCount(); j++) {
                if (m.getMember(j) === mc) {
                    gen.addBody(`${l}=${l}.child(${j})\n`);
                    break;
                }
            }
        } else {
            throw new Error('TODO');
        }
    }
    c = gen.addConstant(model.createAccessModel);
    c2 = gen.addConstant(model);
    gen.addBody(`${l}=${c}.call(${c2},${l})\n`);
    return l;
}
