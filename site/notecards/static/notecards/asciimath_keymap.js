/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

/**
 * CodeMirror AsciiMath keymap
 */

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../lib/codemirror"), require("../addon/search/searchcursor"), require("../addon/dialog/dialog"), require("../addon/edit/matchbrackets.js"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../lib/codemirror", "../addon/search/searchcursor", "../addon/dialog/dialog", "../addon/edit/matchbrackets"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
    'use strict';

    var AsciiMath = function() {

        var buffer = "";
        var placeholder = "___";
        var nextPlaceHolderRegex = /___/;
        var isLetterOrNumberRegex = /[A-Za-z0-9]/;
        var auxiliaryKeyEventListener = null;

        var keyMap =
        {
            "A": "a",
            "B": "b",
            "C": "c",
            "D": "d",
            "E": "e",
            "F": "f",
            "G": "g",
            "H": "h",
            "I": "i",
            "J": "j",
            "K": "k",
            "L": "l",
            "M": "m",
            "N": "n",
            "O": "o",
            "P": "p",
            "Q": "q",
            "R": "r",
            "S": "s",
            "T": "t",
            "U": "u",
            "V": "v",
            "W": "w",
            "X": "x",
            "Y": "y",
            "Z": "z",
            "`": "`",
            "1": "1",
            "2": "2",
            "3": "3",
            "4": "4",
            "5": "5",
            "6": "6",
            "7": "7",
            "8": "8",
            "9": "9",
            "0": "0",
            "-": "-",
            "=": "=",
            "[": "[",
            "]": "]",
            "\\": "\\",
            ";": ";",
            "'": "'",
            ",": ",",
            ".": ".",
            "/": "/",
            "Shift-A": "A",
            "Shift-B": "B",
            "Shift-C": "C",
            "Shift-D": "D",
            "Shift-E": "E",
            "Shift-F": "F",
            "Shift-G": "G",
            "Shift-H": "H",
            "Shift-I": "I",
            "Shift-J": "J",
            "Shift-K": "K",
            "Shift-L": "L",
            "Shift-M": "M",
            "Shift-N": "N",
            "Shift-O": "O",
            "Shift-P": "P",
            "Shift-Q": "Q",
            "Shift-R": "R",
            "Shift-S": "S",
            "Shift-T": "T",
            "Shift-U": "U",
            "Shift-V": "V",
            "Shift-W": "W",
            "Shift-X": "X",
            "Shift-Y": "Y",
            "Shift-Z": "Z",
            "Shift-`": "~",
            "Shift-1": "!",
            "Shift-2": "@",
            "Shift-3": "#",
            "Shift-4": "$",
            "Shift-5": "%",
            "Shift-6": "^",
            "Shift-7": "&",
            "Shift-8": "*",
            "Shift-9": "(",
            "Shift-0": ")",
            "Shift--": "_",
            "Shift-=": "+",
            "Shift-[": "{",
            "Shift-]": "}",
            "Shift-\\": "|",
            "Shift-;": ":",
            "Shift-'": "\"",
            "Shift-,": "<",
            "Shift-.": ">",
            "Shift-/": "?"
        };

        function attachAsciiMathMap(cm, prev)
        {
        }

        function detachAsciiMathMap(cm, next)
        {
            buffer = "";
        }

        function isCursorOnPlaceholder(cm)
        {
            var cursor = cm.doc.getCursor();
            var line = cm.doc.getLine(cursor.line);

            var nextChars = line.substring(cursor.ch, cursor.ch + placeholder.length);
            return nextChars === placeholder;
        }

        function deleteNextChars(cm, numChars)
        {
            var cursor = cm.doc.getCursor();
            cm.doc.setSelection(cursor, {line: cursor.line, ch: cursor.ch + numChars});
            cm.doc.replaceSelection("", "start");
        }

        function getPreviousChar(cm)
        {
            var cursor = cm.doc.getCursor();
            var prevChar = '';

            if (cursor.ch == 0)
            {
                if (cursor.line > 0)
                {
                    var prevLine = cm.doc.getLine(cursor.line - 1);
                    prevChar = prevLine.charAt(prevLine.length - 1);
                }
            }
            else
            {
                var line = cm.doc.getLine(cursor.line);
                prevChar = line.charAt(cursor.ch - 1);
            }

            return prevChar;
        }

        function atStart(cm)
        {
            var cursor = cm.doc.getCursor();
            var line = cm.doc.getLine(cursor.line);

            var result = ((cursor.ch > 1) &&
                          (line.charAt(cursor.ch - 1) == '[') &&
                          (line.charAt(cursor.ch - 2) == '$'))
            return result;
        }

        function atEnd(cm)
        {
            var cursor = cm.doc.getCursor();
            var line = cm.doc.getLine(cursor.line);

            var result = ((cursor.ch < (line.length - 1)) &&
                          (line.charAt(cursor.ch) == ']') &&
                          (line.charAt(cursor.ch + 1) == '$'));
            return result;
        }

        function goCharRight(cm)
        {
            if (!atEnd(cm))
            {
                buffer = "";
                cm.execCommand('goCharRight');
            }
        }

        function goCharLeft(cm)
        {
            if (!atStart(cm))
            {
                buffer = "";
                cm.execCommand('goCharLeft');
            }
        }

        function handleSpacePressed(cm)
        {
            if (isCursorOnPlaceholder(cm))
            {
                deleteNextChars(cm, placeholder.length);
            }
            else
            {
                if (buffer !== "")
                {
                    processBuffer(cm);
                }
                else
                {
                    goCharRight(cm);
                }
            }
        }

        function findClosingDelimiter(cm)
        {
            var sc = cm.getSearchCursor(']$', cm.doc.getCursor());
            sc.findNext();
            return sc.from();
        }

        function jumpToEndAndExit(cm)
        {
            var endPos = findClosingDelimiter(cm);
            cm.setCursor(endPos.line, endPos.ch + 1);
            exitAsciiMathMode(cm);
        }

        function insertSpace(cm)
        {
            cm.doc.replaceSelection(" ");
        }

        function checkRemovePlaceholder(cm)
        {
            if (isCursorOnPlaceholder(cm))
            {
                deleteNextChars(cm, placeholder.length);
            }
        }

        function exitAsciiMathMode(cm)
        {
            window.setTimeout(function() {
                cm.setOption("keyMap", "vim");
            }, 0);
        }

        function jumpToNextPlaceholder(cm, keep)
        {
            var jumped = false;

            var cursor = cm.doc.getCursor();
            var sc = cm.getSearchCursor(placeholder, {line: cursor.line, ch: cursor.ch+1});

            if (sc.findNext())
            {
                if ((keep === undefined) || !keep) sc.replace("");
                cm.setCursor(sc.from());

                jumped = true;
            }

            return jumped;
        }

        function jumpToPreviousPlaceholder(cm, keep)
        {
            var jumped = false;

            var sc = cm.getSearchCursor(placeholder, cm.doc.getCursor());
            if (sc.findPrevious())
            {
                if ((keep === undefined) || !keep) sc.replace("");
                cm.setCursor(sc.from());

                jumped = true;
            }

            return jumped;
        }

        function insertEquals(cm)
        {
            var equalsString = "= ";

            var cursor = cm.doc.getCursor();
            var line = cm.doc.getLine(cursor.line);
            var previousChars = line.substring(cursor.ch - 2, cursor.ch);

            if ((previousChars == "> ") ||
                (previousChars == "< ") ||
                (previousChars == "- ") ||
                (previousChars == "! ") ||
                (previousChars == "~ ") ||
                (previousChars == "= "))
            {
                cm.doc.setSelection({line: cursor.line, ch: cursor.ch - 1}, cursor);
                cm.doc.replaceSelection(equalsString);
            }
            else
            {
                if (previousChars.length > 1)
                {
                    previousChars = previousChars.charAt(previousChars.length - 1);
                }

                if ("`({[ !~-<>=".indexOf(previousChars) == -1)
                {
                    equalsString = " " + equalsString;
                }

                cm.doc.replaceSelection(equalsString);
            }
        }

        function insertComma(cm)
        {
            let cursor = cm.doc.getCursor();
            let line = cm.doc.getLine(cursor.line);
            let nextChar = line.charAt(cursor.ch);

            if (" \t".includes(nextChar))
            {
                cm.doc.replaceSelection(",");
                goCharRight(cm);
            }
            else
            {
                cm.doc.replaceSelection(", ");
            }
        }

        function insertWithLeadingSpace(cm, string)
        {
            var cursor = cm.doc.getCursor();
            var line = cm.doc.getLine(cursor.line);
            var previousCh = line.substring(cursor.ch - 1, cursor.ch);

            if ("`({[ ".indexOf(previousCh) === -1)
            {
                string = " " + string;
            }

            cm.doc.replaceSelection(string);
        }

        function setAuxiliaryKeyEventListener(listener)
        {
            auxiliaryKeyEventListener = listener;
        }

        function dispatchAuxiliaryKeyEvent(cm, key)
        {
            if (typeof auxiliaryKeyEventListener === "function")
            {
                auxiliaryKeyEventListener(cm, key);
            }
        }

        function replaceCommand(cm, commandLength, replacementText, attachToPrevious)
        {
            var cursor = cm.doc.getCursor();

            if (!Boolean(attachToPrevious))
            {
                var line = cm.doc.getLine(cursor.line);
                var previousCh = line.charAt(cursor.ch - commandLength - 1);

                if (" `({[".indexOf(previousCh) === -1) replacementText = " " + replacementText;
            }


            cm.doc.setSelection({line: cursor.line, ch: cursor.ch - commandLength}, cursor);
            cm.doc.replaceSelection(replacementText, "start");

            jumpToNextPlaceholder(cm);
        }

        function startFuncMode(cm)
        {
            var prefix = "FUNC:";
            var template = '<span style="font-family: monospace; white-space: pre">' +
                    (prefix || "") + '<input type="text"></span>';

            cm.openDialog(template, function(value) {
                    executeFunc(cm, value);
                },
                {
                    bottom: true,
                    value: "",
                    onKeyDown: ()=>{},
                    onKeyUp: ()=>{},
                    selectValueOnOpen: false
                });
        }

        function executeFunc(cm, funcString)
        {
            var params = funcString.split(',');
            for (var i=0; i < params.length; i++)
            {
                params[i] = params[i].trim();
            }

            if (params.length > 0)
            {
                var funcName = params.shift();

                if (funcs.hasOwnProperty(funcName))
                {
                    funcs[funcName](cm, params);
                }
            }
        }

        function processBuffer(cm)
        {
            var commandProcessed = false;

            if (buffer !== "")
            {
                if (commands.hasOwnProperty(buffer))
                {
                    commands[buffer](cm);
                    commandProcessed = true;
                }

                buffer = "";
            }

            return commandProcessed;
        }

        function processStandardKey(key, cm)
        {
            if (!keyMap.hasOwnProperty(key)) return;
            key = keyMap[key];

            checkRemovePlaceholder(cm);

            if (isLetterOrNumberRegex.test(key) || buffer.startsWith("mat"))
            {
                buffer += key;
            }
            else
            {
                processBuffer(cm);
            }

            if ("+-<>!~".includes(key))
            {
                insertWithLeadingSpace(cm, key + " ");
            }
            else if (key === "=")
            {
                insertEquals(cm);
            }
            else if (key === ",")
            {
                insertComma(cm);
            }
            else
            {
                cm.doc.replaceSelection(key);
            }
        }

        function processKey(key, cm)
        {
            if ((key == "Ctrl-[") || (key == "Esc"))
            {
                return exitAsciiMathMode;
            }
            else if (key == "Space")
            {
                return handleSpacePressed;
            }
            else if (key == "Shift-Space")
            {
                return goCharLeft;
            }
            else if (key == "Ctrl-Space")
            {
                return insertSpace;
            }
            else if (key == "Ctrl-0")
            {
                return jumpToEndAndExit;
            }
            else if (key == "Ctrl-F")
            {
                return startFuncMode;
            }
            else if (key == "Ctrl-8")
            {
                return function(cm) {
                    checkRemovePlaceholder(cm);
                    processBuffer(cm);
                    cm.doc.replaceSelection("*");
                };
            }
            else if (key == "Shift-8")
            {
                return function(cm) {
                    checkRemovePlaceholder(cm);
                    processBuffer(cm);

                    var prevChar = getPreviousChar(cm);
                    if (prevChar != " ") cm.doc.replaceSelection(" ");
                };
            }
            else if (key == "Ctrl-/")
            {
                return function(cm) {
                    checkRemovePlaceholder(cm);
                    processBuffer(cm);

                    replaceCommand(cm, 0,
                        "{" + placeholder + "} / " +
                        "{" + placeholder + "}" + placeholder);
                };
            }
            else if (key == "Backspace")
            {
                return function(cm) {
                    if (!atStart(cm))
                    {
                        cm.execCommand('delCharBefore');

                        if (buffer.length > 0)
                        {
                            buffer = buffer.slice(0, -1);
                        }
                    }
                };
            }
            else if (key == "Enter")
            {
                return function(cm) {
                    checkRemovePlaceholder(cm);
                    cm.doc.replaceSelection("\n");
                    buffer = "";
                };
            }
            else if (key == "Tab")
            {
                return function(cm) {
                    if (isCursorOnPlaceholder(cm))
                    {
                        deleteNextChars(cm, placeholder.length);
                        jumpToNextPlaceholder(cm);
                    }
                    else
                    {
                        if (buffer !== "")
                        {
                            if (!processBuffer(cm))
                            {
                                jumpToNextPlaceholder(cm);
                            }
                        }
                        else jumpToNextPlaceholder(cm, true);
                    }

                    buffer = "";
                };
            }
            else if (key == "Shift-Tab")
            {
                return function(cm) {
                    jumpToPreviousPlaceholder(cm, true);
                };
            }
            else if (key.startsWith("Shift-Ctrl-"))
            {
                return function(cm) {
                    dispatchAuxiliaryKeyEvent(cm, key.substring(11));
                };
            }
            else if (key == "Right")
            {
                return goCharRight;
            }
            else if (key == "Left")
            {
                return goCharLeft;
            }
            else
            {
                return function(cm) { processStandardKey(key, cm); }
            }
        }

        var commands = {};
        commands['int'] = function(cm)
        {
            replaceCommand(cm, 3,
                    "int " + placeholder);
        };
        commands['intt'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "int " + placeholder +
                    " d" + placeholder +
                    " " + placeholder);
        };
        commands['dintt'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "int_{" + placeholder + "}" +
                    "^{" + placeholder + "} " + placeholder +
                    " d" + placeholder + " " + placeholder);
        };
        commands['limt'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "lim_{" + placeholder +  " -> " + placeholder + "} " + placeholder);
        };
        commands['sum'] = function(cm)
        {
            replaceCommand(cm, 3,
                    "sum " + placeholder);
        };
        commands['sumt'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "sum_{" + placeholder + "}" +
                    "^{" + placeholder + "} " + placeholder);
        };
        commands['roott'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "root{" + placeholder + "}" +
                    "{" + placeholder + "}" + placeholder);
        };
        commands['pow'] = function(cm)
        {
            replaceCommand(cm, 3,
                    "^{" + placeholder + "}" + placeholder, true);
        };
        commands['sub'] = function(cm)
        {
            replaceCommand(cm, 3,
                    "_{" + placeholder + "}" + placeholder, true);
        };
        commands['sqrtt'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "sqrt{" + placeholder + "}" + placeholder);
        };
        commands['abst'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "abs{" + placeholder + "}" + placeholder);
        };
        commands['hatt'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "hat{" + placeholder + "}" + placeholder);
        };
        commands['bart'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "bar{" + placeholder + "}" + placeholder);
        };
        commands['vect'] = function(cm)
        {
            replaceCommand(cm, 4,
                    "vec{" + placeholder + "}" + placeholder);
        };
        commands['normt'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "norm{" + placeholder + "}" + placeholder);
        };
        commands['floort'] = function(cm)
        {
            replaceCommand(cm, 6,
                    "floor{" + placeholder + "}" + placeholder);
        };
        commands['ceilt'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "ceil{" + placeholder + "}" + placeholder);
        };
        commands['obrace'] = function(cm)
        {
            replaceCommand(cm, 6,
                    "obrace(" + placeholder + ")^(" +
                    placeholder + ")" + placeholder);
        };
        commands['ubrace'] = function(cm)
        {
            replaceCommand(cm, 6,
                    "ubrace(" + placeholder + ")_(" +
                    placeholder + ")" + placeholder);
        };
        commands['overset'] = function(cm)
        {
            replaceCommand(cm, 7,
                    "overset(" + placeholder + ")(" +
                    placeholder + ")" + placeholder);
        };
        commands['underset'] = function(cm)
        {
            replaceCommand(cm, 8,
                    "underset(" + placeholder + ")(" +
                    placeholder + ")" + placeholder);
        };
        commands['inf'] = function(cm)
        {
            replaceCommand(cm, 3, "oo" + placeholder);
        };
        commands['perp'] = function(cm)
        {
            replaceCommand(cm, 4, "_|_ " + placeholder);
        };
        commands['implies'] = function(cm)
        {
            replaceCommand(cm, 7, "=> " + placeholder);
        };
        commands['forall'] = function(cm)
        {
            replaceCommand(cm, 6, "AA " + placeholder);
        };
        commands['AA'] = function(cm)
        {
            replaceCommand(cm, 2, "AA " + placeholder);
        };
        commands['in'] = function(cm)
        {
            replaceCommand(cm, 2, "in " + placeholder);
        };
        commands['EE'] = function(cm)
        {
            replaceCommand(cm, 2, "EE " + placeholder);
        };
        commands['iff'] = function(cm)
        {
            replaceCommand(cm, 3, "iff " + placeholder);
        };
        commands['notin'] = function(cm)
        {
            replaceCommand(cm, 5, "!in " + placeholder);
        };
        commands['mod'] = function(cm)
        {
            replaceCommand(cm, 3, "mod " + placeholder);
        };
        commands['plusm'] = function(cm)
        {
            replaceCommand(cm, 5, "+-" + placeholder);
        };
        commands['to'] = function(cm)
        {
            replaceCommand(cm, 2, "to " + placeholder);
        };
        commands['mapsto'] = function(cm)
        {
            replaceCommand(cm, 6, "mapsto " + placeholder);
        };
        commands['and'] = function(cm)
        {
            replaceCommand(cm, 3, "and " + placeholder);
        };
        commands['or'] = function(cm)
        {
            replaceCommand(cm, 2, "or " + placeholder);
        };
        commands['subset'] = function(cm)
        {
            replaceCommand(cm, 6, "subset " + placeholder);
        };
        commands['subseteq'] = function(cm)
        {
            replaceCommand(cm, 8, "subseteq " + placeholder);
        };
        commands['supset'] = function(cm)
        {
            replaceCommand(cm, 6, "supset " + placeholder);
        };
        commands['supseteq'] = function(cm)
        {
            replaceCommand(cm, 8, "supseteq " + placeholder);
        };
        commands['bbt'] = function(cm)
        {
            replaceCommand(cm, 3,
                    'bb "' + placeholder + '"' + placeholder);
        };
        commands['mat2r'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[[" + placeholder + "], [" + placeholder + "]] " +
                    placeholder);
        };
        commands['mat3r'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[" +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]] " +
                    placeholder);
        };
        commands['mat4r'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[" +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]] " +
                    placeholder);
        };
        commands['mat5r'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[" +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]," +
                    "[" + placeholder + "]] " +
                    placeholder);
        };
        commands['mat2i'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[[1, 0], [0, 1]]" + placeholder);
        };
        commands['mat3i'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[[1, 0, 0],[0, 1, 0],[0, 0, 1]]" + placeholder);
        };
        commands['matni'] = function(cm)
        {
            replaceCommand(cm, 5,
                    "[[1_1, 0, 0, cdots, 0]," + 
                     "[0, 1_2, 0, cdots, 0]," + 
                     "[0, 0, 1_3, cdots, 0]," + 
                     "[vdots, vdots, vdots, ddots, vdots]," + 
                     "[0, 0, 0, cdots, 1_n]]" + placeholder);
        };


        var funcs = {};
        funcs['seq'] = function(cm, params)
        {
            /*
             * hseqn = horizontal sequence with specified separator
             * param[0] = expression
             * param[1] = separator. An empty string is the same as a space character " ".
             * param[2] = an expression of the form [a-zA-Z]+=[digit]+..[a-zA-Z]
             *            ex. ii=1..n
             *              This replaces all occurences of ii in the expression with values
             *              from the specified sequence. Note, n can also be a number in which
             *              case it will run through all the numbers in order.
             * param[3..n] = same as param[2]
             */

            if (params.length < 3) return;

            var expression = params[0];
            var separator = params[1];
            
            if (separator === "") separator = "\\ \\ ";
            else if (/\S+/.test(separator)) separator = " " + separator + " ";

            var rangeRegex = /^([a-zA-Z]+)=(\d+)\.\.([a-zA-Z]|\d+)$/;

            var placeholders = [];

            for (var i=2; i < params.length; i++)
            {
                var result = rangeRegex.exec(params[i]);
                if (result)
                {
                    var placeholder = {};
                    placeholder.key = result[1];
                    placeholder.index = result[2];
                    placeholder.startIndex = result[2];
                    placeholder.endIndex = result[3];

                    placeholder.regex = new RegExp(placeholder.key, 'g');

                    placeholder.requiresCdots = /\d+/.test(placeholder.endIndex) ?
                        (Number(placeholder.endIndex) - Number(placeholder.startIndex)) > 3 :
                        true;

                    placeholders.push(placeholder);
                }
            }

            if (placeholders.length === 0) return;

            var incrementPlaceholderIndices = () => {
                placeholders.forEach((placeholder) => {
                    placeholder.index++;
                }
            )};

            var updatePlaceholdersInString = (string, useIndex) => {
                placeholders.forEach((placeholder) => {
                    placeholder.regex.lastIndex = 0;
                    string = string.replace(placeholder.regex,
                                            useIndex ? placeholder.index : placeholder.endIndex);
                });

                return string;
            };

            if (placeholders[0].requiresCdots)
            {
                var text = "";

                text += updatePlaceholdersInString(expression, true) + separator;
                incrementPlaceholderIndices();

                text += updatePlaceholdersInString(expression, true) + separator;
                incrementPlaceholderIndices();

                text += updatePlaceholdersInString(expression, true) + separator;
                incrementPlaceholderIndices();

                text += "cdots" + separator;
                text += updatePlaceholdersInString(expression, false);

                cm.doc.replaceSelection(text);
            }
            else
            {
                var numExpressionsInSequence = (placeholders[0].endIndex - placeholders[0].startIndex) + 1;

                var text = "";

                text += updatePlaceholdersInString(expression, true);
                incrementPlaceholderIndices();

                for (var i=1; i < numExpressionsInSequence; i++)
                {
                    text += separator;
                    text += updatePlaceholdersInString(expression, true);
                    incrementPlaceholderIndices();
                }

                cm.doc.replaceSelection(text);
            }
        }
        funcs['seqc'] = function(cm, params)
        {
            if (params.length >= 2)
            {
                var newParams = [params[0], ",", params[1]];

                for (var i=2; i < params.length; i++)
                {
                    newParams.push(params[i]);
                }

                funcs['seq'](cm, newParams);
            }
        }
        funcs['seqc1n'] = function(cm, params)
        {
            if (params.length === 1)
            {
                var newParams = [params[0], ",", "i=1..n"];
                funcs['seq'](cm, newParams);
            }
        }
        funcs['seq1n'] = function(cm, params)
        {
            if (params.length === 2)
            {
                var newParams = [params[0], params[1], "i=1..n"];
                funcs['seq'](cm, newParams);
            }
        }
        funcs['dot1n'] = function(cm, params)
        {
            if (params.length === 2)
            {
                var newParams = [params[0] + " " + params[1], "+", "i=1..n"];
                funcs['seq'](cm, newParams);
            }
        }
        funcs['lincom1n'] = function(cm, params)
        {
            if (params.length === 2)
            {
                var newParams = [params[0] + " " + params[1], "+", "i=1..n"];
                funcs['seq'](cm, newParams);
            }
        }
        funcs['vec'] = function(cm, params)
        {
            /*
             * param[0] = The text to use for each position.
             * param[1] = Either a number which represents the number of components
             *            or, a single letter which is used as the final subscript
             *            for an indeterminate length vector.
             * param[2] = If specified, the text to replace in the first parameter
             *            with the subscript.
             */

            if ((params.length == 2) || (params.length == 3))
            {
                var text = "";

                var placeHolder = (params.length == 3) ? params[2].trim() : "";

                var fmt = (placeHolder.length == 0) ?
                    (subscript) => { return params[0] + "_" + subscript; } :
                    (subscript) => { return params[0].replace(new RegExp(placeHolder,'g'), subscript); };

                if (/\d+/.test(params[1]))
                {
                    var text = "[";

                    for (var i=1; i < params[1]; i++)
                    {
                        text += "[" + fmt(i) + "],";
                    }

                    text += "[" + fmt(params[1]) + "]";
                    text += "]";
                }
                else if (/[a-zA-Z]/.test(params[1]))
                {
                    var text = "[";
                    text += "[" + fmt(1) + "],";
                    text += "[" + fmt(2) + "],";
                    text += "[" + fmt(3) + "],";
                    text += "[vdots],";
                    text += "[" + fmt(params[1]) + "]";
                    text += "]";
                }

                if (text !== "")
                {
                    cm.doc.replaceSelection(text);
                }
            }
        }
        funcs['mat'] = function(cm, params)
        {
            /*
             * param[0] = The text to use for each position.
             * param[1] = Either a number which represents the number of rows,
             *            or a letter which is the letter to use in the subscript
             *            to represent an arbtrary number of rows. If a letter is
             *            used here then three vertical dots will be used to
             *            separate the last row from the previous one.
             * param[2] = Either a number which represents the number of columns,
             *            or a letter which is the letter to use in the subscript
             *            to represent an arbtrary number of columns. If a letter is
             *            used here then three horizontal dots will be used to
             *            separate the last column from the previous one.
             * param[3] = If this parameter is specified, then it represents the
             *            text in the first parameter which should be replaced with
             *            the subscript values.
             */

            var v = "";
            var m = "m";
            var n = "n";
            var text = "";
            var placeHolder = (params.length == 4) ? params[3].trim() : "";

            var isLetterRegex = /^[a-zA-Z]$/;

            if (params.length === 1)
            {
                v = params[0];
            }
            else if (params.length >= 3)
            {
                v = params[0];

                if (isLetterRegex.test(params[1]))
                {
                    m = params[1];
                }
                else
                {
                    m = parseInt(params[1]);
                    if (isNaN(m)) m = "m";
                }

                if (isLetterRegex.test(params[2]))
                {
                    n = params[2];
                }
                else
                {
                    n = parseInt(params[2]);
                    if (isNaN(n)) n = "n";
                }
            }

            var fmt = (placeHolder.length == 0) ?
                (value, m, n, addComma) => {
                    return value + "_{" + m + " " + n + "}" + (addComma ? ", " : "");
                } :
                (value, m, n, addComma) => {
                    return value.replace(new RegExp(placeHolder,'g'), `{${m} ${n}}`)
                           + (addComma ? ", " : "");
                };

            if (isLetterRegex.test(m))
            {
                if (isLetterRegex.test(n))
                {
                    text = "[";
                    text += "[" + fmt(v, 1, 1, true) + fmt(v, 1, 2, true) + fmt(v, 1, 3, true) + "cdots, " + fmt(v, 1, n, false) + "],\n";
                    text += "[" + fmt(v, 2, 1, true) + fmt(v, 2, 2, true) + fmt(v, 2, 3, true) + "cdots, " + fmt(v, 2, n, false) + "],\n";
                    text += "[" + fmt(v, 3, 1, true) + fmt(v, 3, 2, true) + fmt(v, 3, 3, true) + "cdots, " + fmt(v, 3, n, false) + "],\n";
                    text += "[vdots, vdots, vdots, ddots, vdots],\n";
                    text += "[" + fmt(v, m, 1, true) + fmt(v, m, 2, true) + fmt(v, m, 3, true) + "cdots, " + fmt(v, m, n, false) + "]";
                    text += "]";
                }
                else if (typeof(n) === "number")
                {
                    var text = "[";

                    for (var j=1; j <= 3; j++)
                    {
                        text += "[";
                        for (var i=1; i <= n; i++) text += fmt(v, j, i, i < n);
                        text += "],\n";
                    }

                    text += "[";
                    for (var i=1; i < n; i++) text += "vdots, ";
                    text += "vdots],";

                    text += "[";
                    for (var i=1; i <= n; i++) text += fmt(v, m, i, i < n);
                    text += "]";

                    text += "]";
                }
            }
            else if (typeof(m) === "number")
            {
                if (isLetterRegex.test(n))
                {
                    var text = "[";

                    for (var i=1; i < m; i++)
                    {
                        text += "[" + fmt(v,i,1,1) + fmt(v,i,2,1) + fmt(v,i,3,1) + " cdots, " + fmt(v,i,n,0) + "],\n";
                    }

                    text += "[" + fmt(v,m,1,1) + fmt(v,m,2,1) + fmt(v,m,3,1) + " cdots, " + fmt(v,m,n,0) + "]";
                    text += "]";
                }
                else if (typeof(n) === "number")
                {
                    var text = "[";

                    for (var i=1; i < m; i++)
                    {
                        text += "[";
                        for (var j=1; j <= n; j++) text += fmt(v, i, j, j < n);
                        text += "],\n";
                    }

                    text += "[";
                    for (var j=1; j <= n; j++) text += fmt(v, m, j, j < n);
                    text += "]";

                    text += "]";
                }
            }

            if (text !== "")
            {
                cm.doc.replaceSelection(text);
            }
        }


        CodeMirror.keyMap.asciimath = {
            attach: attachAsciiMathMap,
            detach: detachAsciiMathMap,
            call: processKey
        };

        /*
         * Return the public API.
         */
        return {
            setAuxiliaryKeyEventListener: setAuxiliaryKeyEventListener
        };
    };

    // Initialize AsciiMath and make it available as an API.
    CodeMirror.AsciiMath = AsciiMath();
});
