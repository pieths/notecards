/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */
import {commands} from './command_lib.js';
import {parser} from './parser.js';
import {jsContextFactory} from './js_context.js';
import {roundToNearestMultiple, parseFloats, createSvgElement, setAttributes} from './utils.js';


const majorVersion = 1;
const minorVersion = 0;

var options =
{
    defaultStrokeWidth: 1,
    defaultFontSize: 16,
    test: true
};

var uniqueIdCounter = 0;

var urlMap = {};


function setUrlMap(map)
{
    if (typeof map == "object") urlMap = map;
}


function getUniqueId()
{
    return "cgraph_id_" + uniqueIdCounter++;
}


function logError(errorString)
{
    console.error("CGraph: Error: " + errorString);
};


const cache = (function() {

    var cache = null;
    var maxSize = 10;

    function enable(enableCache)
    {
        if (enableCache && !enabled())
        {
            cache = new Array();
        }
        else if (!enableCache)
        {
            cache = null;
        }
    }

    function enabled() { return cache !== null; }

    /*
     * NOTE: consider using a data-cache-id attribute for the
     * source element which would be used along with the text
     * to determine if the element is cached. This would fix
     * the issue where there are two or more identical source
     * texts on the same page and only the last one on the page
     * gets the result (because the cached element is reparented
     * each time a duplicate is found).
     * The id attribute can be placed there by the javascript
     * code and not the user to avoid having to type too much.
     */
    function get(key)
    {
        var result = null;

        if (cache != null)
        {
            var index = cache.findIndex(item => item.key == key);
            if (index >= 0) result = cache[index].rootNode;
        }

        return result;
    }

    function put(key, rootNode)
    {
        var index = cache.findIndex(item => item.key == key);
        if (index === -1)
        {
            cache.push({key: key, rootNode: rootNode});

            if (cache.length > maxSize)
            {
                cache.shift();
            }
        }
        else
        {
            let removed = cache.splice(index, 1);

            removed[0].rootNode = rootNode;
            cache.push(removed[0]);
        }
    }

    return {
        enable: function(enableCache) { enable(enableCache); },
        enabled: function() { return enabled(); },
        get: function(key) { return get(key); },
        put: function(key, rootNode) { put(key, rootNode); }
    };
})();


const GraphRange = (function() {
    function GraphRange()
    {
        this.xmin = -100;
        this.xmax =  100;
        this.ymin = -100;
        this.ymax =  100;
        this.xrange = 200;
        this.yrange = 200;

        this.update = function(inputValues)
        {
            var values = [];
            if (parseFloats(inputValues, values))
            {
                this.xmin = values[0];
                this.ymin = values[1];
                this.xmax = values[2];
                this.ymax = values[3];
            }

            if (this.xmin >= this.xmax)
            {
                this.xmin = -100;
                this.xmax =  100;
            }

            if (this.ymin >= this.ymax)
            {
                this.ymin = -100;
                this.ymax =  100;
            }

            this.xrange = this.xmax - this.xmin;
            this.yrange = this.ymax - this.ymin;
        }
    }

    return GraphRange;
})();


