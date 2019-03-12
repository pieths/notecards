/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const EventListenersCollection = (function() {

    function EventListenersCollection()
    {
        var eventTypes = {};

        this.registerEventType = function(type)
        {
            if (!eventTypes.hasOwnProperty(type))
            {
                eventTypes[type] = [];
            }
        }

        this.registerEventTypes = function(types)
        {
            types.forEach(type => this.registerEventType(type));
        }

        this.addEventListener = function(type, listener)
        {
            if (eventTypes.hasOwnProperty(type) &&
                (eventTypes[type].findIndex(l=>l==listener) == -1))
            {
                eventTypes[type].push(listener);
            }
        }

        this.removeEventListener = function(type, listener)
        {
            if (eventTypes.hasOwnProperty(type))
            {
                eventTypes[type] = eventTypes[type].filter(l => l != listener);
            }
        }

        this.dispatchEvent = function(evt)
        {
            if (eventTypes.hasOwnProperty(evt.type))
            {
                eventTypes[evt.type].forEach(listener => listener(evt));
            }
        }
    }

    return EventListenersCollection;
})();

