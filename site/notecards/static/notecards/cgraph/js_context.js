/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */
import {graphUtils} from './graph_utils.js';


export const jsContextFactory = {
    newContext: function() { return new JSContext(); }
};


function JSContext()
{
    var globalContext = {};

    this.addGlobal = function(name, value)
    {
        globalContext[name] = value;
    }

    this.execute = function(code)
    {
        return execute(code, globalContext);
    }
}


const defaultLocalVars = [
    (x, y) => new graphUtils.Point(x, y),
    (x, y, width, height) => new graphUtils.Bounds(x, y, width, height)
];

const defaultLocalVarsCode = `
const M = Math;
const P = __dlv[0];
const B = __dlv[1];
`;


function execute(code, globalContext)
{
    var result = "";

    if (/^\s*=/.test(code))
    {
        code = code.replace("=", "return ");
    }

    code = `'use strict';${defaultLocalVarsCode}${code}`;

    try
    {
        let func = new Function('$', '__dlv', code);
        let funcReturnValue = func(globalContext, defaultLocalVars);

        switch (typeof funcReturnValue)
        {
            case 'string':
            case 'number':
                result = funcReturnValue.toString();
                break;

            case 'object':
                switch (funcReturnValue.constructor.name)
                {
                    case 'Point':
                    case 'Bounds':
                        result = funcReturnValue.toString();
                        break;
                }
                break;
        }
    }
    catch(error)
    {
        console.log(error);
    }

    return result;
}

