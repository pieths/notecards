/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const CGraph = (function() {

    const majorVersion = 1;

    var options =
    {
        defaultStrokeWidth: 1,
        defaultFontSize: 16,
        test: true
    };

    var uniqueIdCounter = 0;

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

    var urlMap = {};


    function init(baseUrl, initializedCallback)
    {
        jsContext.init(baseUrl, initializedCallback);
    }


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


    const jsContext = (function() {
        var iframe =  null;
        var iframe_id = "jsContextFrame";

        function init(baseUrl, callback)
        {
            if (iframe === null)
            {
                let frameContents = `
                    <!DOCTYPE html><html><head>
                    <script type="text/javascript" src="${baseUrl}/js_context_utils.js"></script>
                    </head><body></body></html>`;

                iframe = document.createElement('iframe');

                iframe.addEventListener("load", function() {
                    if (typeof callback === 'function') callback();
                });

                iframe.setAttribute('id', iframe_id);
                iframe.setAttribute('srcdoc', frameContents);
                iframe.setAttribute('style', "display: none;");
                iframe.setAttribute('sandbox', "allow-scripts allow-same-origin");
                document.getElementsByTagName('body')[0].appendChild(iframe);
            }
        }

        function execute(code)
        {
            var result = "";

            if (/^\s*=/.test(code))
            {
                code = code.replace("=", "return ");
            }

            try
            {
                let returnValue = iframe.contentWindow.runCode(code);
                switch (typeof returnValue)
                {
                    case 'string':
                    case 'number':
                        result = returnValue.toString();
                        break;

                    case 'object':
                        switch (returnValue.constructor.name)
                        {
                            case 'Point':
                            case 'Bounds':
                                result = returnValue.toString();
                                break;
                        }
                        break;
                }
            }
            catch(error)
            {
                logError(error);
            }

            return result;
        }

        return {
            init: function(baseUrl, callback) { init(baseUrl, callback); },
            execute: function(code) { return execute(code); }
        };
    })();


    const parser = (function() {
        const DELIMITED_BLOCKS_START_VALUE = 20;

        const MODE_UNKNOWN = 0;
        const MODE_COMMAND_BOUNDARY = 1;
        const MODE_LINE_CONTINUATION = 2;
        const MODE_INPUT_END = 3;
        const MODE_GROUP = DELIMITED_BLOCKS_START_VALUE;
        const MODE_STRING = DELIMITED_BLOCKS_START_VALUE + 1;
        const MODE_SCRIPT = DELIMITED_BLOCKS_START_VALUE + 2;

        let modeNames =
        {
            [MODE_UNKNOWN]: 'unknown',
            [MODE_GROUP]: 'group',
            [MODE_STRING]: 'string',
            [MODE_COMMAND_BOUNDARY]: 'command_boundary'
        };

        function mapModesToNames(parts)
        {
            parts.forEach(part => part.type = modeNames[part.type]);
        }

        function joinConsecutiveUnknowns(parts)
        {
            let tmpParts = [parts.shift()];

            parts.forEach(part => {
                let top = tmpParts[tmpParts.length - 1];

                if (part.type === MODE_LINE_CONTINUATION)
                {
                    part.type = MODE_UNKNOWN;
                    part.value = " ";
                }

                if ((part.type === MODE_UNKNOWN) &&
                    (top.type === MODE_UNKNOWN))
                {
                    top.value += part.value;
                }
                else tmpParts.push(part);
            });

            return tmpParts;
        }

        /*
         * See the testParse method in cgraph_test.js for the
         * tests which define the input/output requirements
         * for this method.
         */
        function parse(input)
        {
            if (input == "") return [];

            let i = 0;
            let start = 0;
            let parts = [];
            let values = [];
            let stateStack = [];
            let ch = input.charAt(i);
            let delimCount = 0;

            let mode = MODE_UNKNOWN;
            let newMode = MODE_UNKNOWN;

            let checkForDelimiter = (ch, open, close) =>
            {
                if (ch == close)
                {
                    if (delimCount == 0) newMode = MODE_UNKNOWN;
                    else delimCount--;
                }
                else if (ch == open) delimCount++;
            };

            let peek = () => input.charAt(i + 1);
            let isEOLChar = ch => ((ch == "\r") || (ch == "\n"));


            while (mode != MODE_INPUT_END)
            {
                /* Given a mode and a ch, determine the new mode */

                if (ch == "") newMode = MODE_INPUT_END;
                else if (mode == MODE_GROUP) checkForDelimiter(ch, '(', ')');
                else if (mode == MODE_STRING) checkForDelimiter(ch, '"', '"');
                else if (mode == MODE_SCRIPT) checkForDelimiter(ch, '{', '}');
                else if ((mode == MODE_UNKNOWN) ||
                         (mode == MODE_COMMAND_BOUNDARY) ||
                         (mode == MODE_LINE_CONTINUATION))
                {
                    if ((mode == MODE_LINE_CONTINUATION) && isEOLChar(ch)) { }
                    else if (ch == '(') newMode = MODE_GROUP;
                    else if (ch == '"') newMode = MODE_STRING;
                    else if (ch == '{') newMode = MODE_SCRIPT;
                    else if ((ch == "\r") || (ch == "\n") || (ch == ';')) newMode = MODE_COMMAND_BOUNDARY;
                    else if ((ch == "\\") && isEOLChar(peek())) newMode = MODE_LINE_CONTINUATION;
                    else newMode = MODE_UNKNOWN;
                }

                /* Process any mode changes or end of inputs */

                if (newMode == MODE_INPUT_END)
                {
                    if (i > start) values.push(input.substring(start, i));

                    if (stateStack.length > 0) /* end of script return value string */
                    {
                        let state = stateStack.pop();
                        input = state.input;
                        start = state.start;
                        i = state.i;
                        newMode = mode;
                    }
                    else /* reached the end of the initial input string */
                    {
                        if (values.length > 0)
                        {
                            parts.push({type: mode, value: values.join('')});
                        }

                        if (mode != MODE_COMMAND_BOUNDARY)
                            parts.push({type: MODE_COMMAND_BOUNDARY, value: ''});

                        mode = MODE_INPUT_END;
                    }
                }
                else if (newMode != mode)
                {
                    if (i > start) values.push(input.substring(start, i));

                    if (values.length > 0)
                    {
                        let value = values.join('');
                        values = [];

                        if (mode == MODE_SCRIPT)
                        {
                            stateStack.push({input: input, i: i, start: i + 1});
                            input = jsContext.execute(value);
                            i = -1;
                        }
                        else parts.push({type: mode, value: value});
                    }

                    start = ((mode >= DELIMITED_BLOCKS_START_VALUE) ||
                             (newMode >= DELIMITED_BLOCKS_START_VALUE)) ? i + 1 : i;
                    mode = newMode;
                }

                ch = input.charAt(++i);
            }

            if (parts.length > 1)
            {
                let part = parts[parts.length - 2];
                if (part.type == MODE_SCRIPT)
                {
                    part.type = MODE_UNKNOWN;
                    part.value = '';
                }
            }

            parts = joinConsecutiveUnknowns(parts);
            mapModesToNames(parts);
            return parts;
        }

        return {
            parse: function(input) { return parse(input); }
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


    function setAttributes(element, attributes)
    {
        for (attributeName in attributes)
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


    function createSvgElement(tagName, attributes, textContent)
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


    function isFloat(inputArray)
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
    function parseFloats(inputArray, values)
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


    function roundToNearestMultiple(num, multiple)
    {
        return Math.round(num / multiple) * multiple;
    }


    function getNearestValue(value, array)
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
    };


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
    };


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
    };


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


    var commands = {};
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
    commands['init'].func = function(cg, args)
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
    };


    commands['point'] = {};
    commands['point'].params =
    {
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
    commands['point'].func = function(cg, args)
    {
        var newElement = createSvgElement('circle', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('p') && isFloat(args['p']))
        {
            attributes['cx'] = args['p'][0];
            attributes['cy'] = args['p'][1];
        }

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
        cg.appendElement(newElement);
    };


    commands['points'] = {};
    commands['points'].params =
    {
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
    commands['points'].func = function(cg, args)
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
                    attributes['cx'] = values[i];
                    attributes['cy'] = values[i+1];

                    let newElement = createSvgElement('circle', true);
                    setAttributes(newElement, attributes);
                    cg.appendElement(newElement);
                }
            }
        }
    };


    commands['circle'] = {};
    commands['circle'].params =
    {
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
    commands['circle'].func = function(cg, args)
    {
        var newElement = createSvgElement('circle', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('c') && isFloat(args['c']))
        {
            attributes['cx'] = args['c'][0];
            attributes['cy'] = args['c'][1];
        }

        setAttributes(newElement, attributes);
        cg.appendElement(newElement);
    };


    commands['ellipse'] = {};
    commands['ellipse'].params =
    {
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
    commands['ellipse'].func = function(cg, args)
    {
        var newElement = createSvgElement('ellipse', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('c') && isFloat(args['c']))
        {
            attributes['cx'] = args['c'][0];
            attributes['cy'] = args['c'][1];
        }

        if (args.hasOwnProperty('p') && parseFloats(args['p']))
        {
            let [x1, y1, x2, y2] = args['p'];

            attributes['cx'] = ((x2 - x1) / 2.0) + x1;
            attributes['cy'] = ((y2 - y1) / 2.0) + y1;
            attributes['rx'] = Math.abs(x2 - x1) / 2.0;
            attributes['ry'] = Math.abs(y2 - y1) / 2.0;
        }

        if (args.hasOwnProperty('b') && parseFloats(args['b']))
        {
            let [x, y, width, height] = args['b'];

            width = Math.max(width, 0);
            height = Math.max(height, 0);

            attributes['cx'] = x + (width / 2);
            attributes['cy'] = y + (height / 2);
            attributes['rx'] = width / 2;
            attributes['ry'] = height / 2;
        }

        setAttributes(newElement, attributes);
        cg.appendElement(newElement);
    };


    commands['line'] = {};
    commands['line'].params =
    {
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
    commands['line'].func = function(cg, args)
    {
        var newElement = createSvgElement('line', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('p') && isFloat(args['p']))
        {
            attributes['x1'] = args['p'][0];
            attributes['y1'] = args['p'][1];
            attributes['x2'] = args['p'][2];
            attributes['y2'] = args['p'][3];
        }

        if (args.hasOwnProperty('p1') && isFloat(args['p1']))
        {
            attributes['x1'] = args['p1'][0];
            attributes['y1'] = args['p1'][1];
        }

        if (args.hasOwnProperty('p2') && isFloat(args['p2']))
        {
            attributes['x2'] = args['p2'][0];
            attributes['y2'] = args['p2'][1];
        }

        if (args.hasOwnProperty('me') && (args['me'][0] == 'arrow'))
        {
            attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;
        }

        if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
        {
            attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
        }

        setAttributes(newElement, attributes);
        cg.appendElement(newElement);
    };


    commands['text'] = {};
    commands['text'].params =
    {
        p: {name: "point", numValues: 2, isAttribute: false},
        f: {name: "fill", numValues: 1, isAttribute: true},
        fs: {name: "font-size", numValues: 1, isAttribute: true},
        ff: {name: "font-family", numValues: 1, isAttribute: true},
        ha: {name: "horizontal-alignment", numValues: 1, isAttribute: false},
        t: {name: "text", numValues: 1, isAttribute: false},
        o: {name: "opacity", numValues: 1, isAttribute: true}
    };
    commands['text'].func = function(cg, args)
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

        cg.appendElement(newElement);
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
    commands['g'].func = function(cg, args)
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
        cg.appendElement(newElement, true);
    };


    commands['endg'] = {};
    commands['endg'].params = {};
    commands['endg'].func = function(cg, args)
    {
        cg.popParentElement();
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
    commands['clone'].func = function(cg, args)
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
        cg.appendElement(newElement, true);
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
    commands['path'].func = function(cg, args)
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
        cg.appendElement(newElement);
    };


    commands['rect'] = {};
    commands['rect'].params =
    {
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
    commands['rect'].func = function(cg, args)
    {
        var newElement = createSvgElement('rect', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('b') && isFloat(args['b']))
        {
            attributes['x'] = args['b'][0];
            attributes['y'] = args['b'][1];
            attributes['width'] = args['b'][2];
            attributes['height'] = args['b'][3];
        }

        if (args.hasOwnProperty('cr'))
        {
            attributes['rx'] = args['cr'][0];
            attributes['ry'] = args['cr'][0];
        }

        setAttributes(newElement, attributes);
        cg.appendElement(newElement);
    };


    commands['arrow'] = {};
    commands['arrow'].params =
    {
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
    commands['arrow'].func = function(cg, args)
    {
        var newElement = createSvgElement('line', true);
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('p') && isFloat(args['p']))
        {
            attributes['x1'] = args['p'][0];
            attributes['y1'] = args['p'][1];

            attributes['x2'] = args['p'][2];
            attributes['y2'] = args['p'][3];
        }

        if (args.hasOwnProperty('p1') && isFloat(args['p1']))
        {
            attributes['x1'] = args['p1'][0];
            attributes['y1'] = args['p1'][1];
        }

        if (args.hasOwnProperty('p2') && isFloat(args['p2']))
        {
            attributes['x2'] = args['p2'][0];
            attributes['y2'] = args['p2'][1];
        }

        if (args.hasOwnProperty('ms') && (args['ms'][0] == 'arrow'))
        {
            attributes['marker-start'] = `url(#${cg.arrowHeadStartMarkerId})`;
        }

        attributes['marker-end'] = `url(#${cg.arrowHeadEndMarkerId})`;

        setAttributes(newElement, attributes);
        cg.appendElement(newElement);
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
    commands['func'].func = function(cg, args)
    {
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('fn') &&
            args.hasOwnProperty('r') &&
            parseFloats(args['r']))
        {
            let newElement = createSvgElement('path', true);

            let funcString = args['fn'][0];

            let [xStart, xEnd, xDivisions] = args['r'];
            let xIncrement = (xEnd - xStart) / xDivisions;

            let code = `
                var result = "";
                var func = ${funcString};
                var x = ${xStart};
                for (var i=0; i < ${xDivisions}; i++)
                {
                    result += "L " +
                               (M.round(x * 1000) / 1000) + " " +
                               (M.round(func(x) * 1000) / 1000) + " ";

                    x += ${xIncrement};
                }
                return result;
            `;

            let d = jsContext.execute(code);
            d = d.replace("L", "M");
            attributes['d'] = d;

            setAttributes(newElement, attributes);
            cg.appendElement(newElement);
        }
    };


    commands['triangle'] = {};
    commands['triangle'].params =
    {
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
    commands['triangle'].func = function(cg, args)
    {
        var attributes = extractAttributesFromArgs(args, this.params);

        if (args.hasOwnProperty('p') && parseFloats(args['p']))
        {
            var newElement = createSvgElement('path', true);

            var d = "";
            d += `M ${args['p'][0]} ${args['p'][1]} `;
            d += `L ${args['p'][2]} ${args['p'][3]} `;
            d += `L ${args['p'][4]} ${args['p'][5]} Z`;

            attributes['d'] = d;

            setAttributes(newElement, attributes);
            cg.appendElement(newElement);


            var p1 = [args['p'][0], args['p'][1]];
            var p2 = [args['p'][2], args['p'][3]];
            var p3 = [args['p'][4], args['p'][5]];

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
        }
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
    commands['mtext'].func = function(cg, args)
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

        if (args.hasOwnProperty('or') && (args['or'][0] == "1"))
        {
            var gElement = createSvgElement('g', {transform: `translate(0, ${height})`});

            gElement.appendChild(foreignObjectElement);
            cg.appendElement(gElement);
        }
        else
        {
            cg.appendElement(foreignObjectElement);
        }
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
    commands['setblob'].func = function(cg, args)
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

        cg.appendElement(gElement);
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
    commands['grid'].func = function(cg, args)
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

        xStart = roundToNearestMultiple(xMin, xSpacing);
        yStart = roundToNearestMultiple(yMin, ySpacing);

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

        cg.appendElement(pathElement);
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
    commands['axis'].func = function(cg, args)
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

        var pathElement = createSvgElement('path', true);

        attributes['d'] = `M ${xMin} 0 H ${xMax}`;
        setAttributes(pathElement, attributes);
        cg.appendElement(pathElement);


        pathElement = createSvgElement('path', true);

        attributes['d'] = `M 0 ${yMin} V ${yMax}`;
        setAttributes(pathElement, attributes);
        cg.appendElement(pathElement);
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
    commands['brace'].func = function(cg, args)
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
        attributes = extractAttributesFromArgs(args, this.params);
        attributes['d'] = pathString;
        setAttributes(pathElement, attributes);
        cg.appendElement(pathElement);
    };


    commands['angle'] = {};
    commands['angle'].params =
    {
        p: {name: "points", numValues: 6, isAttribute: false},
        a: {name: "angle-type", numValues: 1, isAttribute: false},
        as: {name: "angle-scale", numValues: 1, isAttribute: false},
    };
    commands['angle'].func = function(cg, args)
    {
        if (!args.hasOwnProperty('p') || !parseFloats(args['p']) ||
            !args.hasOwnProperty('a')) return;

        var p1 = [args['p'][0], args['p'][1]];
        var p2 = [args['p'][2], args['p'][3]];
        var p3 = [args['p'][4], args['p'][5]];

        var scale = getFloatValueFromArgs(args, 'as', 1.0);
        cg.drawAngleMarkers([p1, p2, p3], args['a'][0], scale);
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
    commands['curve'].func = function(cg, args)
    {
        let showPoints = false;

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

            var newElement = createSvgElement('path', true);

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
            cg.appendElement(newElement);


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
                    cg.appendElement(pointElement);
                }
            }
        }
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
    commands['image'].func = function(cg, args)
    {
        if (args.hasOwnProperty('url'))
        {
            var newElement = createSvgElement('image', true);
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

            cg.appendElement(newElement);
        }
    };

    commands['img'] = {};
    commands['img'].params = commands['image'].params;
    commands['img'].func = commands['image'].func;


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
    };


    function executeCommands(cg, parts)
    {
        var command = {name: "", args: []};
        var previousCommand = null;
        var numExecutedCommands = 0;

        /*
         * Takes the args in source and adds them to target.
         */
        var mergeArgs = (target, source) => {
            for (var arg in source.args)
            {
                target.args[arg] = [];
                source.args[arg].forEach(value => target.args[arg].push(value));
            }
        };

        for (var i=0; i < parts.length; i++)
        {
            var type = parts[i].type;
            if (type == 'unknown')
            {
                var trimmedValue = parts[i].value.trim();
                if (trimmedValue.length > 0)
                {
                    var chunks = trimmedValue.split(/\s+/);
                    if (command.name.length == 0) command.name = chunks.shift();
                    chunks.forEach(chunk => command.args.push(chunk));
                }
            }
            else if ((type == 'group') || (type == 'string'))
            {
                if (command.name.length > 0) command.args.push(parts[i].value);
            }
            else if ((type == 'command_boundary') && (command.name.length > 0))
            {
                if ((command.name === ".") && (previousCommand !== null))
                {
                    command.args = parseArgs(previousCommand.name, command.args);
                    mergeArgs(previousCommand, command);
                    command = previousCommand;
                }
                else
                {
                    command.args = parseArgs(command.name, command.args);
                }

                // Clone the current command
                previousCommand = {name: command.name, args: {}};
                mergeArgs(previousCommand, command);

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
                            commands['init'].func(cg, {});
                        }

                        commands[command.name].func(cg, command.args);
                        numExecutedCommands++;
                    }
                    else if (command.name != "init")
                    {
                        commands[command.name].func(cg, command.args);
                        numExecutedCommands++;
                    }
                }

                command = {name: "", args: []};
            }
        }
    }


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
            let parts = parser.parse(sourceText);
            executeCommands(cg, parts);

            if (cache.enabled()) addToCache(sourceText, svgElement);
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
        testObject = {};

        if (options.test)
        {
            testObject.parser = parser;
        }

        return testObject;
    }


    /*
     * Return the public api.
     */
    return {
        init: function(baseUrl, initializedCallback)
        {
            init(baseUrl, initializedCallback);
        },
        setUrlMap: function(map)
        {
            setUrlMap(map);
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
})();

