/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const defaultAttributes =
{
    'svg': { xmlns: "http://www.w3.org/2000/svg", width: 300, height: 300, viewBox: "0 0 300 300" },
    'circle': { cx: 0, cy: 0, r: 1, },
    'line': { x1: 0, y1: 0, x2: 10, y2: 0 },
    'text': { x: 0, y: 0, fill: "black", stroke: "none" },
    'path': { d: " " },
    'rect': { x: 0, y: 0, width: 1, height: 1 },
    'foreignObject': { x: 0, y: 0, width: 10, height: 10 },
    'ellipse': { cx: 0, cy: 0, rx: 10, ry: 5 },
    'image': { x: 0, y: 50, width: 50, height: 50, preserveAspectRatio: 'xMinYMin'}
};


export function setAttributes(element, attributes)
{
    for (let attributeName in attributes)
    {
        if (attributeName.startsWith('xlink:'))
        {
            element.setAttributeNS("http://www.w3.org/1999/xlink",
                                   attributeName,
                                   attributes[attributeName]);
        }
        else
        {
            element.setAttribute(attributeName, attributes[attributeName]);
        }
    }
};


export function createSvgElement(tagName, attributes, textContent)
{
    var element = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    if ((typeof(attributes) === "boolean") && attributes)
    {
        if (defaultAttributes.hasOwnProperty(tagName))
        {
            attributes = defaultAttributes[tagName];
        }
    }

    setAttributes(element, attributes);

    if (typeof(textContent) === "string")
    {
        var textNode = document.createTextNode(textContent);
        element.appendChild(textNode);
    }

    return element;
};


export function isFloat(inputArray)
{
    for (let i=0; i < inputArray.length; i++)
    {
        if (Number.isNaN(parseFloat(inputArray[i]))) return false;
    }

    return true;
};


/*
 * Tries to convert all the items in inputArray
 * to floats. Returns true if all items could be
 * converted. Returns false if any item could not
 * be converted. If the values argument is not
 * specified then then the conversion is done in place.
 * If the values argument is specified, it must be an
 * array and the resulting floats will be appended on
 * to the end of it. Note, once an invalid value has
 * been encountered, the processing is stopped and
 * the output array may contain less values then the
 * input array.
 */
export function parseFloats(inputArray, values)
{
    let converted = true;

    for (let i=0; i < inputArray.length; i++)
    {
        let value = parseFloat(inputArray[i]);
        if (Number.isNaN(value))
        {
            converted = false;
            break;
        }
        else if (values) values.push(value);
        else inputArray[i] = value;
    }

    return converted;
};


export function roundToNearestMultiple(num, multiple)
{
    return Math.round(num / multiple) * multiple;
}


export function getNearestValue(value, array)
{
    var nearestValue = array[0];
    var delta = Math.abs(value - array[0]);

    for (var i=1; i < array.length; i++)
    {
        if (Math.abs(value - array[i]) < delta)
        {
            nearestValue = array[i];
            delta = Math.abs(value - array[i]);
        }
    }

    return nearestValue;
}

