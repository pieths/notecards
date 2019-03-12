/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const CodeMirrorUtils = (function() {

    var lastFocusedEditor = null;
    var saveCallback = null;
    var exitCallback = null;
    var queryTextEditor = null;
    var answerTextEditor = null;

    var templates =
    {
        'cgraph': '\n::: cgraph 1\ninit w 30em r -10 -10 150 100 fss 0.333; grid; axis;\n___\n:::',
        'python': '\n``` python\n___\n```',
        'py': '\n``` python\n___\n```',
        'console': '\n``` console\n___\n```',
        'js': '\n``` javascript\n___\n```'
    };

    function setSaveCallback(callback)
    {
        saveCallback = callback;
    }

    function setExitCallback(callback)
    {
        exitCallback = callback;
    }

    function inCGraphContent()
    {
        if (lastFocusedEditor == null) return false;

        var result = false;
        var editor = lastFocusedEditor;
        var currentPos = editor.getCursor();

        var sc = editor.getSearchCursor('::: cgraph', currentPos);
        if (sc.findPrevious())
        {
            var contentStartPos = sc.from();

            sc = editor.getSearchCursor(/:::(?! cgraph)/, currentPos);
            if (sc.findPrevious())
            {
                var contentEndPos = sc.from();
                result = (contentEndPos.line < contentStartPos.line) ||
                         ((contentEndPos.line == contentStartPos.line) &&
                          (contentEndPos.ch < contentStartPos.ch));
            }
            else result = true;
        }

        return result;
    }

    function addCGraphTextToEditor(text)
    {
        if (!inCGraphContent()) return;

        var editor = lastFocusedEditor;
        var line = editor.doc.getLine(editor.getCursor().line);
        if (line.length > 0)
        {
            editor.execCommand('goLineEnd');
            editor.replaceSelection("\n");
        }

        editor.replaceSelection(text);

        if (text.indexOf("___") >= 0)
        {
            var sc = editor.getSearchCursor('___', editor.getCursor());
            if (sc.findPrevious())
            {
                var target = sc.from();
                sc.replace("");
                editor.setCursor(target);
            }
        }

        editor.focus();
    }

    function init(queryTextArea, answerTextArea, queryPreviewer, answerPreviewer, options)
    {
        var enableVimMode = true;
        var autoUpdatePreview = true;
        var autoUpdateDelay = 1500;
        var snapMultiple = 1;

        if (options)
        {
            if (options.hasOwnProperty('enableVimMode')) enableVimMode = !!(options.enableVimMode);
            if (options.hasOwnProperty('autoUpdateDelay'))
            {
                autoUpdateDelay = Math.ceil(Number(options.autoUpdateDelay));
            }
        }

        CodeMirror.Vim.map('<C-l>', '$', '');
        CodeMirror.Vim.map('<C-h>', '^', '');
        CodeMirror.Vim.map('<C-j>', '<C-d>', '');
        CodeMirror.Vim.map('<C-k>', '<C-u>', '');

        CodeMirror.AsciiMath.setAuxiliaryKeyEventListener(function(cm, key)
        {
            if (key == "J")
            {
                if (cm == queryTextEditor) queryPreviewer.scrollDown();
                else if (cm == answerTextEditor) answerPreviewer.scrollDown();
            }
            else if (key == "K")
            {
                if (cm == queryTextEditor) queryPreviewer.scrollUp();
                else if (cm == answerTextEditor) answerPreviewer.scrollUp();
            }
        });

        CodeMirror.Vim.defineAction("scrollPreviewDown", function (cm, actionArgs) {
            if (cm == queryTextEditor) queryPreviewer.scrollDown();
            else if (cm == answerTextEditor) answerPreviewer.scrollDown();
        });

        CodeMirror.Vim.defineAction("scrollPreviewUp", function (cm, actionArgs) {
            if (cm == queryTextEditor) queryPreviewer.scrollUp();
            else if (cm == answerTextEditor) answerPreviewer.scrollUp();
        });

        CodeMirror.Vim.mapCommand('<S-C-j>', 'action', 'scrollPreviewDown', {}, {context:'insert', isEdit: false});
        CodeMirror.Vim.mapCommand('<S-C-j>', 'action', 'scrollPreviewDown', {}, {context:'normal', isEdit: false});
        CodeMirror.Vim.mapCommand('<S-C-k>', 'action', 'scrollPreviewUp', {}, {context:'insert', isEdit: false});
        CodeMirror.Vim.mapCommand('<S-C-k>', 'action', 'scrollPreviewUp', {}, {context:'normal', isEdit: false});

        CodeMirror.Vim.defineAction("switchToAnswerEditor", function (cm, actionArgs) {
            if (cm == queryTextEditor) answerTextEditor.focus();
        });

        CodeMirror.Vim.defineAction("switchToQueryEditor", function (cm, actionArgs) {
            if (cm == answerTextEditor) queryTextEditor.focus();
        });

        CodeMirror.Vim.mapCommand('ZJ', 'action', 'switchToAnswerEditor', {}, {context:'normal', isEdit: false});
        CodeMirror.Vim.mapCommand('ZJ', 'action', 'switchToAnswerEditor', {}, {context:'insert', isEdit: false});
        CodeMirror.Vim.mapCommand('ZK', 'action', 'switchToQueryEditor', {}, {context:'normal', isEdit: false});
        CodeMirror.Vim.mapCommand('ZK', 'action', 'switchToQueryEditor', {}, {context:'insert', isEdit: false});

        CodeMirror.Vim.defineAction("createAsciiMathString", function (cm, actionArgs) {
            cm.replaceSelection("$[]$", "start");
            var pos = cm.getCursor();
            cm.setCursor(pos.line, pos.ch + 2);

            window.setTimeout(function() {
                cm.setOption("keyMap", "asciimath");
            }, 0);
        });

        CodeMirror.Vim.mapCommand('<C-9>', 'action', 'createAsciiMathString', {}, {context:'insert', isEdit: false});
        CodeMirror.Vim.mapCommand('<C-9>', 'action', 'createAsciiMathString', {}, {context:'normal', isEdit: false});

        CodeMirror.Vim.defineAction("startAsciiMathMode", function (cm, actionArgs) {
            window.setTimeout(function() {
                cm.setOption("keyMap", "asciimath");
            }, 0);
        });

        CodeMirror.Vim.mapCommand('[', 'action', 'startAsciiMathMode', {}, {context:'normal', isEdit: false});

        CodeMirror.Vim.defineEx("xtag", false, function (cm, params) {
            if ((params.args !== undefined) &&
                (params.line !== undefined) &&
                (params.lineEnd !== undefined))
            {
                cm.setCursor({line: params.lineEnd, ch: 0});
                cm.execCommand('goLineEnd');
                cm.replaceSelection(`\n</${params.args[0]}>`);

                cm.setCursor({line: params.line, ch: 0});
                cm.execCommand('goLineStart');
                cm.replaceSelection(`<${params.args[0]}>\n`);
                cm.execCommand('goLineUp');
                cm.execCommand('goLineEnd');
                cm.execCommand('goCharLeft');
            }
        });

        function roundToNearestMultiple(num, multiple)
        {
            num = Math.round(num / multiple) * multiple;
            num = Math.round(num * 10000) / 10000;
            return num;
        }

        CodeMirror.Vim.defineOption("snap", snapMultiple, 'string', [], function(value, cm) {
            if (typeof value === "undefined") return snapMultiple;
            else snapMultiple = Math.max(Number(value), 0.0001);
        });

        CodeMirror.Vim.defineEx("snap", false, function (cm, params) {
            if (params.selection.isValid)
            {
                var multiple = snapMultiple;

                if ((params.args !== undefined) &&
                    (params.args.length > 0))
                {
                    let value = Number(params.args[0]);
                    if (!Number.isNaN(value) && (value != 0))
                    {
                        multiple = Math.abs(value);
                    }
                }

                cm.doc.setSelection(params.selection.start, params.selection.end);
                var selectedText = cm.doc.getSelection();
                var convertedText = selectedText.replace(/([-]?(?:[0-9]*[.])?[0-9]+)/g, function(match, p1)
                {
                    let num = parseFloat(p1);
                    return roundToNearestMultiple(num, multiple);
                });

                cm.doc.replaceSelection(convertedText, 'start');
            }
        });

        CodeMirror.Vim.defineAction("incrementDecimalNumber", function (cm, actionArgs) {
            const numberRegex = /^([-]?(?:[0-9]*[.])?[0-9]+)/;
            const cursor = cm.doc.getCursor();
            const line = cm.doc.getLine(cursor.line);
            var i = cursor.ch;

            if (numberRegex.test(line.substring(i)))
            {
                while ((i > 0) && numberRegex.test(line.substring(i - 1)))
                {
                    i--;
                }

                let match = line.substring(i).match(numberRegex);
                let value = parseFloat(match[1]);

                cm.doc.setSelection({line: cursor.line, ch: i},
                                    {line: cursor.line, ch: i + match[1].length});

                let increment = snapMultiple * (actionArgs.increment ? 1 : -1);
                value = value + increment;
                value = Math.round(value * 10000) / 10000;

                cm.doc.replaceSelection(value.toString(), 'start');
            }
        });

        CodeMirror.Vim.mapCommand('<C-a>', 'action', 'incrementDecimalNumber',
                                  {increment: true},
                                  {context:'normal', isEdit: true});

        CodeMirror.Vim.mapCommand('<C-x>', 'action', 'incrementDecimalNumber',
                                  {increment: false},
                                  {context:'normal', isEdit: true});


        CodeMirror.Vim.defineEx("template", "temp", function (cm, params) {
            if (params.args !== undefined)
            {
                if (templates.hasOwnProperty(params.args[0]))
                {
                    let value = templates[params.args[0]];

                    let cursor = cm.getCursor();
                    let line = cm.doc.getLine(cursor.line);

                    let match = line.match(/^(\s+)/);
                    if (match)
                    {
                        let initialWhiteSpace = match[1];
                        let lines = CodeMirror.splitLines(value);
                        lines = lines.map(line => initialWhiteSpace + line);
                        lines[0] = lines[0].replace(initialWhiteSpace, "");
                        value = lines.join('\n');
                    }

                    cm.replaceSelection(value);

                    if (value.indexOf("___") >= 0)
                    {
                        let sc = cm.getSearchCursor('___', cm.doc.getCursor());
                        sc.findPrevious();
                        sc.replace("");
                        cm.setCursor(sc.from());
                    }
                }
            }
        });

        CodeMirror.Vim.defineOption("aup", true, 'boolean', [], function(value, cm) {
            if (typeof value === "undefined") return autoUpdatePreview;
            else autoUpdatePreview = value;
        });

        CodeMirror.Vim.defineOption("aud", autoUpdateDelay, 'string', [], function(value, cm) {
            if (typeof value === "undefined") return autoUpdateDelay;
            else autoUpdateDelay = Math.max(Number(value), 5);
        });

        function updatePreview(cm)
        {
            cm.save();
            if (cm === queryTextEditor) queryPreviewer.update();
            else if (cm === answerTextEditor) answerPreviewer.update();
        }

        CodeMirror.Vim.defineEx('update', false, updatePreview);
        CodeMirror.Vim.defineAction('updatePreview', updatePreview);
        CodeMirror.Vim.mapCommand('<C-m>', 'action', 'updatePreview', {}, {context:'normal', isEdit: false});

        CodeMirror.Vim.defineEx("q", false, function (cm, params) {
            if (exitCallback != null) exitCallback();
        });

        CodeMirror.Vim.defineAction("startPointAdjustMode", function (cm, actionArgs) {
            window.setTimeout(function() {
                cm.setOption("keyMap", "pointAdjust");
            }, 0);
        });

        CodeMirror.Vim.mapCommand('<S-C-p>', 'action', 'startPointAdjustMode', {}, {context:'normal', isEdit: false});

        var mode = {
            name: "markdown",
            tokenTypeOverrides: {
                list1: " ",
                list2: " ",
                list3: " "
            }
        };

        queryTextEditor = CodeMirror.fromTextArea(queryTextArea, {
            lineNumbers: true,
            keyMap: enableVimMode ? "vim" : "default",
            matchBrackets: true,
            showCursorWhenSelecting: true,
            mode: mode,
            indentUnit: 4,
            smartIndent: false,
            tabSize: 4,
            //inputStyle: "contenteditable"
        });

        var queryUpdateScheduled = false;

        queryTextEditor.on('change', function(editor, changeObj) {
            if (!queryUpdateScheduled)
            {
                queryUpdateScheduled = true;

                window.setTimeout(function() {
                    queryTextEditor.save();
                    if (autoUpdatePreview) queryPreviewer.update();

                    queryUpdateScheduled = false;
                }, autoUpdateDelay);
            }
        });

        queryTextEditor.on('focus', function(editor, evt) {
            lastFocusedEditor = editor;
        });

        answerTextEditor = CodeMirror.fromTextArea(answerTextArea, {
            lineNumbers: true,
            keyMap: enableVimMode ? "vim" : "default",
            matchBrackets: true,
            showCursorWhenSelecting: true,
            mode: mode,
            indentUnit: 4,
            smartIndent: false,
            tabSize: 4,
            //inputStyle: "contenteditable"
        });

        var answerUpdateScheduled = false;

        answerTextEditor.on('change', function(editor, changeObj) {
            if (!answerUpdateScheduled)
            {
                answerUpdateScheduled = true;

                window.setTimeout(function() {
                    answerTextEditor.save();
                    if (autoUpdatePreview) answerPreviewer.update();

                    answerUpdateScheduled = false;
                }, autoUpdateDelay);
            }
        });

        answerTextEditor.on('focus', function(editor, evt) {
            lastFocusedEditor = editor;
        });

        if (enableVimMode)
        {
            /*
             * Support Ctrl-C copy to clipboard when
             * there is an active selection in vim mode.
             */

            queryTextEditor.addKeyMap({"Ctrl-C": false});
            answerTextEditor.addKeyMap({"Ctrl-C": false});
        }

        CodeMirror.commands.save = function(e){
            e.save();

            if (saveCallback != null)
            {
                var editorName = "";
                if (e == queryTextEditor) editorName = "query";
                else if (e == answerTextEditor) editorName = "answer";

                saveCallback(editorName, e.getCursor().line);
            }
        };
    }

    function setFocus(editorName, line)
    {
        var pos = {line: line, ch: 0};

        if (editorName === "query")
        {
            queryTextEditor.setCursor(pos);
            queryTextEditor.scrollIntoView(pos, 100);
            queryTextEditor.focus();
        }
        else if (editorName === "answer")
        {
            answerTextEditor.setCursor(pos);
            answerTextEditor.scrollIntoView(pos, 100);
            answerTextEditor.focus();
        }
    }

    function sync()
    {
        // Syncs the editors with their respective textareas
        queryTextEditor.save();
        answerTextEditor.save();
    }


    /*
     * Return the public API.
     */
    return {
        init: function(queryTextArea, answerTextArea, queryPreviewer, answerPreviewer, options) {
            init(queryTextArea, answerTextArea, queryPreviewer, answerPreviewer, options);
        },
        addCGraphTextToEditor: function(text) { addCGraphTextToEditor(text); },
        setSaveCallback: function(callback) { setSaveCallback(callback); },
        setExitCallback: function(callback) { setExitCallback(callback); },
        setFocus: function(editorName, line) { setFocus(editorName, line); },
        sync: function() { sync(); }
    };
})();

