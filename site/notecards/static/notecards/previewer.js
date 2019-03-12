/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

function Previewer(inputElement, preview, buffer, markdown, cgraph)
{
    var delay = 7;
    var scrollOffset = 100;

    var timeout = null;
    var mjRunning = false;
    var mjPending = false;

    var urlMap = {};


    /*
     * Switch the buffer and preview, and display the right one.
     * (We use visibility:hidden rather than display:none since
     * the results of running MathJax are more accurate that way.)
     */
    function swapBuffers()
    {
        var scrollTop = $(preview).scrollTop();

        var tmp = buffer;
        buffer = preview;
        preview = tmp;

        buffer.style.visibility = "hidden";
        buffer.style.position = "absolute";
        preview.style.position = "";
        preview.style.visibility = "";

        $(preview).scrollTop(scrollTop);
    }


    function scrollUp()
    {
        var scrollTop = $(preview).scrollTop();
        $(preview).scrollTop(scrollTop - scrollOffset);
    }


    function scrollDown()
    {
        var scrollTop = $(preview).scrollTop();
        $(preview).scrollTop(scrollTop + scrollOffset);
    }


    function update()
    {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(createPreview, delay);
    }


    function convertCGraphElements()
    {
        cgraph.convertDescendents(buffer);
    }


    /*
     * Note, the update should not be skipped if the text hasn't
     * changed because it is possible that something that the text
     * refers to has changed (ie. images/file attachments). So,
     * always create a new preview when it is requested.
     */
    function createPreview()
    {
        timeout = null;
        if (mjPending) return;
        var text = inputElement.value;

        if (mjRunning)
        {
            mjPending = true;
            MathJax.Hub.Queue([createPreview]);
        }
        else
        {
            buffer.innerHTML = markdown.render(text, {urlMap: urlMap});
            mjRunning = true;
            MathJax.Hub.Queue([convertCGraphElements],
                              ["Typeset", MathJax.Hub, buffer],
                              [previewDone]);
        }
    };


    function previewDone()
    {
        mjRunning = mjPending = false;
        swapBuffers();
    };


    /*
     * Set up the public api.
     */
    this.update = update;
    this.scrollUp = scrollUp;
    this.scrollDown = scrollDown;
    this.setUrlMap = function(map) { urlMap = map; };
};

