/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const TagManager = (function() {

    function sortTags(tags)
    {
        tags.sort(function(a, b)
        {
            if (a.label < b.label) return -1;
            if (a.label > b.label) return  1;
            return 0;
        });
    }


    function TagManager(zIndex, cardUuid, parentElement)
    {
        var allTags = [];
        var cardTags = [];

        var cardTagBar = new TagBar(parentElement);
        cardTagBar.addEventListener("click", showOverlay);

        var tagOverlay = new TagOverlay(zIndex);

        tagOverlay.addEventListener('card_tag_click', evt => {
            let tag = cardTags.find(tag => tag.label == evt.label);
            if (tag !== undefined)
            {
                CardApi.deleteCardTag(tag, ()=>updateCardTags());
            }
        });

        tagOverlay.addEventListener('all_tag_click', evt => {
            CardApi.newCardTag(cardUuid, evt.label, ()=>updateCardTags());
        });

        tagOverlay.addEventListener('new_tag_input', evt => {
            CardApi.newCardTag(cardUuid, evt.label, ()=> {
                updateCardTags();
                updateAllTags();
            });
        });

        function updateCardTags()
        {
            CardApi.getCardTags(cardUuid, tags => {
                sortTags(tags);
                cardTags = tags;

                cardTagBar.setTags(cardTags);
                tagOverlay.setCardTags(cardTags);
            });
        }

        function updateAllTags()
        {
            CardApi.getAllTags(tags => {
                sortTags(tags);
                allTags = tags;

                tagOverlay.setAllTags(allTags);
            });
        }

        function showOverlay()
        {
            tagOverlay.show();

            updateCardTags();
            updateAllTags();
        }

        updateCardTags();
        updateAllTags();
    }


    return TagManager;
})();

