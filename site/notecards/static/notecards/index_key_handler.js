/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const indexKeyHandler = (function() {

    var enabled = true;
    var cardList = null;
    var pageNavigator = null;
    var commandBar = null;


    function init(cardListArg, pageNavigatorArg, commandBarArg)
    {
        cardList = cardListArg;
        pageNavigator = pageNavigatorArg;
        commandBar = commandBarArg;

        var body = document.getElementsByTagName('body')[0];
        body.addEventListener('keyup', handleKeyUp);
        body.addEventListener('keydown', handleKeyDown);
    }


    function enable() { enabled = true; }
    function disable() { enabled = false; }


    var keyMap = {
        "j": () => cardList.selectNext(),
        "k": () => cardList.selectPrevious(),
        "e": () => cardList.editSelectedCard(),
        "Enter": () => cardList.editSelectedCard(),
        "r": () => cardList.reviewSelectedCard(),
        "l": () => pageNavigator.next(),
        "h": () => pageNavigator.previous(),
        "/": () => commandBar.show(commandBar.MODE_SEARCH),
        ":": () => commandBar.show(commandBar.MODE_COMMAND),
    };


    function handleKeyUp(e)
    {
        if (!enabled) return;

        if (keyMap.hasOwnProperty(e.key))
        {
            e.preventDefault();
            e.stopPropagation();
        }
    }


    function handleKeyDown(e)
    {
        if (!enabled) return;

        if (keyMap.hasOwnProperty(e.key))
        {
            e.preventDefault();
            e.stopPropagation();

            keyMap[e.key]();
        }
    }


    return {
        init: function(cardList, pageNavigator, commandBar) {
            init(cardList, pageNavigator, commandBar);
        },
        enable: function() { enable(); },
        disable: function() { disable(); }
    };
})();

