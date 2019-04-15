/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */
import {Smooth} from './smooth-0.1.7.js';
import {graphUtils} from './graph_utils.js';
import {jsContextFactory} from './js_context.js';
import {
    getNearestValue,
    roundToNearestMultiple,
    parseFloats,
    isFloat,
    createSvgElement,
    setAttributes
} from './utils.js';


function getFloatValueFromArgs(args, argName, defaultValue)
{
    var value = 1.0;
    if (defaultValue === undefined) defaultValue = 1.0;

    if (args.hasOwnProperty(argName))
    {
        value = parseFloat(args[argName][0]);
        value = Number.isNaN(value) ? defaultValue : value;
    }
    else
    {
        value = defaultValue;
    }

    return value;
}


function parseTransformArg(arg)
{
    var result = "";
    var transform = "";
    var parameters = [];
    var parts = arg.split(/\s+/);

    var appendTransform = () => {
        if ((transform !== "") && (parameters.length > 0))
        {
            result += transform + "(" + parameters.join(',') + ") ";
        }
    };

    for (var i=0; i < parts.length; i++)
    {
        var part = parts[i];

        if (Number.isNaN(parseFloat(part)))
        {
            appendTransform();
            transform = "";
            parameters = [];

            if (part == 's') transform = "scale";
            else if (part == 'r') transform = "rotate";
            else if (part == 't') transform = "translate";
        }
        else
        {
            parameters.push(part);
        }
    }

    appendTransform();
    return result;
}


function extractAttributesFromArgs(args, params)
{
    var attributes = {};

    for (var argName in args)
    {
        if (params.hasOwnProperty(argName))
        {
            var param = params[argName];
            if (param.isAttribute)
            {
                attributes[param.name] = args[argName].join(" ");
            }
        }
    }

    return attributes;
}


function getTransformedUrl(url)
{
    if (url.startsWith("@"))
    {
        var key = url.substring(1);

        url = urlMap.hasOwnProperty(key) ?
              urlMap[key] : "#";
    }

    return url;
}


export const commands = {};

commands['init'] = {};
commands['init'].params =
{
    w: {name: "width", numValues: 1, isAttribute: true},
    h: {name: "height", numValues: 1, isAttribute: true},
    r: {name: "range", numValues: 4, isAttribute: false},
    bo: {name: "border", numValues: 1, isAttribute: false},
    pad: {name: "padding", numValues: 1, isAttribute: false},
    fss: {name: "font-and-stroke-scale", numValues: 1, isAttribute: false}
};
commands['init'].createInstance = function(cg, args)
{
    if (args.hasOwnProperty('r')) cg.graphRange.update(args['r']);

    var attributes = extractAttributesFromArgs(args, this.params);

    if (!attributes.hasOwnProperty('width') &&
        !attributes.hasOwnProperty('height'))
    {
        attributes['width'] = "30em";
    }

    if ( attributes.hasOwnProperty('width') &&
        !attributes.hasOwnProperty('height'))
    {
        /*
         * If only the width is defined, then set
         * the height so that the width to height
         * ratio matches that of the graph range.
         */

        let match = attributes['width'].match(/^((?:[0-9]*[.])?[0-9]+)(\D*)$/);
        if (match)
        {
            let value = parseFloat(match[1]);
            if (!Number.isNaN(value))
            {
                let height = value * (cg.graphRange.yrange / cg.graphRange.xrange);
                attributes['height'] = height.toString();
                if (match.length == 3) attributes['height'] += match[2];
            }
        }
    }
    else if (!attributes.hasOwnProperty('width') &&
              attributes.hasOwnProperty('height'))
    {
        /*
         * If only the height is defined, then set
         * the width so that the width to height
         * ratio matches that of the graph range.
         */

        let match = attributes['height'].match(/^((?:[0-9]*[.])?[0-9]+)(\D*)$/);
        if (match)
        {
            let value = parseFloat(match[1]);
            if (!Number.isNaN(value))
            {
                let width = value * (cg.graphRange.xrange / cg.graphRange.yrange);
                attributes['width'] = width.toString();
                if (match.length == 3) attributes['width'] += match[2];
            }
        }
    }

    var style = "";

    if (args.hasOwnProperty('bo'))
    {
        var border = args['bo'][0];
        if (/^([0-9]*[.])?[0-9]+$/.test(border))
        {
            border += "px solid #00000033";
        }

        style += `border:${border};`;
    }

    if (args.hasOwnProperty('pad'))
    {
        var padding = args['pad'][0];
        if (/^([0-9]*[.])?[0-9]+$/.test(padding))
        {
            padding += "px";
        }

        style += `padding:${padding};`;
    }

    if (style != "")
    {
        attributes['style'] = style;
    }

    var scale = 1.0;
    if (args.hasOwnProperty('fss')) scale = args['fss'][0];

    /*
     * Width, height and graphRange must be set before
     * initRootElements so that initRootElements can
     * compute the scale properly when using uniform scaling.
     */
    cg.initRootElements(attributes, scale);

    return {
        name: 'init',
        scriptInterface:
        {
            get w() { return attributes['width']; },
            get h() { return attributes['height']; },
            get fss() { return cg.getScale(); },
        },
        render: ()=>{}
    };
};


