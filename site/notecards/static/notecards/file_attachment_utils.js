/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const FileAttachmentUtils = (function() {

    var cardUuid = null;
    var overlay = null;
    var textClipboard = null;

    var fileInput = null;
    var fileListContainer = null;

    var eventListeners = new EventListenersCollection();
    eventListeners.registerEventType('files-updated');


    function init(zIndex, uuid, clipboard)
    {
        cardUuid = uuid;
        textClipboard = clipboard;
        overlay = createOverlay(zIndex);

        refreshFiles();

        return overlay;
    }


    function refreshFiles()
    {
        CardApi.getCardFileAttachments(cardUuid, files => {
            updateFileList(files);

            var urlMap = {};
            files.forEach(file => {urlMap[file.name] = file.url});
            eventListeners.dispatchEvent({type: 'files-updated', urlMap: urlMap});
        });
    }


    function isImageMediaType(mediaType)
    {
        return ((mediaType == "image/png") ||
                (mediaType == "image/jpeg") ||
                (mediaType == "image/gif") ||
                (mediaType == "image/bmp"));
    }


    function updateFileList(files)
    {
        var listElement = document.createElement("ul");
        listElement.setAttribute("data-role", "listview");

        files.forEach(function(file) {
            var listItemElement = document.createElement("li");

            var tableElement = document.createElement("table");
            tableElement.setAttribute('class', 'file-list-table');

            var tableRow = document.createElement("tr");
            tableElement.appendChild(tableRow);

            var tableCell = document.createElement("td");
            tableCell.setAttribute('colspan', 2);
            tableRow.appendChild(tableCell);

            /*
             * Create name view
             */

            var nameElement = document.createElement("div");
            nameElement.setAttribute('class', 'file-name-field');
            var textNode = document.createTextNode(file.name);
            nameElement.appendChild(textNode);

            tableCell.appendChild(nameElement);

            tableRow = document.createElement("tr");
            tableElement.appendChild(tableRow);

            tableCell = document.createElement("td");
            tableRow.appendChild(tableCell);


            /*
             * Create link for copying the file url to the clipboard
             */

            var cbLinkElement = document.createElement("a");
            cbLinkElement.setAttribute('href', '#');
            cbLinkElement.setAttribute('target', '_blank');
            cbLinkElement.setAttribute('data-ajax', "false");
            cbLinkElement.setAttribute('data-role', 'button');
            cbLinkElement.setAttribute('data-mini', 'true');
            cbLinkElement.addEventListener('click', function(e){
                textClipboard.copy(`@${file.name}`);
            });

            textNode = document.createTextNode("Copy URL");
            cbLinkElement.appendChild(textNode);

            tableCell.appendChild(cbLinkElement);

            /*
             * Create delete button
             */

            var deleteElement = document.createElement("a");
            deleteElement.setAttribute('href', '#');
            deleteElement.setAttribute('target', '_blank');
            deleteElement.setAttribute('data-ajax', "false");
            deleteElement.setAttribute('data-role', 'button');
            deleteElement.setAttribute('data-mini', 'true');
            deleteElement.addEventListener('click', function(e) {
                CardApi.deleteCardFileAttachment(file, ()=>refreshFiles());
            });

            textNode = document.createTextNode("Delete");
            deleteElement.appendChild(textNode);

            tableCell.appendChild(deleteElement);


            tableCell = document.createElement("td");
            tableCell.setAttribute('class', 'file-thumbnail-cell');
            tableRow.appendChild(tableCell);

            /*
             * Create file view
             */

            var fileLinkElement = document.createElement("a");
            fileLinkElement.setAttribute('href', file.url);
            fileLinkElement.setAttribute('target', '_blank');
            fileLinkElement.setAttribute('data-ajax', "false");
            //fileLinkElement.setAttribute('data-role', 'button');
            //fileLinkElement.setAttribute('data-mini', 'true');

            var thumbnailUrl = isImageMediaType(file.media_type) ?
                               file.url :
                               `${DJANGO_STATIC_URL}/images/binary_file_thumbnail.svg`;

            var fileThumbnailElement = document.createElement("img");
            fileThumbnailElement.setAttribute('src', thumbnailUrl);
            fileThumbnailElement.setAttribute('width', 90);
            fileThumbnailElement.setAttribute('height', 80);

            fileLinkElement.appendChild(fileThumbnailElement)

            tableCell.appendChild(fileLinkElement);

            listItemElement.appendChild(tableElement);
            listElement.appendChild(listItemElement);

        });

        // Remove all child nodes
        while (fileListContainer.hasChildNodes())
        {
            fileListContainer.removeChild(fileListContainer.lastChild);
        }

        fileListContainer.appendChild(listElement);

        $(fileListContainer).trigger("create");
    }


    function uploadFile()
    {
        var formData = new FormData(fileInput.form);

        CardApi.newCardFileAttachment(cardUuid, formData, ()=>{
            fileInput.value = "";
            refreshFiles();
        });

        return false;
    }


    function createOverlay(zIndex)
    {
        var template = document.createElement('template');
        template.innerHTML = htmlTemplate.trim();
        var rootElement = document.importNode(template.content.firstChild, true);

        overlay = new Overlay(zIndex, "FILE ATTACHMENTS");
        overlay.insert(rootElement);

        fileInput = document.getElementById("file_input");
        fileInput.addEventListener('change', function() { uploadFile(); });

        fileListContainer = document.getElementById("file_list_container");

        return overlay;
    }


    var htmlTemplate = `
    <div id="file_management_panel" style="position:absolute; left:0px; right:0px; bottom: 0px; top:0px; display:flex;flex-direction:column;">
        <form
            id="upload_file_form"
            action="javascript:void(0);"
            method="post"
            data-ajax='false'
            enctype="multipart/form-data">

            <input
                type="file"
                id="file_input"
                name="file_attachment">
        </form>

        <div id="file_list_container" style="overflow-y: auto;">
        </div>
    </div>`;

    /*
     * Return the public API.
     */
    return {
        init: function(zIndex, cardUuid, textClipboard)
        {
            return init(zIndex, cardUuid, textClipboard);
        },
        addEventListener: function(eventType, listener)
        {
            eventListeners.addEventListener(eventType, listener);
        },
        removeEventListener: function(eventType, listener)
        {
            eventListeners.removeEventListener(eventType, listener);
        }
    };
})();