const interactionHandler = (function() {

    const CLICK_EVENT_TYPE = 'click';
    const MOUSE_DOWN_EVENT_TYPE = 'mousedown';
    const MOUSE_MOVE_EVENT_TYPE = 'mousemove';
    const MOUSE_UP_EVENT_TYPE = 'mouseup';
    const CONTEXT_MENU_EVENT_TYPE = 'contextmenu';

    var listeners = {};
    listeners[CLICK_EVENT_TYPE] = null;
    listeners[MOUSE_DOWN_EVENT_TYPE] = null;
    listeners[MOUSE_MOVE_EVENT_TYPE] = null;
    listeners[MOUSE_UP_EVENT_TYPE] = null;
    listeners[CONTEXT_MENU_EVENT_TYPE] = null;

    function attachEventHandlers(cg)
    {
        var trackingMouse = false;

        var pt = cg.createSVGPoint();

        var convertToPoint = evt => {
            pt.x = evt.clientX;
            pt.y = evt.clientY;

            // The cursor point, translated into svg coordinates
            var cursorpt =  pt.matrixTransform(cg.getTransformMatrix().inverse());

            var x = Math.round(cursorpt.x * 100.0) / 100.0;
            var y = Math.round(cursorpt.y * 100.0) / 100.0;
            return [x, y];
        };

        cg.addEventListener('click', function(evt) {
            evt.preventDefault();
            if (listeners[CLICK_EVENT_TYPE])
                listeners[CLICK_EVENT_TYPE](convertToPoint(evt));
        });

        cg.addEventListener('mousedown', function(evt) {
            if (evt.button == 0)
            {
                evt.preventDefault();
                if (listeners[MOUSE_DOWN_EVENT_TYPE])
                    listeners[MOUSE_DOWN_EVENT_TYPE](convertToPoint(evt));

                trackingMouse = true;
            }
        });

        cg.addEventListener('mouseup', function(evt) {
            if (evt.button == 0)
            {
                evt.preventDefault();
                if (listeners[MOUSE_UP_EVENT_TYPE])
                    listeners[MOUSE_UP_EVENT_TYPE](convertToPoint(evt));

                trackingMouse = false;
            }
        });

        cg.addEventListener('mousemove', function(evt) {
            evt.preventDefault();
            if (listeners[MOUSE_MOVE_EVENT_TYPE] && trackingMouse)
                listeners[MOUSE_MOVE_EVENT_TYPE](convertToPoint(evt));
        });

        cg.addEventListener('contextmenu', function(evt) {
            evt.preventDefault();
            if (listeners[CONTEXT_MENU_EVENT_TYPE])
                listeners[CONTEXT_MENU_EVENT_TYPE](convertToPoint(evt));
        });
    }

    function setEventListener(eventType, callback)
    {
        if (listeners.hasOwnProperty(eventType))
        {
            listeners[eventType] = callback;
        }
    }

    return {
        attachEventHandlers: function(cg)
        {
            attachEventHandlers(cg);
        },
        setEventListener: function(eventType, callback)
        {
            setEventListener(eventType, callback);
        }
    };
})();


