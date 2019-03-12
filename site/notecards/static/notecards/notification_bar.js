/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const notificationBar = (function() {

    var rootElement = null;
    var messageWidget = null;
    var notifications = [];
    var showingMessage = false;
    var numNotifications = 0;


    function init(zIndex)
    {
        createElements(zIndex);
    }


    function createMessageWidget(widgetNumber)
    {
        var containerElement = document.createElement('div');
        var classes = 'ui-overlay-shadow notification-bar-message-container'
        classes += (widgetNumber !== undefined) ? `-${widgetNumber}` : "";
        containerElement.setAttribute('class', classes);

        var divElement = document.createElement('div');
        divElement.setAttribute('class', 'notification-bar-message');
        var messageNode = document.createTextNode("");
        divElement.appendChild(messageNode);
        containerElement.appendChild(divElement);

        divElement = document.createElement('div');
        divElement.setAttribute('class', 'notification-bar-message-count');
        var countNode = document.createTextNode("");
        divElement.appendChild(countNode);
        containerElement.appendChild(divElement);

        divElement = document.createElement('div');
        divElement.setAttribute('class', 'notification-bar-message-icon-none');
        var iconNode = document.createTextNode("");
        divElement.appendChild(iconNode);
        containerElement.appendChild(divElement);

        return {
            setParent: function(parentElement)
            {
                parentElement.appendChild(containerElement);
            },
            setMessage: function(message) { messageNode.nodeValue = message; },
            setIcon: function(iconType) {
                if (iconType === "success")
                {
                    iconNode.nodeValue = "\u2714";
                    iconNode.parentNode.setAttribute('class',
                                                     'notification-bar-message-icon-success');
                }
                else if (iconType === "error")
                {
                    iconNode.nodeValue = "\u26A0";
                    iconNode.parentNode.setAttribute('class',
                                                     'notification-bar-message-icon-error');
                }
                else
                {
                    iconNode.parentNode.setAttribute('class',
                                                     'notification-bar-message-icon-none');
                }
            },
            setCount: function(count) { countNode.nodeValue = `(${count})`; }
        };
    }


    function createElements(zIndex)
    {
        rootElement = document.createElement('div');
        rootElement.setAttribute('class', 'notification-bar-container');
        rootElement.style.zIndex = zIndex.toString();
        document.getElementsByTagName('body')[0].appendChild(rootElement);

        messageWidget = createMessageWidget();
        messageWidget.setParent(rootElement);
    }


    function postMessage(message, icon)
    {
        if (icon === undefined) icon = "none";
        notifications.push({message: message, icon: icon});

        showNextMessage();
    }


    function showNextMessage()
    {
        if (showingMessage) return;
        showingMessage = true;

        var notification = notifications.shift();
        messageWidget.setMessage(notification.message);
        messageWidget.setIcon(notification.icon);
        messageWidget.setCount(++numNotifications);

        $(rootElement).fadeIn(300, ()=> {
            setTimeout(()=>{
                $(rootElement).fadeOut(300, ()=>{
                    $(rootElement).hide();
                    showingMessage = false;

                    if (notifications.length > 0)
                    {
                        setTimeout(showNextMessage, 0);
                    }
                });
            }, 1300);
        });
    }


    var api = {
        init: function(zIndex) { init(zIndex); },
        postMessage: function(message, icon) { postMessage(message, icon); }
    };

    return api;
})();

