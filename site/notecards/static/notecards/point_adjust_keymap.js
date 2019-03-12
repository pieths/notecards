/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

/**
 * CodeMirror PointAdjust keymap
 */

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../lib/codemirror"), require("../addon/dialog/dialog"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../lib/codemirror", "../addon/dialog/dialog"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
    'use strict';

    var PointAdjust = function() {

        const numbersRegex = /^([-]?(?:[0-9]*[.])?[0-9]+)([ \t]*,?[ \t]+)([-]?(?:[0-9]*[.])?[0-9]+)(.*)$/;

        const MODE_ADJUST_POINT = 0;
        const MODE_UPDATE_INCREMENT = 1;

        const increments =
        [
            10000.0,
            500.0,
            250.0,
            100.0,
            50.0,
            25.0,
            10.0,
            5.0,
            2.5,
            1.0,
            0.5,
            0.25,
            0.100,
            0.050,
            0.025,
            0.010,
            0.005,
            0.0025,
            0.0010,
            0.0005,
            0.00025,
            0.0001
        ];


        function setState(cm, state) { cm.state.pointAdjustState = state; }
        function getState(cm) { return cm.state.pointAdjustState; }


        function attachPointAdjustMap(cm, prev)
        {
            initState(cm);

            CodeMirror.addClass(cm.getWrapperElement(), "cm-fat-cursor");
            CodeMirror.addClass(cm.getWrapperElement(), "point-adjust-mode");
        }


        function detachPointAdjustMap(cm, next)
        {
            CodeMirror.rmClass(cm.getWrapperElement(), "cm-fat-cursor");
            CodeMirror.rmClass(cm.getWrapperElement(), "point-adjust-mode");

            var state = getState(cm);

            if (state.mode == MODE_UPDATE_INCREMENT)
            {
                exitUpdateIncrementMode(cm);
            }

            cm.setCursor(state.startCursor);
        }


        function initState(cm)
        {
            const cursor = cm.doc.getCursor();
            const line = cm.doc.getLine(cursor.line);
            var i = cursor.ch;

            var state = getState(cm);
            if (!state)
            {
                state = {
                    prefix: "",
                    suffix: "",
                    x: 0,
                    y: 0,
                    increment: 9
                }
            }

            state.hasValues = false;
            state.mode = MODE_ADJUST_POINT;
            state.startCursor = cursor;

            if (numbersRegex.test(line.substring(i)))
            {
                while ((i > 0) && numbersRegex.test(line.substring(i - 1)))
                {
                    i--;
                }

                let match = line.substring(i).match(numbersRegex);

                state.prefix = line.substring(0, i);
                state.suffix = match[4];
                state.separator = match[2].trim() + " ";
                state.x = parseFloat(match[1]);
                state.y = parseFloat(match[3]);
                state.hasValues = true;

                if (i != cursor.ch)
                {
                    cm.setCursor(cursor.line, i);
                    state.startCursor.ch = i;
                }

                let length = match[1].length + match[2].length + match[3].length;
                cm.doc.setSelection({line: cursor.line, ch: i},
                                    {line: cursor.line, ch: i + length});
            }

            setState(cm, state);
        }


        function updateLine(cm, state)
        {
            var cursor = cm.doc.getCursor();
            cm.doc.setSelection({line: cursor.line, ch: 0},
                                {line: cursor.line, ch: cursor.line.length});

            var pointString = state.x + state.separator + state.y;
            var newLine = state.prefix + pointString + state.suffix;

            cm.doc.replaceSelection(newLine);
            cm.doc.setCursor(cursor);

            cm.doc.setSelection({line: cursor.line, ch: state.prefix.length},
                                {line: cursor.line, ch: state.prefix.length + pointString.length});
        }


        function moveToPreviousPoint(cm)
        {
            var foundPoint = false;

            const cursor = cm.doc.getCursor('from');
            const lastLineNumber = Math.max(cursor.line - 2, 0);

            var i = cursor.ch;
            var lineNumber = cursor.line;

            var line = cm.doc.getLine(lineNumber)
            line = line.substring(0, i);

            while (true)
            {
                if (numbersRegex.test(line.substring(i)))
                {
                    foundPoint = true;
                    break;
                }
                else
                {
                    if (i > 0) i--;
                    else if (lineNumber > lastLineNumber)
                    {
                        lineNumber--;
                        line = cm.doc.getLine(lineNumber);
                        i = line.length;
                    }
                    else break;
                }
            }

            if (foundPoint)
            {
                cm.doc.setCursor(lineNumber, i);
                initState(cm);
            }
        }


        function moveToNextPoint(cm)
        {
            var foundPoint = false;

            const cursor = cm.doc.getCursor('to');
            const lastLineNumber = Math.min(cursor.line + 2, cm.doc.lastLine());

            var i = cursor.ch;
            var lineNumber = cursor.line;

            var line = cm.doc.getLine(lineNumber)

            while (true)
            {
                if (numbersRegex.test(line.substring(i)))
                {
                    foundPoint = true;
                    break;
                }
                else
                {
                    if (i < (line.length - 1)) i++;
                    else if (lineNumber < lastLineNumber)
                    {
                        lineNumber++;
                        line = cm.doc.getLine(lineNumber);
                        i = 0;
                    }
                    else break;
                }
            }

            if (foundPoint)
            {
                cm.doc.setCursor(lineNumber, i);
                initState(cm);
            }
        }


        function enterUpdateIncrementMode(cm)
        {
            var state = getState(cm);

            if (state.mode != MODE_UPDATE_INCREMENT)
            {
                state.mode = MODE_UPDATE_INCREMENT;

                if (!state.incrementDialog)
                {
                    state.incrementDialog = document.createElement('div');
                    state.incrementDialog.setAttribute('class', 'point-adjust-increment-dialog');
                }

                updateIncrementDialog(cm);
                state.incrementDialogCloseFunc = cm.openNotification(state.incrementDialog,
                                                                     {duration: 0});
            }
        }


        function updateIncrementDialog(cm)
        {
            var state = getState(cm);
            var text = "Increment: " + increments[state.increment];

            state.incrementDialog.textContent = text;
        }


        function exitUpdateIncrementMode(cm)
        {
            var state = getState(cm);

            if (state.mode == MODE_UPDATE_INCREMENT)
            {
                state.mode = MODE_ADJUST_POINT;
                state.incrementDialogCloseFunc();
            }
        }


        function exitPointAdjustMode(cm)
        {
            window.setTimeout(function() {
                cm.setOption("keyMap", "vim");
            }, 0);
        }


        function roundToNearestMultiple(num, multiple)
        {
            return Math.round(num / multiple) * multiple;
        }


        function processKey(key, cm)
        {
            if (key == "Ctrl-[")
            {
                return exitPointAdjustMode;
            }
            else if (key == "Esc")
            {
                return exitPointAdjustMode;
            }
            else if (key == "B")
            {
                return moveToPreviousPoint;
            }
            else if (key == "W")
            {
                return moveToNextPoint;
            }

            var state = getState(cm);

            if (state.mode == MODE_ADJUST_POINT)
            {
                if (key == "I")
                {
                    return enterUpdateIncrementMode;
                }
                else if (state.hasValues)
                {
                    let increment = increments[state.increment];

                    if (key == "J") state.y -= increment;
                    else if (key == "K") state.y += increment;
                    else if (key == "H") state.x -= increment;
                    else if (key == "L") state.x += increment;
                    else if (key == "S")
                    {
                        state.x = roundToNearestMultiple(state.x, increment);
                        state.y = roundToNearestMultiple(state.y, increment);
                    }

                    state.x = Math.round(state.x * 1000) / 1000;
                    state.y = Math.round(state.y * 1000) / 1000;

                    updateLine(cm, state);
                }
            }
            else if (state.mode == MODE_UPDATE_INCREMENT)
            {
                if ((key == "I") || (key == "Enter"))
                {
                    return exitUpdateIncrementMode;
                }
                else if ((key == "K") || (key == "H"))
                {
                    if (state.increment > 0)
                    {
                        state.increment--;
                        updateIncrementDialog(cm);
                    }
                }
                else if ((key == "J") || (key == "L"))
                {
                    if (state.increment < (increments.length - 1))
                    {
                        state.increment++;
                        updateIncrementDialog(cm);
                    }
                }
            }

            return function(cm) { }
        }


        CodeMirror.keyMap.pointAdjust = {
            attach: attachPointAdjustMap,
            detach: detachPointAdjustMap,
            call: processKey
        };

        /*
         * Return the public API.
         */
        return { };
    };

    // Initialize PointAdjust and make it available as an API.
    CodeMirror.PointAdjust = PointAdjust();
});