commands['point'] = {};
commands['point'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "point", numValues: 2, isAttribute: false},
    r: {name: "r", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['point'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('circle', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let x = 0;
    let y = 0;

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        x = args['p'][0];
        y = args['p'][1];
    }

    attributes['cx'] = x;
    attributes['cy'] = y;

    if (!attributes.hasOwnProperty('stroke-width')) attributes['stroke-width'] = 0;
    if (!attributes.hasOwnProperty('fill')) attributes['fill'] = "#000";

    if (!attributes.hasOwnProperty('r')) attributes['r'] = 3 * cg.getScale();
    else
    {
        let radius = parseFloat(attributes['r']);
        if (!Number.isNaN(radius)) radius *= cg.getScale();
        attributes['r'] = radius;
    }

    setAttributes(newElement, attributes);

    let point = new graphUtils.Point(x, y);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get p() { return point; } },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['points'] = {};
commands['points'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "points", numValues: 1, isAttribute: false},
    r: {name: "r", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['points'].createInstance = function(cg, args)
{
    var attributes = extractAttributesFromArgs(args, this.params);

    if (!attributes.hasOwnProperty('stroke-width')) attributes['stroke-width'] = 0;
    if (!attributes.hasOwnProperty('fill')) attributes['fill'] = "#000";

    if (!attributes.hasOwnProperty('r')) attributes['r'] = 3 * cg.getScale();
    else
    {
        let radius = parseFloat(attributes['r']);
        if (!Number.isNaN(radius)) radius *= cg.getScale();
        attributes['r'] = radius;
    }

    let points = [];
    let elements = [];

    if (args.hasOwnProperty('p'))
    {
        let values = args['p'][0].replace(/[^0-9.-]+/g, " ");
        values = values.split(/\s+/);
        if (values.length % 2 == 1) values.pop();
        values = values.map(value => parseFloat(value));

        for (let i=0; i < values.length; i=i+2)
        {
            if (!Number.isNaN(values[i]) && !Number.isNaN(values[i+1]))
            {
                attributes['cx'] = parseFloat(values[i]);
                attributes['cy'] = parseFloat(values[i+1]);

                points.push(new graphUtils.Point(attributes['cx'], attributes['cy']));

                let newElement = createSvgElement('circle', true);
                setAttributes(newElement, attributes);

                elements.push(newElement);
            }
        }
    }

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get p() { return points; } },
        render: () => { elements.forEach(e => cg.appendElement(e)); }
    };
};


