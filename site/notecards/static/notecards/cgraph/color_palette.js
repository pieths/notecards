/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const ColorPalette = (function() {

    function setBackgroundColor(element, color)
    {
        if (color === null)
        {
            element.style.backgroundPosition = '0px 0px, 10px 10px';
            element.style.backgroundSize = '20px 20px';
            element.style.backgroundImage = 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee 100%),linear-gradient(45deg, #eee 25%, white 25%, white 75%, #eee 75%, #eee 100%)'; 
            element.style.backgroundColor = '';
        }
        else
        {
            element.style.backgroundPosition = '';
            element.style.backgroundSize = '';
            element.style.backgroundImage = ''; 
            element.style.backgroundColor = color;
        }
    }

    function getOffset(element)
    {
        var x = 0;
        var y = 0;

        while (element && !isNaN(element.offsetLeft) && !isNaN(element.offsetTop))
        {
            x += element.offsetLeft - element.scrollLeft;
            y += element.offsetTop - element.scrollTop;
            element = element.offsetParent;
        }

        return {left: x, top: y};
    }

    function ColorPalette(containerClass)
    {
        var colors = [
            '#5db0db', '#96e266', '#ffe06e', '#ffbf79', '#ff6163',
            '#9f43b3', '#bebebe', '#000', '#fff', null
        ];

        var numColorsPerRow = 5;
        var colorButtonWidth = '2em';
        var colorButtonHeight = '2em';
        var alignment = 'center';

        var callback = null;

        var backgroundElement = document.createElement('div');
        backgroundElement.style.display = 'none';
        backgroundElement.style.position = 'fixed';
        backgroundElement.style.zIndex = '20000';
        backgroundElement.style.width = '100%';
        backgroundElement.style.height = '100%';
        backgroundElement.style.top = '-10000px';
        backgroundElement.style.left = '10000px';
        backgroundElement.addEventListener('click', function() { hide(); });
        document.getElementsByTagName('body')[0].appendChild(backgroundElement);

        var rootElement = document.createElement('div');
        rootElement.style.position = "absolute";
        rootElement.setAttribute('class', containerClass);
        backgroundElement.appendChild(rootElement);

        var rowElement = null;

        function show(anchorElement, colorSelectedCallback)
        {
            callback = colorSelectedCallback;

            backgroundElement.style.display = 'block';
            backgroundElement.style.top = '0px';
            backgroundElement.style.left = '0px';

            var style = window.getComputedStyle(rootElement);
            var height = style.getPropertyValue('height');
            height = parseFloat(height.replace("px", ""));

            var width = style.getPropertyValue('width');
            width = parseFloat(width.replace("px", ""));

            var offset = getOffset(anchorElement);
            rootElement.style.top = `${offset.top - height}px`;

            if (alignment == 'left') rootElement.style.left = `${offset.left}px`;
            else if (alignment == 'center') rootElement.style.left = `${offset.left - (width/2)}px`;
        }

        function hide()
        {
            backgroundElement.style.display = 'none';
            backgroundElement.style.top = '-20000px';
            backgroundElement.style.left = '20000px';
        }

        function onColorSelected(color)
        {
            if (callback) callback(color);
        }

        function createColorElements()
        {
            var count = 0;

            colors.forEach(function(color)
            {
                var element = document.createElement('span');
                element.style.display = "block";
                element.style.width = colorButtonWidth;
                element.style.height = colorButtonHeight;
                element.style.minHeight = "1px";
                element.style.float = "left";
                element.style.border = '0.25px solid #ddd'
                element.addEventListener('click', function() {
                    onColorSelected(color);
                    hide();
                });

                setBackgroundColor(element, color);

                if (count % numColorsPerRow == 0)
                {
                    rowElement = document.createElement('div');
                    rootElement.appendChild(rowElement);

                    element.style.clear = 'both';
                }

                rowElement.appendChild(element);
                count++;
            });
        }

        createColorElements();

        /*
         * Define the external API.
         */

        this.show = function(anchorElement, colorSelectedCallback) { show(anchorElement, colorSelectedCallback); }

        this.hide = function() { hide(); }
    }

    ColorPalette.setBackgroundColor = function(element, color) { setBackgroundColor(element, color); }
    ColorPalette.getOffset = function(element) { getOffset(element); }

    return ColorPalette;
})();