function CGInstance()
{
    /*
     * A per graph prefix to be used for unique ids.
     */
    const idPrefix = getUniqueId() + "_";

    const arrowHeadStartMarkerId = getId("arrow_start");
    const arrowHeadEndMarkerId = getId("arrow_end");

    var _scale = 1.0; // TODO: should this be renamed

    const graphRange = new GraphRange();

    const svgElement = createSvgElement('svg', true);
    const parentElementStack = [svgElement];

    var useUniformScaling = false;
    var showUniformScale = false;

    const jsContext = jsContextFactory.newContext();


    function getId(suffix)
    {
        return idPrefix + suffix;
    }


    function appendDefaultMarkers(rootElement)
    {
        var defsElement = createSvgElement('defs', {});

        /*
         * Markers are defined so that their positive X axis gets
         * rotated to point along the direction the path travels.
         */

        var arrowHeadEndMarkerElement = createSvgElement('marker', {
            id: arrowHeadEndMarkerId, viewBox: "0 0 10 10",
            refX: 10, refY: 5, markerWidth: 6, markerHeight: 6,
            orient: 'auto', markerUnits: 'strokeWidth'
        });

        var pathElement = createSvgElement('path', {d: "M 0 0 L 10 4 L 10 6 L 0 10 z"});

        arrowHeadEndMarkerElement.appendChild(pathElement);
        defsElement.appendChild(arrowHeadEndMarkerElement);


        var arrowHeadStartMarkerElement = createSvgElement('marker', {
            id: arrowHeadStartMarkerId, viewBox: "0 0 10 10",
            refX: 0, refY: 5, markerWidth: 6, markerHeight: 6,
            orient: 'auto', markerUnits: 'strokeWidth'
        });

        pathElement = createSvgElement('path', {d: "M 10 0 L 0 4 L 0 6 L 10 10 z"});

        arrowHeadStartMarkerElement.appendChild(pathElement);
        defsElement.appendChild(arrowHeadStartMarkerElement);

        rootElement.appendChild(defsElement);
    }


    function appendElement(element, isNewParent)
    {
        var parentElement = parentElementStack[parentElementStack.length - 1];
        parentElement.appendChild(element);

        if (isNewParent && (element.tagName.toLowerCase() == 'g'))
        {
            /*
             * Make sure that the stroke-width attribute is explicitly
             * set so that the scaling which is applied works correctly.
             */

            var dataAttributeName = 'data-cgraph-prescaled-stroke-width';

            if (!element.hasAttribute('stroke-width'))
            {
                var value = (parentElement.hasAttribute(dataAttributeName)) ?
                             parentElement.getAttribute(dataAttributeName) :
                             options.defaultStrokeWidth.toString();

                element.setAttribute('stroke-width', value);
            }

            /*
             * Save the prescaled stroke width so that it can be referenced
             * by g elements which are children of this one.
             */
            element.setAttribute(dataAttributeName, element.getAttribute('stroke-width'));

            if (useUniformScaling && (parentElementStack.length == 1))
            {
                let ctm = element.getScreenCTM();
                _scale = 1.0 / Math.sqrt((ctm.a*ctm.a) + (ctm.b*ctm.b));

                if (showUniformScale)
                {
                    let textContent = 'CGraph: fss = ' + roundToNearestMultiple(_scale, 0.0001);

                    let scaleTextElement = document.createElement('div');
                    scaleTextElement.setAttribute('class', 'cgraph-uniform-scale-notification');
                    scaleTextElement.appendChild(document.createTextNode(textContent));

                    svgElement.parentElement.insertBefore(scaleTextElement, svgElement);
                }
            }

            parentElementStack.push(element);
        }


        if (element.hasAttribute('stroke-width'))
        {
            var strokeWidth = parseFloat(element.getAttribute('stroke-width'));
            strokeWidth *= _scale;
            element.setAttribute('stroke-width', strokeWidth);
        }
    }


    function setScale(scale)
    {
        if (scale === "u")
        {
            useUniformScaling = true;
        }
        else if (scale === "?")
        {
            useUniformScaling = true;
            showUniformScale = true;
        }
        else
        {
            if (typeof scale == "string")
            {
                scale = parseFloat(scale);
                if (!Number.isNaN(scale)) _scale = scale;
            }
            else if (typeof scale == "number")
            {
                _scale = scale;
            }

            useUniformScaling = false;
        }
    }


    function initRootElements(attributes, scale)
    {
        if (scale !== undefined) setScale(scale);

        setAttributes(svgElement, attributes);

        setAttributes(svgElement, {
            'viewBox': [0, 0, graphRange.xrange, graphRange.yrange].join(" "),
            'preserveAspectRatio': 'xMinYMin'
        });

        attributes =
        {
            'stroke': "#000",
            'stroke-opacity': "1",
            'stroke-width': options.defaultStrokeWidth.toString(),
            'font-size': options.defaultFontSize.toString(),
            'fill': "none"
        };

        var xTranslate = -1 * graphRange.xmin;
        var yTranslate = graphRange.ymax;
        var attributeValue = "translate(" + xTranslate + "," + yTranslate + ") scale(1,-1)";
        attributes['transform'] = attributeValue;

        var gElement = createSvgElement("g", attributes);
        appendElement(gElement, true);
    };


    function drawRoundedAngleMarker(points, radius)
    {
        /*
         * NOTE: the points need to be defined
         * in a counter clockwise manner.
         */

        var p2 = points[1];

        // Translate point so that p2 is at the origin
        var translate = (p) => [ p[0] + -1*p2[0], p[1] + -1*p2[1] ];
        var p1 = translate(points[0]);
        var p3 = translate(points[2]);

        var scaleFactor = radius / Math.hypot(p3[0], p3[1]);
        var arcStart = [ scaleFactor * p3[0], scaleFactor * p3[1] ];

        var scaleFactor = radius / Math.hypot(p1[0], p1[1]);
        var arcEnd = [ scaleFactor * p1[0], scaleFactor * p1[1] ];

        // Translate back to original coordinate system
        translate = (p) => { p[0] += p2[0]; p[1] += p2[1] };
        translate(arcStart);
        translate(arcEnd);

        var newElement = createSvgElement('path', true);

        var d = `M ${arcStart[0]} ${arcStart[1]} A ${radius} ${radius} 0 0 1 ${arcEnd[0]} ${arcEnd[1]}`;

        setAttributes(newElement, {'d': d});
        appendElement(newElement);
    }


    function drawSquareAngleMarker(points, radius)
    {
        var p2 = points[1];

        // Translate points so that p2 is at the origin
        var translate = (p) => [ p[0] + -1*p2[0], p[1] + -1*p2[1] ];
        var p1 = translate(points[0]);
        var p3 = translate(points[2]);

        var scaleFactor = radius / Math.hypot(p3[0], p3[1]);
        var startPoint = [ scaleFactor * p3[0], scaleFactor * p3[1] ];

        scaleFactor = radius / Math.hypot(p1[0], p1[1]);
        var endPoint = [ scaleFactor * p1[0], scaleFactor * p1[1] ];

        var midPoint = [ 0.5 * (startPoint[0] + endPoint[0]),
                         0.5 * (startPoint[1] + endPoint[1])];
        scaleFactor = (Math.SQRT2 * radius) / Math.hypot(midPoint[0], midPoint[1]);
        midPoint = [ scaleFactor * midPoint[0], scaleFactor * midPoint[1] ];


        // Translate back to original coordinate system
        translate = (p) => { p[0] += p2[0]; p[1] += p2[1] };
        translate(startPoint);
        translate(endPoint);
        translate(midPoint);

        var newElement = createSvgElement('path', true);

        var d = `M ${startPoint[0]} ${startPoint[1]} L ${midPoint[0]} ${midPoint[1]} L ${endPoint[0]} ${endPoint[1]}`;

        setAttributes(newElement, {'d': d});
        appendElement(newElement);
    }


    function drawAngleMarkers(points, style, scale)
    {
        if (scale === undefined)
        {
            scale = 1.0;
        }

        var radii = [10, 13, 16].map(i => scale * i);

        if (style == ")")
        {
            drawRoundedAngleMarker(points, radii[0]);
        }
        else if (style == "))")
        {
            drawRoundedAngleMarker(points, radii[0]);
            drawRoundedAngleMarker(points, radii[1]);
        }
        else if (style == ")))")
        {
            drawRoundedAngleMarker(points, radii[0]);
            drawRoundedAngleMarker(points, radii[1]);
            drawRoundedAngleMarker(points, radii[2]);
        }
        else if (style == "r")
        {
            drawSquareAngleMarker(points, radii[0]);
        }
    }


    function popParentElement()
    {
        /*
         * Do not allow popping the first two elements off
         * the stack since they are required for proper coordinates.
         */
        if (parentElementStack.length > 2)
        {
            var topElement = parentElementStack[parentElementStack.length - 1];
            if (topElement.nodeName == 'g')
            {
                parentElementStack.pop();
            }
        }
    }

    setAttributes(svgElement, {'class': 'cgraph-root'});
    appendDefaultMarkers(svgElement);

    /*
     * Set public api.
     */
    this.getId = getId;
    this.appendElement = appendElement;
    this.graphRange = graphRange;
    this.jsContext = jsContext;
    this.initRootElements = initRootElements;
    this.drawAngleMarkers = drawAngleMarkers;
    this.popParentElement = popParentElement;
    this.arrowHeadStartMarkerId = arrowHeadStartMarkerId;
    this.arrowHeadEndMarkerId = arrowHeadEndMarkerId;
    this.getRootElement = function() { return svgElement; };
    this.getTransformMatrix = function() { return parentElementStack[1].getScreenCTM(); };
    this.getScale = function() { return _scale; };
    this.createSVGPoint = function() { return svgElement.createSVGPoint(); };
    this.addEventListener = function(e, f) { svgElement.addEventListener(e, f); };
};


