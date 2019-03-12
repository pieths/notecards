/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const Overlay = (function() {

    /*
     * The html which is inserted in to an overlay should
     * have a container div which has styling similar to:
     *
     *     position:absolute; left:0px; right:0px; bottom: 0px; top:0px;
     *
     * This will force the inserted htmls root element to fit in
     * the overlays content container and allow the inserted html
     * to provide its own custom scrolling behavior.
     */

    function Overlay(zIndex, title)
    {
        var backgroundElement = document.createElement('div');
        backgroundElement.style.display = 'none';
        backgroundElement.style.position = 'fixed';
        backgroundElement.style.zIndex = zIndex.toString();
        backgroundElement.style.width = '100%';
        backgroundElement.style.height = '100%';
        backgroundElement.style.top = '-20000px';
        backgroundElement.style.left = '-20000px';
        document.getElementsByTagName('body')[0].appendChild(backgroundElement);

        /*
         * Stop key presses from bubbling
         * out of the overlay.
         */
        backgroundElement.addEventListener('keyup', e => e.stopPropagation());
        backgroundElement.addEventListener('keydown', e => e.stopPropagation());
        backgroundElement.addEventListener('keypress', e => e.stopPropagation());

        var rootElement = document.createElement('div');
        rootElement.style.position = "absolute";
        rootElement.setAttribute('class', 'ui-page-theme-a ui-corner-all ui-overlay-shadow');
        rootElement.style.width = '85%';
        rootElement.style.height = '85%';
        rootElement.style.left = '50%';
        rootElement.style.top = '50%';
        rootElement.style.transform = 'translateX(-50%) translateY(-50%)';
        rootElement.style.backgroundColor = "#fefefe";
        rootElement.style.padding = '1.5em';
        rootElement.style.overflow = 'hidden';
        rootElement.style.display = 'flex';
        rootElement.style.flexDirection = 'column';
        backgroundElement.appendChild(rootElement);

        if ((title != undefined) && (title != ""))
        {
            var headingElement = document.createElement('h4');
            headingElement.setAttribute('class', 'ui-bar ui-bar-a ui-corner-all');
            headingElement.appendChild(document.createTextNode(title));
            rootElement.appendChild(headingElement);
        }

        var closeButtonClickedListener = null;

        var closeButton = document.createElement('a');
        closeButton.setAttribute('href', '#');
        closeButton.setAttribute('class', 'ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right');
        closeButton.addEventListener('click', function() {
            (closeButtonClickedListener == null) ? 
                hide() : closeButtonClickedListener();
        });
        rootElement.appendChild(closeButton);

        var containerElement = document.createElement('div');
        containerElement.style.position = 'relative';
        containerElement.style.width = '100%';
        containerElement.style.overflow = 'hidden';
        containerElement.style.flex = 'auto';
        rootElement.appendChild(containerElement);


        function show()
        {
            backgroundElement.style.display = 'block';
            backgroundElement.style.top = '0px';
            backgroundElement.style.left = '0px';
        }

        function hide()
        {
            backgroundElement.style.display = 'none';
            backgroundElement.style.top = '-20000px';
            backgroundElement.style.left = '-20000px';
        }

        function insert(element)
        {
            containerElement.appendChild(element);
            $(backgroundElement).enhanceWithin();
        }

        $(backgroundElement).enhanceWithin();

        /*
         * Define the external API.
         */

        this.show = function() { show(); }

        this.hide = function() { hide(); }

        this.insert = function(element) { insert(element); }

        this.setCloseButtonClickedListener = function(callback)
        {
            closeButtonClickedListener = callback;
        }
    }

    return Overlay;
})();

