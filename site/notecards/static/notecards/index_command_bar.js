/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const indexCommandBar = (function() {

    const MODE_SEARCH = 0;
    const MODE_COMMAND = 1;

    var mode = null;
    var rootElement = null;
    var inputElement = null;

    var updateCardListFilter = null;
    var updateCardListTimeoutId = -1;
    var updateCardListInterval = 1000;

    var eventListeners = new EventListenersCollection();
    eventListeners.registerEventTypes(['hidden', 'card-filter-update']);

    var menuActions = null;


    function init(zIndex, menuActionsArg)
    {
        createElements(zIndex);

        menuActions = menuActionsArg;
    }


    function createElements(zIndex)
    {
        rootElement = document.createElement('div');
        rootElement.style.display = 'none';
        rootElement.style.position = 'fixed';
        rootElement.style.zIndex = zIndex.toString();
        rootElement.style.width = '100%';
        rootElement.style.height = '100%';
        rootElement.style.top = '-20000px';
        rootElement.style.left = '-20000px';
        rootElement.style.backgroundColor = '#00000011';
        rootElement.setAttribute('class', 'index-command-bar-root');
        rootElement.addEventListener('click', ()=>hide());
        document.getElementsByTagName('body')[0].appendChild(rootElement);

        /*
         * Stop key presses from bubbling
         * out of the overlay.
         */
        rootElement.addEventListener('keyup', e => e.stopPropagation());
        rootElement.addEventListener('keydown', e => e.stopPropagation());
        rootElement.addEventListener('keypress', e => e.stopPropagation());

        var containerElement = document.createElement('div');
        containerElement.style.position = "absolute";
        containerElement.setAttribute('class', 'ui-page-theme-a ui-corner-all ui-overlay-shadow index-command-bar-container');
        containerElement.style.width = '85%';
        containerElement.style.left = '50%';
        containerElement.style.bottom = '2em';
        containerElement.style.transform = 'translateX(-50%)';
        containerElement.style.backgroundColor = "#fefefe";
        containerElement.style.padding = '1.5em';
        containerElement.style.overflow = 'hidden';
        rootElement.appendChild(containerElement);

        inputElement = document.createElement('input');
        inputElement.setAttribute('type', 'text');
        inputElement.setAttribute('class', 'index-command-bar-input');
        inputElement.style.width = '100%';
        inputElement.addEventListener('input', handleInputChanged);
        inputElement.addEventListener('keydown', handleKeyDown);
        containerElement.appendChild(inputElement);

        $(rootElement).enhanceWithin();
    }


    function dispatchFilterUpdateEvent(filter, commit)
    {
        eventListeners.dispatchEvent({
            type: 'card-filter-update',
            filter: filter,
            commit: commit
        });
    }


    function show(modeArg)
    {
        if (modeArg == MODE_SEARCH)
        {
            inputElement.value = "/";
            mode = modeArg;
        }
        else if (modeArg == MODE_COMMAND)
        {
            inputElement.value = ":";
            mode = modeArg;
        }

        if (mode != null)
        {
            rootElement.style.display = 'block';
            rootElement.style.top = '0px';
            rootElement.style.left = '0px';
            inputElement.focus();
        }
    }


    function hide()
    {
        if (updateCardListTimeoutId >= 0)
        {
            clearTimeout(updateCardListTimeoutId);
            updateCardListTimeoutId = -1;
        }

        if ((mode == MODE_SEARCH) && (updateCardListFilter != null))
        {
            /*
             * Reset the card list to match the
             * values in the filter form.
             */
            dispatchFilterUpdateEvent(parseSearchString("+"), false);

            updateCardListFilter = null;
        }

        mode = null;

        inputElement.value = "";
        inputElement.blur();

        rootElement.style.display = 'none';
        rootElement.style.top = '-20000px';
        rootElement.style.left = '-20000px';

        eventListeners.dispatchEvent({type: 'hidden'});
    }


    function handleInputChanged()
    {
        if (inputElement.value.length == 0)
        {
            hide();
            return;
        }
        else if (mode == MODE_SEARCH)
        {
            var searchString = inputElement.value.substring(1);
            updateCardListFilter = parseSearchString(searchString);

            if (updateCardListTimeoutId == -1)
            {
                updateCardListTimeoutId = setTimeout(() => {
                    updateCardListTimeoutId = -1;
                    dispatchFilterUpdateEvent(updateCardListFilter, false);
                }, updateCardListInterval);
            }
        }
    }


    function handleKeyDown(e)
    {
        if ((e.key == "[") && e.ctrlKey)
        {
            e.preventDefault();
            e.stopPropagation();

            hide();
        }
        else if (e.key == "Escape")
        {
            e.preventDefault();
            e.stopPropagation();

            hide();
        }
        else if (e.key == "Enter")
        {
            e.preventDefault();
            e.stopPropagation();

            if (mode == MODE_SEARCH)
            {
                var searchString = inputElement.value.substring(1);
                var filter = parseSearchString(searchString);
                dispatchFilterUpdateEvent(filter, true);
            }
            else if (mode == MODE_COMMAND)
            {
                let commandString = inputElement.value.substring(1).trim();
                let parts = commandString.split(/\s+/);
                let command = parts.shift();

                processCommand(command, parts);
                hide();
            }
            else
            {
                hide();
            }
        }
    }


    function parseSearchString(input)
    {
        var tagsFilter = "";
        var titleFilter = "";
        var reviewStatus = 1;
        var orderBy = 0;
        var active = 2;

        if (input.startsWith("+"))
        {
            /*
             * Append the new search parameters to the existing
             * parameters which are already defined in the form.
             */

            input = input.substring(1);

            tagsFilter = document.getElementById('tags_filter').value;
            titleFilter = document.getElementById('title_filter').value;
            reviewStatus = document.getElementById('review_status_list').value;
            orderBy = document.getElementById('order_by_list').value;
            active = document.getElementById('active_list').value;
        }

        var input = input.replace(/(\\)?;/g, ($0, $1)=>$1 ? ";" : "\n");

        var parts = input.split("\n");
        parts = parts.map(part => part.trim());

        parts.forEach(part => {
            var index = part.indexOf(" ");
            if (index > 0)
            {
                var name = part.substring(0, index).trim();
                var value = part.substring(index+1).trim();

                if ((name.length == 0) || (value.length == 0)) return;

                if ((name == "tag") || (name == "tags"))
                {
                    if (tagsFilter.length > 0) tagsFilter += ` ${value}`;
                    else tagsFilter = value;
                }
                else if (name == "title")
                {
                    if (titleFilter.length > 0) titleFilter += ` ${value}`;
                    else titleFilter = value;
                }
                else if (name == "active")
                {
                    if ((value.toLowerCase() == "true") || (value == "1")) active = 1;
                    else if ((value.toLowerCase() == "false") || (value == "0")) active = 0;
                    else if ((value.toLowerCase() == "any") || (value == "2")) active = 2;
                }
                else if ((name == "rs") || (name == "reviewstatus"))
                {
                    if ((value.toLowerCase() == "rr") || (value == "0")) reviewStatus = 0;
                    else if ((value.toLowerCase() == "any") || (value == "1")) reviewStatus = 1;
                }
                else if ((name == "ob") || (name == "orderby"))
                {
                    if ((value.toLowerCase() == "review") || (value == "0")) orderBy = 0;
                    else if ((value.toLowerCase() == "create") || (value == "1")) orderBy = 1;
                }
            }
        });

        var filter = {
            'reviewStatus': reviewStatus,
            'orderBy': orderBy,
            'active': active,
            'tagsFilter': tagsFilter,
            'titleFilter': titleFilter,
            'cardsPerPage': document.getElementById('cards_per_page').value,
            'page': 1,
            'format': 'index'
        };

        return filter;
    }


    function processCommand(command, args)
    {
        if (command == "new")
        {
            menuActions.createNewCard();
        }
        else if (command == "login")
        {
            menuActions.showLoginOverlay();
        }
        else if ((command == "logout") || (command == "q"))
        {
            menuActions.logout();
        }
    }


    var api = {
        init: function(zIndex, menuActions) { init(zIndex, menuActions); },
        show: function(mode) { show(mode); },
        hide: function() { hide(); },
        addEventListener: function(eventType, listener) { eventListeners.addEventListener(eventType, listener); },
        removeEventListener: function(eventType, listener) { eventListeners.removeEventListener(eventType, listener); },
        MODE_SEARCH: MODE_SEARCH,
        MODE_COMMAND: MODE_COMMAND
    };

    return api;
})();

