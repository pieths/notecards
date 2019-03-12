/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const TagOverlay = (function() {

    function TagOverlay(zIndex)
    {
        var overlay = null;
        var allTagBar = null;
        var cardTagBar = null;
        var newTagInput = null;

        var eventListeners = new EventListenersCollection();
        eventListeners.registerEventType('card_tag_click');
        eventListeners.registerEventType('all_tag_click');
        eventListeners.registerEventType('new_tag_input');

        function createOverlay(zIndex)
        {
            var template = document.createElement('template');
            template.innerHTML = htmlTemplate.trim();
            var rootElement = document.importNode(template.content.firstChild, true);

            overlay = new Overlay(zIndex, "TAGS");
            overlay.insert(rootElement);

            cardTagBar = new TagBar(document.getElementById("overlay_card_tag_bar"));
            cardTagBar.addEventListener('click', (evt) => {
                dispatchTagEvent('card_tag_click', evt.label);
            });

            allTagBar = new TagBar(document.getElementById("overlay_all_tag_bar"));
            allTagBar.addEventListener('click',  (evt) => {
                dispatchTagEvent('all_tag_click', evt.label);
            });

            newTagInput = document.getElementById("new_tag_input");
            newTagInput.addEventListener('change', () => {
                dispatchTagEvent('new_tag_input', newTagInput.value);
                newTagInput.value = "";
            });
        }

        function dispatchTagEvent(type, label)
        {
            label = label.trim();
            if (label != "")
            {
                eventListeners.dispatchEvent({type: type, label: label});
            }
        }

        this.show = function()
        {
            overlay.show();
        }

        this.setCardTags = function(tags)
        {
            cardTagBar.setTags(tags);
        }

        this.setAllTags = function(tags)
        {
            allTagBar.setTags(tags);
        }

        this.addEventListener = function(eventType, listener)
        {
            eventListeners.addEventListener(eventType, listener);
        }

        this.removeEventListener = function(eventType, listener)
        {
            eventListeners.removeEventListener(eventType, listener);
        }

        createOverlay(zIndex);
    }


    var htmlTemplate = `
    <div id="tag_overlay_panel" style="position:absolute; left:0px; right:0px; bottom: 0px; top:0px; display:flex;flex-direction:column;">
        <div id="overlay_card_tag_bar"></div>

        <input type="text" id="new_tag_input">

        <div id="overlay_all_tag_bar"></div>
    </div>`;


    return TagOverlay;
})();

