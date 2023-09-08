/**
 * recursively set object parameters
 * @param oldObject
 * @param newObject
 */
function setObject(oldObject, newObject) {
    Object.keys(newObject).map(function (k) {
        if (!oldObject[k]) {
            oldObject[k] = {};
        }
        if (typeof newObject[k] === 'object') {
            setObject(oldObject[k], newObject[k]);
        }
        else {
            oldObject[k] = newObject[k];
        }
    });
}
/**
 * merge the oldData with newData using template
 * @param oldData
 * @param newData
 * @param template
 */
function merge(oldData, newData, template) {
    Object.entries(template).map(function (_a) {
        var k = _a[0], v = _a[1];
        if (!v.calc && typeof v === 'object') {
            if (!oldData[k]) {
                oldData[k] = {};
            }
            merge(oldData[k], newData[k], template[k]);
            return;
        }
        if (!oldData[k] && v.calc !== 'init') {
            switch (typeof newData[k]) {
                case 'string': {
                    oldData[k] = '';
                    break;
                }
                case 'number': {
                    oldData[k] = 0;
                    break;
                }
                case 'object': {
                    oldData[k] = Array.isArray(newData[k]) ? [] : {};
                    break;
                }
            }
        }
        if (typeof v.calc === 'function') {
            v.calc(oldData, newData, oldData[k]);
        }
        else {
            switch (v.calc) {
                case 'init': {
                    if (oldData[k] === undefined) {
                        oldData[k] = newData[k];
                    }
                    break;
                }
                case 'set': {
                    oldData[k] = newData[k];
                    break;
                }
                case 'smartSet': {
                    if (typeof newData[k] === 'object') {
                        setObject(oldData[k], newData[k]);
                    }
                    else {
                        oldData[k] = newData[k];
                    }
                    break;
                }
                case 'sum': {
                    switch (v.method) {
                        case 'direct': {
                            oldData[k] += newData[k];
                            break;
                        }
                        case 'array': {
                            // console.log('oldData', oldData[k], k)
                            newData[k].map(function (v) {
                                if (!oldData[k].includes(v)) {
                                    oldData[k].push(v);
                                }
                            });
                        }
                    }
                    break;
                }
                case 'div': {
                    oldData[k] /= newData[k];
                    break;
                }
                case 'sub': {
                    oldData[k] -= newData[k];
                    break;
                }
                case 'mul': {
                    oldData[k] *= newData[k];
                    break;
                }
            }
        }
        return oldData;
    });
}
var objectUtils = { merge: merge, setObject: setObject };
if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') {
    module.exports = objectUtils;
}
//# sourceMappingURL=objectUtils.js.map