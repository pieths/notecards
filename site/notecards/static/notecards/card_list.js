/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const cardList = (function() {

    var md = MarkdownUtils.init();
    var tableBodyElement = null;

    var eventListeners = new EventListenersCollection();
    eventListeners.registerEventType('updated');

    var defaultPageInfo =
    {
        num_cards: 0,
        total_num_cards: 0,
        num_pages: 1,
        current_page: 1,
        start_index: 0,
        end_index: 0,
        has_previous: false,
        has_next: false
    };

    var selectedCard = 0;
    var cards = [];
    var pageInfo = defaultPageInfo;

    var options =
    {
        showQuerySnippet: true,
        showTags: true,
        showUuid: false
    };


    function init(element)
    {
        tableBodyElement = element;
    }


    function reset()
    {
        // Remove all child nodes
        while (tableBodyElement.hasChildNodes())
        {
            tableBodyElement.removeChild(tableBodyElement.lastChild);
        }

        selectedCard = 0;
        cards = [];
        pageInfo = defaultPageInfo;

        eventListeners.dispatchEvent({type: 'updated'});
    }


    function createElement(tagName, attributes, textContent)
    {
        var element = document.createElement(tagName);

        for (attributeName in attributes)
        {
            element.setAttribute(attributeName, attributes[attributeName]);
        }

        if (typeof(textContent) === "string")
        {
            var textNode = document.createTextNode(textContent);
            element.appendChild(textNode);
        }

        return element;
    };


    function createRow(card)
    {
        var row = createElement('tr', {});

        var cell = createElement('td', {});

        if (card.hasOwnProperty('title') && (card.title != ""))
        {
            cell.appendChild(createElement('p', {class:"card-list-title"}, card.title));
        }

        if (options.showQuerySnippet)
        {
            var urlMap = {};
            card.files.forEach(file => {urlMap[file.name] = file.url});

            var element = createElement('div', {class:"query-snippet"});
            element.innerHTML = md.render(card.query, {urlMap: urlMap});

            cell.appendChild(element);
        }

        if (card.hasOwnProperty('tags') && (card.title != "") && options.showTags)
        {
            var tags = card.tags.map(tag => tag.label).join(", ");
            cell.appendChild(createElement('p', {class:"tags"}, tags));
        }

        if (card.hasOwnProperty('uuid') && options.showUuid)
        {
            cell.appendChild(createElement('p', {class:"card-list-uuid"}, card.uuid));
        }

        row.appendChild(cell);
        row.appendChild(createElement('td', {}, card.spacing_bin.toString()));

        if (card.active)
        {
            retrievalDate = new Date(card.next_retrieval_date).toDateString();
            row.appendChild(createElement('td', {}, retrievalDate));
        }
        else
        {
            row.appendChild(createElement('td', {class:"inactive-retrieval-date"}, 'Inactive'));
        }

        cell = createElement('td', {});

        cell.appendChild(createElement('a', {
            href: card.getLink('edit-page'),
            class: "ui-btn ui-btn-inline ui-corner-all",
            'data-ajax': 'false'
        }, "Edit"));

        cell.appendChild(createElement('a', {
            href: card.getLink('review-page'),
            class: "ui-btn ui-btn-inline ui-corner-all",
            'data-ajax': 'false'
        }, "Review"));

        row.appendChild(cell);
        return row;
    }


    function processCGraphElements()
    {
        var elements = tableBodyElement.querySelectorAll("div[data-content-type^='cgraph_']");
        elements.forEach(element => {
            let placeholder = createElement('div', {class: 'cgraph-placeholder'}, 'CGraph');

            element.parentElement.insertBefore(placeholder, element);
            element.parentNode.removeChild(element);
        });
    }


    function update(filter)
    {
        reset();

        CardApi.abortPendingRequests();
        CardApi.getCards(filter, function(result)
        {
            cards = result.cards;
            pageInfo = result.page_info;

            for (var i=0; i < cards.length; i++)
            {
                var row = createRow(cards[i]);
                tableBodyElement.appendChild(row);
            }

            processCGraphElements();

            MathJax.Hub.Queue(["Typeset", MathJax.Hub, tableBodyElement]);

            eventListeners.dispatchEvent({type: 'updated'});
        });
    }


    function removeHighlight(index)
    {
        var row = tableBodyElement.children[index];
        row.classList.remove("card-list-highlight");
    }


    function setHighlight(index)
    {
        var row = tableBodyElement.children[index];
        row.classList.add("card-list-highlight");
    }


    function isHighlighted(index)
    {
        var row = tableBodyElement.children[index];
        return row.classList.contains("card-list-highlight");
    }


    function ensureElementVisible(element)
    {
        /*
         * FIXME: use a better topoffset and window.scroll.
         */

        var topOffset = 100;

        var rect = element.getBoundingClientRect();
        var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);

        /*
         * -1 = element extends beyond the top of the visible client area.
         *  0 = element is within the visible client area.
         *  1 = element extends beyond the bottom of the visible client area.
         */
        var visibleState = 0;
        if (rect.top < topOffset) visibleState = -1;
        else if (rect.bottom > viewHeight) visibleState = 1;

        if (visibleState == -1)
        {
            element.scrollIntoView(true);
            window.scroll(0, window.scrollY - topOffset);
        }
        else if (visibleState == 1) element.scrollIntoView(false);
    }


    function selectNext()
    {
        if (!isHighlighted(selectedCard))
        {
            setHighlight(selectedCard);

            ensureElementVisible(tableBodyElement.children[selectedCard]);
        }
        else if (selectedCard < (cards.length - 1))
        {
            removeHighlight(selectedCard);
            selectedCard++;
            setHighlight(selectedCard);

            ensureElementVisible(tableBodyElement.children[selectedCard]);
        }
    }


    function selectPrevious()
    {
        if (!isHighlighted(selectedCard))
        {
            setHighlight(selectedCard);

            ensureElementVisible(tableBodyElement.children[selectedCard]);
        }
        else if (selectedCard > 0)
        {
            removeHighlight(selectedCard);
            selectedCard--;
            setHighlight(selectedCard);

            ensureElementVisible(tableBodyElement.children[selectedCard]);
        }
    }


    function editSelectedCard()
    {
        if (selectedCard < cards.length)
        {
            var target = cards[selectedCard].getLink('edit-page');
            location.assign(target);
        }
    }


    function reviewSelectedCard()
    {
        if (selectedCard < cards.length)
        {
            var target = cards[selectedCard].getLink('review-page');
            location.assign(target);
        }
    }


    return {
        init: function(tableBodyElement) { init(tableBodyElement); },
        update: function(json) { update(json); },
        pageInfo: {
            get numCards() { return pageInfo.num_cards; },
            get totalNumCards() { return pageInfo.total_num_cards; },
            get numPages() { return pageInfo.num_pages; },
            get currentPage() { return pageInfo.current_page; },
            get startIndex() { return pageInfo.start_index; },
            get endIndex() { return pageInfo.end_index; },
            get hasPrevious() { return pageInfo.has_previous; },
            get hasNext() { return pageInfo.has_next; },
            get previousPageNumber() { return pageInfo.has_previous ? pageInfo.previous_page_number : undefined; },
            get nextPageNumber() { return pageInfo.has_next ? pageInfo.next_page_number : undefined; }
        },
        selectNext: function() { selectNext(); },
        selectPrevious: function() { selectPrevious(); },
        editSelectedCard: function() { editSelectedCard(); },
        reviewSelectedCard: function() { reviewSelectedCard(); },
        addEventListener: function(eventType, listener) { eventListeners.addEventListener(eventType, listener); },
        removeEventListener: function(eventType, listener) { eventListeners.removeEventListener(eventType, listener); }
    };
})();