const commandProcessor = (function() {

    var previousCommand = null;
    var numExecutedCommands = 0;


    function reset()
    {
        previousCommand = null;
        numExecutedCommands = 0;
    }


    function parseArgs(commandName, argsList)
    {
        var args = {};

        if (commands.hasOwnProperty(commandName))
        {
            var params = commands[commandName].params;
            var i = 0;

            while (i < argsList.length)
            {
                var argName = argsList[i];
                if (params.hasOwnProperty(argName))
                {
                    var numValues = params[argName].numValues;
                    var values = [];
                    i++;

                    while ((i < argsList.length) && (numValues > 0))
                    {
                        values.push(argsList[i]);
                        numValues--;
                        i++;
                    }

                    if (values.length === params[argName].numValues)
                    {
                        args[argName] = values;
                    }

                    i--;
                }

                i++;
            }
        }

        return args;
    }


    /*
     * Takes the args in source and adds them to target.
     */
    function mergeArgs(target, source, includeId)
    {
        for (var arg in source.args)
        {
            if (!includeId && (arg == 'id')) continue;

            target.args[arg] = [];
            source.args[arg].forEach(value => target.args[arg].push(value));
        }
    }


    function collapseGroup(it, jsContext)
    {
        let groupIt = it.clone();
        let origData = groupIt.getData();
        let prevType = parser.TYPE_GROUP;

        groupIt.advance();

        while (!groupIt.atEnd())
        {
            let data = groupIt.getData();

            if (prevType == parser.TYPE_GROUP)
            {
                if (data.type == parser.TYPE_GROUP_SCRIPT)
                {
                    let scriptResult = jsContext.execute(data.value);
                    origData.value += scriptResult;
                    groupIt.remove();
                }
                else break;
            }
            else if (prevType == parser.TYPE_GROUP_SCRIPT)
            {
                if (data.type == parser.TYPE_GROUP)
                {
                    origData.value += data.value;
                    groupIt.remove();
                }
                else if (data.type == parser.TYPE_GROUP_SCRIPT)
                {
                    let scriptResult = jsContext.execute(data.value);
                    origData.value += scriptResult;
                    groupIt.remove();
                }
                else break;
            }
            else break;

            prevType = data.type;
        }
    }


    function processCommand(it, cg)
    {
        let data = it.getData();
        let commandInstance = null;
        let command = {name: "", args: []};

        while (data.type != parser.TYPE_COMMAND_BOUNDARY)
        {
            if (data.type == parser.TYPE_TEXT)
            {
                var trimmedValue = data.value.trim();
                if (trimmedValue.length > 0)
                {
                    var chunks = trimmedValue.split(/\s+/);
                    if (command.name.length == 0) command.name = chunks.shift();
                    chunks.forEach(chunk => command.args.push(chunk));
                }
            }
            else if ((data.type == parser.TYPE_GROUP) || (data.type == parser.TYPE_STRING))
            {
                if (command.name.length > 0) command.args.push(data.value);
            }

            it.advance();
            data = it.getData();
        }

        if (command.name.length > 0)
        {
            if ((command.name === ".") && (previousCommand !== null))
            {
                command.args = parseArgs(previousCommand.name, command.args);
                mergeArgs(previousCommand, command, true);
                command = previousCommand;
            }
            else
            {
                command.args = parseArgs(command.name, command.args);
            }

            // Clone the current command
            previousCommand = {name: command.name, args: {}};
            mergeArgs(previousCommand, command, false);

            if (commands.hasOwnProperty(command.name))
            {
                /*
                 * NOTE: init must be the
                 * first executed command.
                 */

                if (numExecutedCommands == 0)
                {
                    if (command.name != "init")
                    {
                        commands['init'].createInstance(cg, {}, options);
                    }

                    commandInstance = commands[command.name].createInstance(cg, command.args, options);
                    numExecutedCommands++;
                }
                else if (command.name != "init")
                {
                    commandInstance = commands[command.name].createInstance(cg, command.args, options);
                    numExecutedCommands++;
                }
            }
        }

        return commandInstance;
    }


    function processInput(input, cg)
    {
        let commandInstances = [];

        let list = parser.parse(input);
        let preprocessIt = list.getIterator();
        let processIt = list.getIterator();

        while (!processIt.atEnd())
        {
            while (!preprocessIt.atEnd())
            {
                let type = preprocessIt.getData().type;

                if (type == parser.TYPE_COMMAND_BOUNDARY) break;
                else if (type == parser.TYPE_GROUP)
                {
                    collapseGroup(preprocessIt, cg.jsContext);
                    preprocessIt.advance();
                }
                else if (type == parser.TYPE_SCRIPT)
                {
                    let updateProcessIt = processIt.equals(preprocessIt);

                    let scriptResult = cg.jsContext.execute(preprocessIt.getData().value);
                    let tmpList = parser.parse(scriptResult);
                    tmpList.trimEnd(parser.TYPE_COMMAND_BOUNDARY);

                    preprocessIt.replaceWithList(tmpList);
                    if (updateProcessIt) processIt = preprocessIt.clone();
                }
                else preprocessIt.advance();
            }

            let commandInstance = processCommand(processIt, cg);
            if (commandInstance)
            {
                commandInstances.push(commandInstance);

                if (commandInstance.name && commandInstance.scriptInterface)
                {
                    cg.jsContext.addGlobal(commandInstance.name,
                                           commandInstance.scriptInterface);
                }
            }

            processIt.advance();
            preprocessIt.advance();
        }

        commandInstances.forEach(instance => instance.render());
    }

    return {
        reset: function() { reset(); },
        processInput: function(input, cg) { return processInput(input, cg); },
    };
})();