commands['circle'] = {};
commands['circle'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    c: {name: "center-point", numValues: 2, isAttribute: false},
    r: {name: "r", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['circle'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('circle', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let cx = 0;
    let cy = 0;

    if (args.hasOwnProperty('c') && parseFloats(args['c']))
    {
        cx = args['c'][0];
        cy = args['c'][1];
    }

    attributes['cx'] = cx;
    attributes['cy'] = cy;

    setAttributes(newElement, attributes);

    let centerPoint = new graphUtils.Point(cx, cy);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get c() { return centerPoint; } },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['ellipse'] = {};
commands['ellipse'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    c: {name: "center-point", numValues: 2, isAttribute: false},
    rx: {name: "rx", numValues: 1, isAttribute: true},
    ry: {name: "ry", numValues: 1, isAttribute: true},
    p: {name: "points", numValues: 4, isAttribute: false},
    b: {name: "bounds", numValues: 4, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['ellipse'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('ellipse', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let cx = 0;
    let cy = 0;

    if (args.hasOwnProperty('c') && parseFloats(args['c']))
    {
        cx = args['c'][0];
        cy = args['c'][1];
    }

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        let [x1, y1, x2, y2] = args['p'];

        cx = ((x2 - x1) / 2.0) + x1;
        cy = ((y2 - y1) / 2.0) + y1;

        attributes['rx'] = Math.abs(x2 - x1) / 2.0;
        attributes['ry'] = Math.abs(y2 - y1) / 2.0;
    }

    if (args.hasOwnProperty('b') && parseFloats(args['b']))
    {
        let [x, y, width, height] = args['b'];

        width = Math.max(width, 0);
        height = Math.max(height, 0);

        cx = x + (width / 2);
        cy = y + (height / 2);

        attributes['rx'] = width / 2;
        attributes['ry'] = height / 2;
    }

    attributes.cx = cx;
    attributes.cy = cy;

    setAttributes(newElement, attributes);

    let center = new graphUtils.Point(cx, cy);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get c() { return center; } },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['line'] = {};
commands['line'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "points", numValues: 4, isAttribute: false},
    p1: {name: "point1", numValues: 2, isAttribute: false},
    p2: {name: "point2", numValues: 2, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    ms: {name: "marker-start", numValues: 1, isAttribute: false},
    me: {name: "marker-end", numValues: 1, isAttribute: false},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['line'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('line', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let x1 = 0;
    let y1 = 0;
    let x2 = 1;
    let y2 = 1;

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        x1 = args['p'][0];
        y1 = args['p'][1];
        x2 = args['p'][2];
        y2 = args['p'][3];
    }

    if (args.hasOwnProperty('p1') && parseFloats(args['p1']))
    {
        x1 = args['p1'][0];
        y1 = args['p1'][1];
    }

    if (args.hasOwnProperty('p2') && parseFloats(args['p2']))
    {
        x2 = args['p2'][0];
        y2 = args['p2'][1];
    }

    attributes['x1'] = x1;
    attributes['y1'] = y1;
    attributes['x2'] = x2;
    attributes['y2'] = y2;

    if (args.hasOwnProperty('me') && (args['me'][0] == 'arrow'))
    {
        attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;
    }

    if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
    {
        attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
    }

    setAttributes(newElement, attributes);

    let p1 = new graphUtils.Point(x1, y1);
    let p2 = new graphUtils.Point(x2, y2);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface:
        {
            get p1() { return p1; },
            get p2() { return p2; },
        },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['text'] = {};
commands['text'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "point", numValues: 2, isAttribute: false},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fs: {name: "font-size", numValues: 1, isAttribute: true},
    ff: {name: "font-family", numValues: 1, isAttribute: true},
    ha: {name: "horizontal-alignment", numValues: 1, isAttribute: false},
    t: {name: "text", numValues: 1, isAttribute: false},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['text'].createInstance = function(cg, args)
{
    var text = args.hasOwnProperty('t') ? args['t'][0] : "";

    var newElement = createSvgElement('text', true, text);
    var attributes = extractAttributesFromArgs(args, this.params);

    var x = 0;
    var y = 0;

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        [x, y] = args['p'];
    }

    if (args.hasOwnProperty('ha'))
    {
        let ha = args['ha'][0];
        if ((ha == 'c') || (ha == 'center')) attributes['text-anchor'] = 'middle';
        else if ((ha == 'l') || (ha == 'left')) attributes['text-anchor'] = 'start';
        else if ((ha == 'r') || (ha == 'right')) attributes['text-anchor'] = 'end';
    }

    attributes['transform'] = `translate(${x},${y}) scale(${cg.getScale()}, ${-1 * cg.getScale()})`;
    attributes['x'] = 0;
    attributes['y'] = 0;
    setAttributes(newElement, attributes);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get t() { return text; } },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['g'] = {};
commands['g'].params =
{
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    fs: {name: "font-size", numValues: 1, isAttribute: true},
    ff: {name: "font-family", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true},
    xf: {name: "transform", numValues: 1, isAttribute: false},
    id: {name: "id", numValues: 1, isAttribute: false}
};
commands['g'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('g', {});
    var attributes = extractAttributesFromArgs(args, this.params);

    if (args.hasOwnProperty('id'))
    {
        attributes['id'] = cg.getId(args['id'][0]);
    }

    if (args.hasOwnProperty('xf'))
    {
        var transform = parseTransformArg(args['xf'][0]);
        if (transform.length > 0)
        {
            attributes['transform'] = transform;
        }
    }

    setAttributes(newElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(newElement, true); }
    };
};


commands['endg'] = {};
commands['endg'].params = {};
commands['endg'].createInstance = function(cg, args)
{
    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.popParentElement(); }
    };
};


commands['clone'] = {};
commands['clone'].params =
{
    id: {name: "id", numValues: 1, isAttribute: false},
    x: {name: "x", numValues: 1, isAttribute: true},
    y: {name: "y", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    /*
     * stroke-width does not work with g elements as the
     * root element to clone because the g elements already
     * have the stroke-width defined on them.
     */
    //sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    fs: {name: "font-size", numValues: 1, isAttribute: true},
    ff: {name: "font-family", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true},
    xf: {name: "transform", numValues: 1, isAttribute: false}
};
commands['clone'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('use', {});
    var attributes = extractAttributesFromArgs(args, this.params);

    if (args.hasOwnProperty('id'))
    {
        attributes['xlink:href'] = '#' + cg.getId(args['id'][0]);
    }

    if (args.hasOwnProperty('xf'))
    {
        var transform = parseTransformArg(args['xf'][0]);
        if (transform.length > 0)
        {
            attributes['transform'] = transform;
        }
    }

    setAttributes(newElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(newElement, true); }
    };
};


commands['path'] = {};
commands['path'].params =
{
    d: {name: "d", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    ms: {name: "marker-start", numValues: 1, isAttribute: false},
    me: {name: "marker-end", numValues: 1, isAttribute: false},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['path'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('path', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    if (args.hasOwnProperty('me') && (args['me'][0] == 'arrow'))
    {
        attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;
    }

    if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
    {
        attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
    }

    setAttributes(newElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(newElement); }
    };
};


commands['rect'] = {};
commands['rect'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    b: {name: "bounds", numValues: 4, isAttribute: false},
    x: {name: "x", numValues: 1, isAttribute: true},
    y: {name: "y", numValues: 1, isAttribute: true},
    w: {name: "width", numValues: 1, isAttribute: true},
    h: {name: "height", numValues: 1, isAttribute: true},
    cr: {name: "corner-radius", numValues: 1, isAttribute: false},
    rx: {name: "rx", numValues: 1, isAttribute: true},
    ry: {name: "ry", numValues: 1, isAttribute: true},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['rect'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('rect', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let x = 0;
    let y = 0;
    let width = 10;
    let height = 10;

    if (args.hasOwnProperty('b') && parseFloats(args['b']))
    {
        x = args['b'][0];
        y = args['b'][1];
        width = args['b'][2];
        height = args['b'][3];
    }

    attributes['x'] = x;
    attributes['y'] = y;
    attributes['width'] = width;
    attributes['height'] = height;

    if (args.hasOwnProperty('cr'))
    {
        attributes['rx'] = args['cr'][0];
        attributes['ry'] = args['cr'][0];
    }

    setAttributes(newElement, attributes);

    let bounds = new graphUtils.Bounds(x, y, width, height);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface: { get b() { return bounds; } },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['arrow'] = {};
commands['arrow'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "points", numValues: 4, isAttribute: false},
    p1: {name: "point1", numValues: 2, isAttribute: false},
    p2: {name: "point2", numValues: 2, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    ms: {name: "marker-start", numValues: 1, isAttribute: false},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['arrow'].createInstance = function(cg, args)
{
    var newElement = createSvgElement('line', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    let x1 = 0;
    let y1 = 0;
    let x2 = 1;
    let y2 = 1;

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        x1 = args['p'][0];
        y1 = args['p'][1];

        x2 = args['p'][2];
        y2 = args['p'][3];
    }

    if (args.hasOwnProperty('p1') && parseFloats(args['p1']))
    {
        x1 = args['p1'][0];
        y1 = args['p1'][1];
    }

    if (args.hasOwnProperty('p2') && parseFloats(args['p2']))
    {
        x2 = args['p2'][0];
        y2 = args['p2'][1];
    }

    attributes.x1 = x1;
    attributes.y1 = y1;

    attributes.x2 = x2;
    attributes.y2 = y2;

    if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
    {
        attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
    }

    attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;

    setAttributes(newElement, attributes);

    let p1 = new graphUtils.Point(x1, y1);
    let p2 = new graphUtils.Point(x2, y2);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface:
        {
            get p1() { return p1; },
            get p2() { return p2; },
        },
        render: () => { cg.appendElement(newElement); }
    };
};


commands['func'] = {};
commands['func'].params =
{
    fn: {name: "func", numValues: 1, isAttribute: false},
    r: {name: "range", numValues: 3, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['func'].createInstance = function(cg, args)
{
    let newElement = null;
    let attributes = extractAttributesFromArgs(args, this.params);

    if (args.hasOwnProperty('fn') &&
        args.hasOwnProperty('r') &&
        parseFloats(args['r']))
    {
        newElement = createSvgElement('path', true);

        let funcString = args['fn'][0];

        let [xStart, xEnd, xDivisions] = args['r'];
        let xIncrement = (xEnd - xStart) / xDivisions;

        let code = `
            let result = "";
            let func = ${funcString};
            let x = ${xStart};
            for (let i=0; i < ${xDivisions}; i++)
            {
                result += "L " +
                           (M.round(x * 1000) / 1000) + " " +
                           (M.round(func(x) * 1000) / 1000) + " ";

                x += ${xIncrement};
            }
            return result;
        `;

        let jsContext = jsContextFactory.newContext();

        let d = jsContext.execute(code);
        d = d.replace("L", "M");
        attributes['d'] = d;

        setAttributes(newElement, attributes);
    }

    return {
        name: null,
        scriptInterface: null,
        render: () => { if (newElement) cg.appendElement(newElement); }
    };
};


commands['triangle'] = {};
commands['triangle'].params =
{
    id: {name: "name", numValues: 1, isAttribute: false},
    p: {name: "points", numValues: 6, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true},
    a1: {name: "angle1-type", numValues: 1, isAttribute: false},
    a2: {name: "angle2-type", numValues: 1, isAttribute: false},
    a3: {name: "angle3-type", numValues: 1, isAttribute: false},
    a1s: {name: "angle1-scale", numValues: 1, isAttribute: false},
    a2s: {name: "angle2-scale", numValues: 1, isAttribute: false},
    a3s: {name: "angle3-scale", numValues: 1, isAttribute: false}
};
commands['triangle'].createInstance = function(cg, args)
{
    let newElement = createSvgElement('path', true);
    let attributes = extractAttributesFromArgs(args, this.params);

    let p1 = [0, 0];
    let p2 = [1, 0];
    let p3 = [1, 1];

    if (args.hasOwnProperty('p') && parseFloats(args['p']))
    {
        p1 = [args['p'][0], args['p'][1]];
        p2 = [args['p'][2], args['p'][3]];
        p3 = [args['p'][4], args['p'][5]];
    }

    let d = "";
    d += `M ${p1[0]} ${p1[1]} `;
    d += `L ${p2[0]} ${p2[1]} `;
    d += `L ${p3[0]} ${p3[1]} Z`;

    attributes['d'] = d;
    setAttributes(newElement, attributes);

    let point1 = new graphUtils.Point(p1[0], p1[1]);
    let point2 = new graphUtils.Point(p2[0], p2[1]);
    let point3 = new graphUtils.Point(p3[0], p3[1]);

    return {
        name: args.hasOwnProperty('id') ? args['id'][0] : null,
        scriptInterface:
        {
            get p1() { return point1; },
            get p2() { return point2; },
            get p3() { return point3; },
        },
        render: () => {
            if (args.hasOwnProperty('a1'))
            {
                var scale = getFloatValueFromArgs(args, 'a1s', 1.0);
                cg.drawAngleMarkers([p3, p1, p2], args['a1'][0], scale);
            }

            if (args.hasOwnProperty('a2'))
            {
                var scale = getFloatValueFromArgs(args, 'a2s', 1.0);
                cg.drawAngleMarkers([p1, p2, p3], args['a2'][0], scale);
            }

            if (args.hasOwnProperty('a3'))
            {
                var scale = getFloatValueFromArgs(args, 'a3s', 1.0);
                cg.drawAngleMarkers([p2, p3, p1], args['a3'][0], scale);
            }

            cg.appendElement(newElement);
        }
    };
};


commands['mtext'] = {};
commands['mtext'].params =
{
    b: {name: "bounds", numValues: 4, isAttribute: false},
    t: {name: "text", numValues: 1, isAttribute: false},
    f: {name: "fill", numValues: 1, isAttribute: false},
    or: {name: "origin", numValues: 1, isAttribute: false},
    fs: {name: "font-size", numValues: 1, isAttribute: false},
    ff: {name: "font-family", numValues: 1, isAttribute: false},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true}
};
commands['mtext'].createInstance = function(cg, args, options)
{
    if (!args.hasOwnProperty('t') ||
        !args.hasOwnProperty('b') ||
        !parseFloats(args['b'])) return;

    if (!args.hasOwnProperty('fs'))
    {
        /*
         * Force a font size because it
         * doesn't seem to work without it.
         */
        args['fs'] = [options.defaultFontSize.toString()];
    }

    var foreignObjectElement = createSvgElement('foreignObject', true);
    var attributes = extractAttributesFromArgs(args, this.params);

    const [x,  y, width, height] = args['b'];

    const cgScale = cg.getScale();

    attributes['transform'] = `translate(${x},${y}) scale(${cgScale}, ${-1 * cgScale})`;
    attributes['x'] = 0;
    attributes['y'] = 0;
    attributes['width'] = width / cgScale;
    attributes['height'] = height / cgScale;

    setAttributes(foreignObjectElement, attributes);

    var divElement = document.createElement("div");
    attributes = {xmlns: "http://www.w3.org/1999/xhtml", class: "cgraph-mtext"};
    var style = "";
    if (args.hasOwnProperty('f')) style += "color: " + args['f'][0] + ";";
    if (args.hasOwnProperty('fs')) style += "font-size: " + args['fs'][0] + "px;";
    if (args.hasOwnProperty('ff')) style += "font-family: " + args['ff'][0] + ";";
    if (style.length > 0) attributes['style'] = style;
    setAttributes(divElement, attributes);

    var textNode = document.createTextNode(args['t'][0]);
    divElement.appendChild(textNode);

    foreignObjectElement.appendChild(divElement);

    return {
        name: null,
        scriptInterface: null,
        render: () => {
            if (args.hasOwnProperty('or') && (args['or'][0] == "1"))
            {
                let xfString = 'translate(0,' + height + ')';
                let gElement = createSvgElement('g', {transform: xfString});

                gElement.appendChild(foreignObjectElement);
                cg.appendElement(gElement);
            }
            else
            {
                cg.appendElement(foreignObjectElement);
            }
        }
    };
};


commands['setblob'] = {};
commands['setblob'].params =
{
    b: {name: "bounds", numValues: 4, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['setblob'].createInstance = function(cg, args)
{
    if (!args.hasOwnProperty('b') || !parseFloats(args['b'])) return;

    let pathElement = createSvgElement('path', true);

    let [x, y, width, height] = args['b'];

    let xScale = width;
    let yScale = height * -1; // -1 fixes reflection since path made in inkscape

    let normalizedPath = ["M", 0.122,-0.025, "c", 0.125,0.078, 0.26418756,-0.1286, 0.359375,-0.1483,
                            0.0951874,-0.02, 0.12485026,-0.013, 0.1875,-0.015, 0.0715575,0,
                            0.14060527,0.033, 0.21484375,0, 0.0742385,-0.037, 0.11248371,-0.2177,
                            0.11328125,-0.3359, 8.309e-4,-0.1231, -0.005618,-0.2918, -0.1132813,-0.3515,
                            -0.070459,-0.039, -0.15384225,0.061, -0.234375,0.059, -0.0572379,0,
                            -0.1329614,-0.022, -0.1640625,-0.051, -0.0311011,-0.028, -0.16031744,-0.1421,
                            -0.25195312,-0.1234, -0.0633524,0.013, -0.10946441,0.084, -0.12695313,0.1466,
                            -0.02023706,0.072, 0.0164456,0.099, 0.037029,0.2214, 0.0142044,0.084,
                            -2.2235e-4,0.1491, -0.05107605,0.1946, -0.0508537,0.046, -0.18225377,0.271,
                            0.0296721,0.4034, "z"];

    let pathDString = "";
    for (let i=0; i < normalizedPath.length; i++)
    {
        if (typeof(normalizedPath[i]) === "string")
        {
            pathDString += normalizedPath[i];
        }
        else if (typeof(normalizedPath[i]) === "number")
        {
            pathDString += (normalizedPath[i] * xScale) + " ";
            pathDString += (normalizedPath[i+1] * yScale);
            i++;
        }

        pathDString += " ";
    }


    let attributes = extractAttributesFromArgs(args, this.params);
    attributes['d'] = pathDString;
    setAttributes(pathElement, attributes);

    let gElement = createSvgElement('g', {transform: `translate(${x},${y})`});
    gElement.appendChild(pathElement);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(gElement); }
    };
};


commands['grid'] = {};
commands['grid'].params =
{
    r: {name: "range", numValues: 4, isAttribute: false},
    sp: {name: "spacing", numValues: 2, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['grid'].createInstance = function(cg, args)
{
    var xMin = cg.graphRange.xmin;
    var yMin = cg.graphRange.ymin;
    var xMax = cg.graphRange.xmax;
    var yMax = cg.graphRange.ymax;

    if (args.hasOwnProperty('r') && parseFloats(args['r']))
    {
        [xMin, yMin, xMax, yMax] = args['r'];
    }

    var xSpacing = 10;
    var ySpacing = 10;

    if (args.hasOwnProperty('sp') && parseFloats(args['sp']))
    {
        [xSpacing, ySpacing] = args['sp'];
    }
    else
    {
        /*
         * Default spacing divides up the full
         * range in to common divisions.
         */
        var defaultSpacings = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100];

        var xSpacing = getNearestValue((xMax - xMin) / 10.0, defaultSpacings);
        var ySpacing = getNearestValue((yMax - yMin) / 10.0, defaultSpacings);
    }

    let xStart = roundToNearestMultiple(xMin, xSpacing);
    let yStart = roundToNearestMultiple(yMin, ySpacing);

    var pathDString = "";

    for (var x=xStart; x <= xMax; x += xSpacing)
    {
        pathDString += `M ${x} ${yMin} V ${yMax} `;
    }

    for (var y=yStart; y <= yMax; y += ySpacing)
    {
        pathDString += `M ${xMin} ${y} H ${xMax} `;
    }

    var attributes = extractAttributesFromArgs(args, this.params);
    attributes['d'] = pathDString;

    if (!args.hasOwnProperty('sw')) attributes['stroke-width'] = "0.5";
    if (!args.hasOwnProperty('so')) attributes['stroke-opacity'] = "0.2";

    var pathElement = createSvgElement('path', true);

    setAttributes(pathElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(pathElement); }
    };
};


commands['axis'] = {};
commands['axis'].params =
{
    r: {name: "range", numValues: 4, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['axis'].createInstance = function(cg, args)
{
    var xMin = cg.graphRange.xmin;
    var yMin = cg.graphRange.ymin;
    var xMax = cg.graphRange.xmax;
    var yMax = cg.graphRange.ymax;

    if (args.hasOwnProperty('r') && parseFloats(args['r']))
    {
        [xMin, yMin, xMax, yMax] = args['r'];
    }

    var attributes = extractAttributesFromArgs(args, this.params);
    attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
    attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;

    if (!args.hasOwnProperty('sw')) attributes['stroke-width'] = "1";
    if (!args.hasOwnProperty('so')) attributes['stroke-opacity'] = "0.6";

    let xPathElement = createSvgElement('path', true);

    attributes['d'] = `M ${xMin} 0 H ${xMax}`;
    setAttributes(xPathElement, attributes);

    let yPathElement = createSvgElement('path', true);

    attributes['d'] = `M 0 ${yMin} V ${yMax}`;
    setAttributes(yPathElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => {
            cg.appendElement(xPathElement);
            cg.appendElement(yPathElement);
        }
    };
};


commands['brace'] = {};
commands['brace'].params =
{
    p: {name: "points", numValues: 6, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['brace'].createInstance = function(cg, args)
{
    /*
     * The points argument is a list of three points. The first
     * two points are the for the baseline end points. The last
     * point (or third point) is the point for the arrow tip.
     */

    if (!args.hasOwnProperty('p') || !parseFloats(args['p'])) return;

    var p1 = {x: args['p'][0], y: args['p'][1]};
    var p2 = {x: args['p'][2], y: args['p'][3]};
    var p3 = {x: args['p'][4], y: args['p'][5]};

    /*
     * Get the equation of the baseline.
     */

    var delta = p2.x - p1.x;
    if (delta == 0) delta = 0.000001;

    var baseLineSlope = (p2.y - p1.y) / delta;
    if (baseLineSlope == 0) baseLineSlope = 0.000001;

    var baseLineYIntercept = p1.y - (baseLineSlope * p1.x);

    /*
     * Get the equation of the line running through
     * p3 which is perpendicular to the baseline.
     */

    var perpLineSlope = (1 / baseLineSlope) * -1; // negative reciprocal
    var perpLineYIntercept = p3.y - (perpLineSlope * p3.x);

    /*
     * Get the point where the baseLine and perpLine meet
     * by setting the two line equations equal to each other
     * and solving for x. Then substitute the x back in to
     * the baseline equation to get y.
     */

    var p4 = {};

    delta = (baseLineSlope - perpLineSlope);
    if (delta == 0) delta = 0.000001;
    p4.x = (perpLineYIntercept - baseLineYIntercept) / delta;
    p4.y = (baseLineSlope * p4.x) + baseLineYIntercept;

    /*
     * Get the point inbetween p3 and p4.
     */

    var perpMidPoint = {x: ((p4.x - p3.x) / 2) + p3.x, y: ((p4.y - p3.y) / 2) + p3.y};

    /*
     * Get the two points which are perpendicular to the baseline
     * and run through p1 and p2 in the same direction as p3.
     */

    var xDelta = perpMidPoint.x - p4.x;
    var yDelta = perpMidPoint.y - p4.y;

    var p1MidPoint = {x: p1.x + xDelta, y: p1.y + yDelta};
    var p2MidPoint = {x: p2.x + xDelta, y: p2.y + yDelta};

    /*
     * Get a unit vector pointing from p1 to p2.
     */

    var p1p2 = {x: p2.x - p1.x, y: p2.y - p1.y};
    var p1p2Length = Math.hypot(p1p2.x, p1p2.y);
    var p1p2Unit = {x: p1p2.x / p1p2Length, y: p1p2.y / p1p2Length};

    /*
     * Scale the p1p2 unit vector to the same length as
     * the length of (p3 - perpMidPoint) or (p1MidPoint - p1), etc...
     * The lengths are all the same. This is done so that quadratic
     * curve is the most round.
     */

    var length = Math.hypot(p1MidPoint.x - p1.x, p1MidPoint.y - p1.y);
    var deltaVec = {x: p1p2Unit.x * length, y: p1p2Unit.y * length};

    /*
     * Get the remaining points required for the curve using the deltaVec.
     * Move in the direction from p1MidPoint to p2MidPoint. Note, all the
     * remaining points lie on the line between p1MidPoint and p2MidPoint.
     */

    var p5 = {x: p1MidPoint.x + deltaVec.x, y: p1MidPoint.y + deltaVec.y};
    var p6 = {x: perpMidPoint.x - deltaVec.x, y: perpMidPoint.y - deltaVec.y};
    var p7 = {x: perpMidPoint.x + deltaVec.x, y: perpMidPoint.y + deltaVec.y};
    var p8 = {x: p2MidPoint.x - deltaVec.x, y: p2MidPoint.y - deltaVec.y};

    var pathString = "";
    pathString += `M ${p1.x} ${p1.y} Q ${p1MidPoint.x} ${p1MidPoint.y} ${p5.x} ${p5.y} `;
    pathString += `L ${p6.x} ${p6.y} Q ${perpMidPoint.x} ${perpMidPoint.y} ${p3.x} ${p3.y} `;
    pathString += `M ${p3.x} ${p3.y} Q ${perpMidPoint.x} ${perpMidPoint.y} ${p7.x} ${p7.y} `;
    pathString += `L ${p8.x} ${p8.y} Q ${p2MidPoint.x} ${p2MidPoint.y} ${p2.x} ${p2.y}`;

    var pathElement = createSvgElement('path', true);
    let attributes = extractAttributesFromArgs(args, this.params);
    attributes['d'] = pathString;
    setAttributes(pathElement, attributes);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.appendElement(pathElement); }
    };
};


commands['angle'] = {};
commands['angle'].params =
{
    p: {name: "points", numValues: 6, isAttribute: false},
    a: {name: "angle-type", numValues: 1, isAttribute: false},
    as: {name: "angle-scale", numValues: 1, isAttribute: false},
};
commands['angle'].createInstance = function(cg, args)
{
    if (!args.hasOwnProperty('p') || !parseFloats(args['p']) ||
        !args.hasOwnProperty('a')) return;

    var p1 = [args['p'][0], args['p'][1]];
    var p2 = [args['p'][2], args['p'][3]];
    var p3 = [args['p'][4], args['p'][5]];

    var scale = getFloatValueFromArgs(args, 'as', 1.0);

    return {
        name: null,
        scriptInterface: null,
        render: () => { cg.drawAngleMarkers([p1, p2, p3], args['a'][0], scale); }
    };
};


commands['curve'] = {};
commands['curve'].params =
{
    p: {name: "points", numValues: 1, isAttribute: false},
    d: {name: "divisions", numValues: 1, isAttribute: false},
    ms: {name: "marker-start", numValues: 1, isAttribute: false},
    me: {name: "marker-end", numValues: 1, isAttribute: false},
    sc: {name: "stroke", numValues: 1, isAttribute: true},
    sw: {name: "stroke-width", numValues: 1, isAttribute: true},
    so: {name: "stroke-opacity", numValues: 1, isAttribute: true},
    sda: {name: "stroke-dasharray", numValues: 1, isAttribute: true},
    f: {name: "fill", numValues: 1, isAttribute: true},
    fo: {name: "fill-opacity", numValues: 1, isAttribute: true},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['curve'].createInstance = function(cg, args)
{
    let newElement = null;

    let showPoints = false;
    let pointElements = [];

    if (!args.hasOwnProperty('p')) return;

    var values = args['p'][0].trimStart();
    if (values.startsWith('?')) showPoints = true;

    values = values.replace(/[^0-9.-]+/g, " ").trim();
    values = values.split(/\s+/);

    if (values.length % 2 == 1) values.pop();
    values = values.map((value) => parseFloat(value));

    var points = [];

    for (var i=0; i < values.length; i=i+2)
    {
        if (Number.isNaN(values[i]) || Number.isNaN(values[i+1])) return;
        else points.push([values[i], values[i+1]]);
    }

    if (points.length >= 2)
    {
        var curve = Smooth(points, {
            method: Smooth.METHOD_CUBIC, 
            clip: Smooth.CLIP_CLAMP, 
            cubicTension: Smooth.CUBIC_TENSION_CATMULL_ROM
        });

        var divisions = 50;

        if (args.hasOwnProperty('d') && isFloat(args['d']))
        {
            divisions = parseFloat(args['d'][0]);
        }

        var point;

        var increment = points.length / divisions;
        var d = `M ${points[0][0]} ${points[0][1]} `;

        for (i=increment; i < (points.length-1); i+=increment)
        {
            point = curve(i);
            d += `L ${point[0]} ${point[1]} `;
        }

        point = points[points.length - 1];
        d += `L ${point[0]} ${point[1]}`;

        newElement = createSvgElement('path', true);

        var attributes = extractAttributesFromArgs(args, this.params);
        attributes['d'] = d;

        if (args.hasOwnProperty('me') && (args['me'][0] == 'arrow'))
        {
            attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;
        }

        if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
        {
            attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
        }

        setAttributes(newElement, attributes);

        if (showPoints)
        {
            let attributes =
            {
                cx: 0,
                cy: 0,
                r: 3 * cg.getScale(),
                'stroke-width': 0,
                fill: "#000"
            };

            for (let i=0; i < points.length; i++)
            {
                attributes.cx = points[i][0];
                attributes.cy = points[i][1];

                let pointElement = createSvgElement('circle', attributes);
                pointElements.push(pointElement);
            }
        }
    }

    return {
        name: null,
        scriptInterface: null,
        render: () => {
            if (newElement)
            {
                cg.appendElement(newElement);
                pointElements.forEach(e => cg.appendElement(e));
            }
        }
    };
};


commands['image'] = {};
commands['image'].params =
{
    x: {name: "x", numValues: 1, isAttribute: false},
    y: {name: "y", numValues: 1, isAttribute: false},
    p: {name: "point", numValues: 2, isAttribute: false},
    w: {name: "width", numValues: 1, isAttribute: true},
    h: {name: "height", numValues: 1, isAttribute: true},
    url: {name: "xlink:href", numValues: 1, isAttribute: false},
    o: {name: "opacity", numValues: 1, isAttribute: true}
};
commands['image'].createInstance = function(cg, args)
{
    let newElement = null;

    if (args.hasOwnProperty('url'))
    {
        newElement = createSvgElement('image', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        var x = 0;
        var y = 0;

        if (args.hasOwnProperty('p') && parseFloats(args['p']))
        {
            [x, y] = args['p'];
        }

        if (args.hasOwnProperty('x') && parseFloats(args['x']))
        {
            x = args['x'][0];
        }

        if (args.hasOwnProperty('y') && parseFloats(args['y']))
        {
            y = args['y'][0];
        }

        attributes['xlink:href'] = getTransformedUrl(args['url'][0]);

        attributes['transform'] = `translate(${x},${y}) scale(1, -1)`;
        attributes['x'] = 0;
        attributes['y'] = 0;
        setAttributes(newElement, attributes);
    }

    return {
        name: null,
        scriptInterface: null,
        render: () => { if (newElement) cg.appendElement(newElement); }
    };
};

commands['img'] = {};
commands['img'].params = commands['image'].params;
commands['img'].createInstance = commands['image'].createInstance;

