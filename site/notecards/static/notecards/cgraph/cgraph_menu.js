/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const CGraphMenu = (function() {

    /*
     * Converts an array of points to a string separated by spaces.
     * The input string should be of the following form:
     * [[p1.x, p1.y], [p2.x, p2.y], ...]
     */
    function pointsToString(points)
    {
        return points.map(p => p.join(' ')).join(' ');
    }

    function getControls()
    {
        var elements = {};
        var selectors = "#cgraphMenuControls div, #cgraphMenuControls input";

        document.querySelectorAll(selectors).forEach(function(node)
        {
            if ((node.nodeType == Node.ELEMENT_NODE) && node.hasAttribute('id'))
            {
                var key = node.getAttribute('id').replace("cgraph_menu_", "");
                elements[key] = node;
            }
        });
        
        return elements;
    }

    /*
     * Update the controls to match what
     * is stored in the command object.
     */
    function updateControls(controls, command)
    {
        if (command.hasOwnProperty('sw'))
        {
            $(controls.sw).slider('enable');
            controls.sw.value = command.sw;
        }
        else $(controls.sw).slider('disable');

        if (command.hasOwnProperty('sw_i'))
        {
            $(controls.sw_i).checkboxradio("enable");
            controls.sw_i.checked = command.sw_i;
        }
        else $(controls.sw_i).checkboxradio("disable");

        if (command.hasOwnProperty('sc'))
        {
            controls.sc.style.visibility = 'visible';
            ColorPalette.setBackgroundColor(controls.sc, command.sc);
        }
        else controls.sc.style.visibility = 'hidden';

        if (command.hasOwnProperty('sc_i'))
        {
            $(controls.sc_i).checkboxradio("enable");
            controls.sc_i.checked = command.sc_i;
        }
        else $(controls.sc_i).checkboxradio("disable");

        if (command.hasOwnProperty('fs'))
        {
            $(controls.fs).slider('enable');
            controls.fs.value = command.fs;
        }
        else $(controls.fs).slider('disable');

        if (command.hasOwnProperty('fs_i'))
        {
            $(controls.fs_i).checkboxradio("enable");
            controls.fs_i.checked = command.fs_i;
        }
        else $(controls.fs_i).checkboxradio("disable");

        if (command.hasOwnProperty('f'))
        {
            controls.f.style.visibility = 'visible';
            ColorPalette.setBackgroundColor(controls.f, command.f);
        }
        else controls.f.style.visibility = 'hidden';

        if (command.hasOwnProperty('f_i'))
        {
            $(controls.f_i).checkboxradio("enable");
            controls.f_i.checked = command.f_i;
        }
        else $(controls.f_i).checkboxradio("disable");
    }

    function disableAllControls(controls)
    {
        $(controls.sw).slider('disable');
        $(controls.sw_i).checkboxradio("disable");
        controls.sc.style.visibility = 'hidden';
        $(controls.sc_i).checkboxradio("disable");
        $(controls.fs).slider('disable');
        $(controls.fs_i).checkboxradio("disable");
        controls.f.style.visibility = 'hidden';
        $(controls.f_i).checkboxradio("disable");
    }

    /*
     * Converts and rgb string returned from the
     * css style.backgroundColor property to its
     * corresponding hex format: "#ffffff". If the
     * input is not in the form rgb(x,y,z) then the
     * original string is returned.
     */
    function rgbToHex(rgb)
    {
        var result = rgb;

        if (rgb.startsWith("rgb("))
        {
            rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            hex = x => ("0" + parseInt(x).toString(16)).slice(-2);
            result = hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);

            let match = result.match(/^(.)\1\1\1\1\1$/);
            if (match) result = match[1].repeat(3);

            result = "#" + result;
        }

        return result;
    }

    /*
     * Update the command object to match
     * what is stored in the controls.
     */
    function updateCommand(command, controls)
    {
        if (command.hasOwnProperty('sw'))
        {
            command.sw = controls.sw.value;
        }

        if (command.hasOwnProperty('sw_i'))
        {
            command.sw_i = controls.sw_i.checked;
        }

        if (command.hasOwnProperty('sc'))
        {
            command.sc = controls.sc.style.backgroundColor != "" ?
                         rgbToHex(controls.sc.style.backgroundColor) :
                         null;
        }

        if (command.hasOwnProperty('sc_i'))
        {
            command.sc_i = controls.sc_i.checked;
        }

        if (command.hasOwnProperty('fs'))
        {
            command.fs = controls.fs.value;
        }

        if (command.hasOwnProperty('fs_i'))
        {
            command.fs_i = controls.fs_i.checked;
        }

        if (command.hasOwnProperty('f'))
        {
            command.f = controls.f.style.backgroundColor != "" ?
                        rgbToHex(controls.f.style.backgroundColor) :
                        null;
        }

        if (command.hasOwnProperty('f_i'))
        {
            command.f_i = controls.f_i.checked;
        }
    }

    /*
     * Converts the extra parameters like stroke-width, font-size,
     * fill etc... to a string which can be appended to the output.
     */
    function getExtraParamsString(command)
    {
        var result = "";

        var addParam = (paramName) => {
            if (command.hasOwnProperty(paramName))
            {
                if (command.hasOwnProperty(`${paramName}_i`))
                {
                    if (!command[`${paramName}_i`])
                    {
                        result += `${paramName} ${command[paramName]} `;
                    }
                }
                else
                {
                    result += `${paramName} ${command[paramName]} `;
                }
            }
        };

        addParam('sw');
        addParam('sc');
        addParam('fs');
        addParam('f');
        return result.trim();
    }

    /*
     * Returns the euclidean distance between two points
     * represented as [[p1.x, p1.y], [p2.x, p2.y]]
     */
    function getDistance(points)
    {
        var deltaX = points[0][0] - points[1][0];
        var deltaY = points[0][1] - points[1][1];
        var result = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
        return Math.round(result * 100) / 100;
    }

    function roundToNearestMultiple(num, multiple)
    {
        var result = Math.round(num / multiple) * multiple;
        return Math.round(result * 100) / 100;
    }

    function roundPointToSnapValue(point, snap)
    {
        var x = roundToNearestMultiple(point[0], snap);
        var y = roundToNearestMultiple(point[1], snap);
        return [x, y];
    }

    function appendHtmlTemplate()
    {
        var template = document.createElement('template');
        template.innerHTML = htmlTemplate;
        var rootElement = document.importNode(template.content.firstChild, true);

        var body = document.getElementsByTagName('body')[0];
        body.appendChild(rootElement);

        /*
         * Trigger the jquery mobile styling.
         */
        $(rootElement).enhanceWithin();
    }

    function CGraphMenu(cgraph)
    {
        appendHtmlTemplate();

        var menuVisible = false;
        var menuContainer = document.getElementById('cgraphMenu');

        var commands =
        {
            'none':
            {
                numPoints: 0,
                create: function(points) { return ""; }
            },

            'point':
            {
                numPoints: 1,
                f:'#000', f_i: true,
                create: function(points)
                {
                    return `point p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'circle':
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    var radius = getDistance(points);
                    return `circle c ${pointsToString([points[0]])} r ${radius} ${getExtraParamsString(this)}`;
                }
            },

            'circle_l':
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    /*
                     * circle_l is specified by the end points of a line.
                     * The midpoint of the line becomes the center. And
                     * the distance from the center to either of the
                     * endpoints is the radius.
                     */
                    var cx = ((points[1][0] - points[0][0]) / 2.0) + points[0][0];
                    var cy = ((points[1][1] - points[0][1]) / 2.0) + points[0][1];

                    var radius = getDistance([[cx, cy], points[1]]);
                    return `circle c ${cx} ${cy} r ${radius} ${getExtraParamsString(this)}`;
                }
            },

            'ellipse':
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    return `ellipse p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'line': 
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    return `line p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'h_line':
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    var deltaX = points[1][0] - points[0][0];
                    return `path d (M ${points[0][0]} ${points[0][1]} h ${deltaX}) ${getExtraParamsString(this)}`;
                }
            },

            'v_line':
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    var deltaY = points[1][1] - points[0][1];
                    return `path d (M ${points[0][0]} ${points[0][1]} v ${deltaY}) ${getExtraParamsString(this)}`;
                }
            },

            'text': 
            {
                numPoints: 1,
                fs:16, fs_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    return `text p ${pointsToString(points)} t "___" ${getExtraParamsString(this)}`;
                }
            },

            'mtext': 
            {
                numPoints: 1,
                fs:16, fs_i: true,
                create: function(points)
                {
                    return `mtext b ${pointsToString(points)} 200 200 t "___" ${getExtraParamsString(this)}`;
                }
            },

            'rect': 
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    var x = Math.min(points[1][0], points[0][0]);
                    var y = Math.min(points[1][1], points[0][1]);
                    var width = Math.abs(points[1][0] - points[0][0]);
                    var height = Math.abs(points[1][1] - points[0][1]);

                    points = [[x, y], [width, height]];
                    return `rect b ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'arrow': 
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    return `arrow p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'arrow_c':
            {
                numPoints: -1,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    var interval = 17;
                    points.reverse();
                    var filteredPoints = points.filter((point, index) => index % interval == 0);
                    if ((points.length - 1) % interval != 0) filteredPoints.push(points[points.length - 1]);
                    filteredPoints.reverse();
                    return `curve d 70 me arrow ${getExtraParamsString(this)} p (${pointsToString(filteredPoints)})`;
                }
            },

            'triangle': 
            {
                numPoints: 3,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    return `triangle p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'setblob': 
            {
                numPoints: 2,
                sw: 0, sw_i: true, sc:'#000', sc_i: true, f:'#000', f_i: true,
                create: function(points)
                {
                    var x = Math.min(points[1][0], points[0][0]);
                    var y = Math.min(points[1][1], points[0][1]);
                    var width = Math.abs(points[1][0] - points[0][0]);
                    var height = Math.abs(points[1][1] - points[0][1]);

                    points = [[x, y], [width, height]];
                    return `setblob b ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'brace': 
            {
                numPoints: 3,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    return `brace p ${pointsToString(points)} ${getExtraParamsString(this)}`;
                }
            },

            'angle': 
            {
                numPoints: 3,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    return `angle p ${pointsToString(points)} a ) as 1 ${getExtraParamsString(this)}`;
                }
            },

            'func': 
            {
                numPoints: 0,
                create: function(points)
                {
                    return 'func fn (x=>___M.sin(x)) r 0 {=2*M.PI} 100';
                }
            },

            'curve':
            {
                numPoints: -1,
                sw: 0, sw_i: true, sc:'#000', sc_i: true,
                create: function(points)
                {
                    var interval = 17;
                    var filteredPoints = points.filter((point, index) => index % interval == 0);
                    if ((points.length - 1) % interval != 0) filteredPoints.push(points[points.length - 1]);
                    return `curve d 70 ${getExtraParamsString(this)} p (${pointsToString(filteredPoints)})`;
                }
            },

            'image':
            {
                numPoints: 2,
                create: function(points)
                {
                    var x = Math.min(points[1][0], points[0][0]);
                    var y = Math.max(points[1][1], points[0][1]);
                    var width = Math.abs(points[1][0] - points[0][0]);
                    var height = Math.abs(points[1][1] - points[0][1]);

                    return `img p ${x} ${y} w ${width} h ${height} url ___`;
                }
            },
        };

        var command = commands['none'];
        var points = [];

        var colorPalette = new ColorPalette("ui-overlay-shadow");

        var controls = getControls();

        var clearInsertState = () => {
            command = commands['none'];
            points = [];
            disableAllControls(controls);
        };

        ColorPalette.setBackgroundColor(controls.sc, null);
        ColorPalette.setBackgroundColor(controls.f, null);

        $(controls.snap).on("slidestart", function() { controls.enable_snap.checked = true; });
        $(controls.fs).on("slidestart", function() { controls.fs_i.checked = false; });
        $(controls.sw).on("slidestart", function() { controls.sw_i.checked = false; });

        controls.sc.addEventListener('click', function() {
            colorPalette.show(controls.sc, (color) => {
                ColorPalette.setBackgroundColor(controls.sc, color);
                controls.sc_i.checked = false;
            });
        });

        controls.f.addEventListener('click', function() {
            colorPalette.show(controls.f, (color) => {
                ColorPalette.setBackgroundColor(controls.f, color);
                controls.f_i.checked = false;
            });
        });

        var callback = null;

        function setEventListener(listener)
        {
            callback = listener;
        }

        function executeCommand()
        {
            var text = command.create(points).trim();

            if ((text != "") && callback) callback(text);

            points = [];
        }

        document.querySelectorAll("#cgraphMenuInsertButtons input").forEach(function(node) {
            node.addEventListener('click', function() {
                clearInsertState();

                var commandName = node.getAttribute('data-cgraph-menu-command');

                command = commands[commandName];
                updateControls(controls, command);

                if (command.numPoints == 0)
                {
                    executeCommand();
                    clearInsertState();
                }
            });
        });

        cgraph.setEventListener('click', function(value) {
            if (command.numPoints > 0)
            {
                if (controls.enable_snap.checked)
                {
                    var snap = parseFloat(controls.snap.value);
                    value = roundPointToSnapValue(value, snap);
                }

                points.push(value);

                if (points.length == command.numPoints)
                {
                    updateCommand(command, controls);
                    executeCommand();
                }
            }
        });

        var trackingMouse = false;

        cgraph.setEventListener('mousedown', function(value) {
            if (command.numPoints == -1)
            {
                trackingMouse = true;
                points.push(value);
            }
        });

        cgraph.setEventListener('mousemove', function(value) {
            if ((command.numPoints == -1) && trackingMouse)
            {
                points.push(value);
            }
        });

        cgraph.setEventListener('mouseup', function(value) {
            if ((command.numPoints == -1) && trackingMouse)
            {
                trackingMouse = false;

                updateCommand(command, controls);
                executeCommand();
            }
        });

        cgraph.setEventListener('contextmenu', function(value) {
            if (!menuVisible)
            {
                menuContainer.style.display = "block";
                menuVisible = true;
                clearInsertState();
                disableAllControls(controls);
            }
        });

        document.getElementById("cgraphMenuCloseButton").addEventListener('click', function() {
            menuContainer.style.display = "none";
            menuVisible = false;
            clearInsertState();
        });

        /*
         * Define the external API.
         */

        this.setEventListener = function(listener) { setEventListener(listener); }
    }

    var htmlTemplate = `<form id="cgraphMenuForm" class="ui-page-theme-a">
        <div id="cgraphMenu" class="ui-corner-all ui-content ui-overlay-shadow" style="display:none;">
            <a href="#" id="cgraphMenuCloseButton" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right">Close</a>
            <div class="ui-grid-a">
                <div class="ui-block-a">
                    <div id="cgraphMenuInsertButtons">
                        <input data-inline="true" data-mini="true" type="button" value="Point" data-cgraph-menu-command="point" />
                        <input data-inline="true" data-mini="true" type="button" value="Text" data-cgraph-menu-command="text" />
                        <input data-inline="true" data-mini="true" type="button" value="MText" data-cgraph-menu-command="mtext" />
                        <input data-inline="true" data-mini="true" type="button" value="Circle" data-cgraph-menu-command="circle" />
                        <input data-inline="true" data-mini="true" type="button" value="Circle_L" data-cgraph-menu-command="circle_l" />
                        <input data-inline="true" data-mini="true" type="button" value="Ellipse" data-cgraph-menu-command="ellipse" />
                        <input data-inline="true" data-mini="true" type="button" value="Line" data-cgraph-menu-command="line" />
                        <input data-inline="true" data-mini="true" type="button" value="H Line" data-cgraph-menu-command="h_line" />
                        <input data-inline="true" data-mini="true" type="button" value="V Line" data-cgraph-menu-command="v_line" />
                        <input data-inline="true" data-mini="true" type="button" value="Rect" data-cgraph-menu-command="rect" />
                        <input data-inline="true" data-mini="true" type="button" value="Arrow" data-cgraph-menu-command="arrow" />
                        <input data-inline="true" data-mini="true" type="button" value="Arrow_C" data-cgraph-menu-command="arrow_c" />
                        <input data-inline="true" data-mini="true" type="button" value="Func" data-cgraph-menu-command="func" />
                        <input data-inline="true" data-mini="true" type="button" value="Triangle" data-cgraph-menu-command="triangle" />
                        <input data-inline="true" data-mini="true" type="button" value="Set Blob" data-cgraph-menu-command="setblob" />
                        <input data-inline="true" data-mini="true" type="button" value="Brace" data-cgraph-menu-command="brace" />
                        <input data-inline="true" data-mini="true" type="button" value="Angle" data-cgraph-menu-command="angle" />
                        <input data-inline="true" data-mini="true" type="button" value="Curve" data-cgraph-menu-command="curve" />
                        <input data-inline="true" data-mini="true" type="button" value="Image" data-cgraph-menu-command="image" />
                    </div>
                </div>
                <div class="ui-block-b">
                    <div id="cgraphMenuControls">
                        <div>Snap:</div>
                        <div id="snapInputContainer">
                            <input type="range" id="cgraph_menu_snap" data-mini="true" min="0" max="20" step="0.1" value="5"></input>
                        </div>
                        <input type="checkbox" id="cgraph_menu_enable_snap" data-mini="true" title="Enable Snap" checked>

                        <div>Stroke:</div>
                        <div id="strokeWidthInputContainer">
                            <input type="range" id="cgraph_menu_sw" data-mini="true" min="0" max="5" step="0.25" value="1"></input>
                        </div>
                        <input type="checkbox" id="cgraph_menu_sw_i" data-mini="true" title="Inherit Stroke Width" checked>
                        <div class="color-selection-button" id="cgraph_menu_sc">sc</div>
                        <input type="checkbox" id="cgraph_menu_sc_i" data-mini="true" title="Inherit Stroke Color" checked>

                        <div>Font Size:</div>
                        <div id="fontSizeInputContainer">
                            <input type="range" id="cgraph_menu_fs" data-mini="true" min="8" max="30" step="0.5" value="16"></input>
                        </div>
                        <input type="checkbox" id="cgraph_menu_fs_i" data-mini="true" title="Inherit Font Size" checked>

                        <div class="color-selection-button" id="cgraph_menu_f">f</div>
                        <input type="checkbox" id="cgraph_menu_f_i" data-mini="true" title="Inherit Fill Color" checked>
                    </div>
                </div>
            </div>
        </div>
    </form>`;

    return CGraphMenu;
})();