function processElement(sourceElement)
{
    var cg = new CGInstance();
    var svgElement = cg.getRootElement();

    sourceElement.parentElement.insertBefore(svgElement, sourceElement);
    sourceElement.parentNode.removeChild(sourceElement);

    /*
     * Using innerHTML here does not work correctly because
     * the returned text contains html entities like: &gt; and &lt;
     * which do not get handled correctly when evaluating javascript.
     * Furthermore, the input is parsed after inserting the SVG element
     * into the dom tree so that the getScreenCTM call returns valid
     * information for width and height properties.
     */
    var sourceText = sourceElement.textContent;

    var cachedValue = cache.get(sourceText);

    if (cachedValue === null)
    {
        commandProcessor.reset();
        commandProcessor.processInput(sourceText, cg);

        if (cache.enabled()) cache.put(sourceText, svgElement);
    }
    else
    {
        /*
         * Replace the current svg element with the cached one.
         */
        svgElement.parentElement.insertBefore(cachedValue, svgElement);
        svgElement.parentNode.removeChild(svgElement);
    }

    interactionHandler.attachEventHandlers(cg);
    return cg;
}


function convertToShrinkableWidth(cg)
{
    var element = cg.getRootElement();

    if (element.hasAttribute('width'))
    {
        let width = element.getAttribute('width').trim();

        if (width.length == 0) return false;
        if (width.endsWith('%')) return true;

        element.setAttribute('width', '80%');

        let style = element.hasAttribute('style') ?
                    element.getAttribute('style') : "";

        style += `max-width: ${width};`;
        element.setAttribute('style', style);

        element.removeAttribute('height');
        return true;
    }

    return false;
}


