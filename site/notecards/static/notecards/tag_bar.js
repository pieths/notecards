/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const TagBar = (function() {

    function TagBar(parentElement)
    {
        var eventListeners = new EventListenersCollection();
        eventListeners.registerEventType('click');

        var container = document.createElement("div");
        container.setAttribute("class", 'tag-bar-container');
        container.addEventListener('click', (evt) => {
            eventListeners.dispatchEvent({type: 'click', label: ""});

            // Stop the click from interacting
            // with the rest of the page.
            evt.stopPropagation();
        });

        parentElement.appendChild(container);

        function setTags(tags)
        {
            // Remove all child nodes
            while (container.hasChildNodes())
            {
                container.removeChild(container.lastChild);
            }

            var labels = tags.map(tag => tag.label);

            labels.forEach(label => {
                var element = document.createElement("span")
                element.setAttribute('class', 'tag-bar-item');
                element.addEventListener('click', (evt) => {
                    eventListeners.dispatchEvent({type: 'click', label: label});

                    // Stop the click from interacting
                    // with the rest of the page.
                    evt.stopPropagation();
                });

                var textNode = document.createTextNode(label);
                element.appendChild(textNode);

                container.appendChild(element);
            });
        }

        /*
         * Define the external API.
         */

        this.setTags = function(tags)
        {
            setTags(tags);
        }

        this.addEventListener = function(eventType, listener)
        {
            eventListeners.addEventListener(eventType, listener);
        }

        this.removeEventListener = function(eventType, listener)
        {
            eventListeners.removeEventListener(eventType, listener);
        }
    }


    return TagBar;
})();