function convertElement(element, options)
{
    var converted = false;
    var attributeName = "data-content-type";

    if (element.hasAttribute(attributeName))
    {
        var contentType = element.getAttribute(attributeName);

        var regexResult = contentType.match(/^cgraph_(\d+)$/);
        if (regexResult !== null)
        {
            var version = regexResult[1];

            if (parseInt(version) === majorVersion)
            {
                let cg = processElement(element);

                if (options && options.shrinkable)
                    convertToShrinkableWidth(cg);

                converted = true;
            }
            else logError("Unsupported version: " + version);
        }
        else logError(`Invalid ${attributeName} value.`);
    }
    else logError(`Element missing ${attributeName} attribute.`);

    return converted;
};


function convertAllElements(options)
{
    var elements = document.querySelectorAll("div[data-content-type^='cgraph_']");
    elements.forEach(element => convertElement(element, options));
};


function convertDescendents(parentElement, options)
{
    var elements = parentElement.querySelectorAll("div[data-content-type^='cgraph_']");
    elements.forEach(element => convertElement(element, options));
}


function getTestObject()
{
    let testObject = {};

    if (options.test)
    {
        testObject.parser = parser;
    }

    return testObject;
}


export const CGraph = {
    setUrlMap: function(map)
    {
        setUrlMap(map);
    },
    enableCache: function(enable)
    {
        cache.enable(enable);
    },
    convertElement: function(element, options)
    {
        convertElement(element, options);
    },
    convertAllElements: function(options)
    {
        convertAllElements(options);
    },
    convertDescendents: function(parentElement, options)
    {
        convertDescendents(parentElement, options);
    },
    setEventListener: function(eventType, callback)
    {
        interactionHandler.setEventListener(eventType, callback);
    },
    getTestObject: function()
    {
        return getTestObject();
    }
};

