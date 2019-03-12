/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const CardApi = (function() {

    var csrfToken = "";
    var pendingRequests = [];


    function init()
    {
        updateCSRFToken();
    }


    function updateCSRFToken()
    {
        csrfToken = Cookies.get('csrftoken');
    }


    function enhanceCardObject(card)
    {
        card.getLink = function(linkRel)
        {
            link = card.links.find(link => link.rel == linkRel);
            return (link === undefined) ? "#" : link.href;
        }
    }


    function createXhrRequest()
    {
        var xhr = new XMLHttpRequest();

        xhr.addEventListener("loadend", function() {
            pendingRequests = pendingRequests.filter(req => req != this);
        });

        pendingRequests.push(xhr);
        return xhr;
    }


    function abortPendingRequests()
    {
        pendingRequests.forEach(req => req.abort());
    }


    function sanitizeFilter(filter)
    {
        result = {};

        if ('reviewStatus' in filter)
        {
            let value = Number(filter.reviewStatus);
            if (Number.isSafeInteger(value))
            {
                result.review_status = value;
            }
        }

        if ('orderBy' in filter)
        {
            let value = Number(filter.orderBy);
            if (Number.isSafeInteger(value))
            {
                result.order_by = value;
            }
        }

        if ('active' in filter)
        {
            let value = Number(filter.active);
            if (Number.isSafeInteger(value))
            {
                result.active = value;
            }
        }

        if ('tagsFilter' in filter)
        {
            result.tags_filter = String(filter.tagsFilter);
        }

        if ('titleFilter' in filter)
        {
            result.title_filter = String(filter.titleFilter);
        }

        if ('cardsPerPage' in filter)
        {
            let value = Number(filter.cardsPerPage);
            if (Number.isSafeInteger(value))
            {
                result.cards_per_page = value;
            }
        }

        if ('page' in filter)
        {
            let value = Number(filter.page);
            if (Number.isSafeInteger(value))
            {
                result.page = value;
            }
        }

        if ('format' in filter)
        {
            result.format = String(filter.format)
        }

        return result;
    }


    function convertObjectToQuery(obj)
    {
        var query = "";

        if ((typeof obj === 'object') && (obj != null))
        {
            let queryParams = [];

            for (const prop in obj)
            {
                if (obj.hasOwnProperty(prop))
                {
                    let value = encodeURIComponent(String(prop)) + "=";
                    value += encodeURIComponent(String(obj[prop]));
                    queryParams.push(value);
                }
            }

            query = queryParams.join('&');
            query = query.replace(/%20/g, "+");
        }

        return query;
    }


    function loadIndexPage(filter)
    {
        var filter = sanitizeFilter(filter);
        var query = convertObjectToQuery(filter);

        var target = (query == "") ? "/cards/" : `/cards/?${query}`;
        location.assign(target);
    }


    function getCards(filter, retrievedEventListener)
    {
        var filter = sanitizeFilter(filter);
        var query = convertObjectToQuery(filter);

        if ((filter != null) &&
            (typeof filter == 'object') &&
            (filter.hasOwnProperty('format')) &&
            (filter.format == 'archive'))
        {
            window.open(`/cards/api/v1/cards/?${query}`);
        }
        else
        {
            var xhr = createXhrRequest();

            xhr.addEventListener("load", function() {
                if (retrievedEventListener !== undefined)
                {
                    var result = JSON.parse(this.responseText);
                    result.cards.forEach(card => enhanceCardObject(card));

                    retrievedEventListener(result);
                }
            });

            if (query == "") xhr.open("GET", "/cards/api/v1/cards/");
            else xhr.open("GET", "/cards/api/v1/cards/?" + query);

            xhr.send();
        }
    }


    function newCard(createdEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 201)
            {
                if (createdEventListener !== undefined)
                {
                    var card = JSON.parse(this.responseText);
                    enhanceCardObject(card);
                    createdEventListener(card);
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "/cards/api/v1/cards/");
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send("{}");
    }


    function updateCard(cardUpdateData, updatedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (updatedEventListener !== undefined)
                {
                    updatedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        var patch_data = [];

        if (cardUpdateData.hasOwnProperty('title'))
        {
            patch_data.push({
                'op': 'replace',
                'path': '/title',
                'value': cardUpdateData.title
            });
        }

        if (cardUpdateData.hasOwnProperty('query'))
        {
            patch_data.push({
                'op': 'replace',
                'path': '/query',
                'value': cardUpdateData.query
            });
        }

        if (cardUpdateData.hasOwnProperty('answer'))
        {
            patch_data.push({
                'op': 'replace',
                'path': '/answer',
                'value': cardUpdateData.answer
            });
        }

        if (cardUpdateData.hasOwnProperty('active'))
        {
            patch_data.push({
                'op': 'replace',
                'path': '/active',
                'value': cardUpdateData.active
            });
        }

        xhr.open("PATCH", `/cards/api/v1/cards/${cardUpdateData.uuid}/`);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json-patch+json');
        xhr.send(JSON.stringify(patch_data));
    }


    function deleteCard(uuid, deletedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (deletedEventListener !== undefined)
                {
                    deletedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("DELETE", `/cards/api/v1/cards/${uuid}/`);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.send();
    }


    function newRetrievalAttempt(uuid, success, createdEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (createdEventListener !== undefined)
                {
                    createdEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", `/cards/api/v1/cards/${uuid}/retrieval-attempts/`);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({success:success}));
    }


    function newCardTag(uuid, label, createdEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (createdEventListener !== undefined)
                {
                    createdEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", `/cards/api/v1/cards/${uuid}/tags/`);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({label:label}));
    }


    function deleteCardTag(tag, deletedEventListener)
    {
        var link = tag.links.find(link => link.rel == 'card-self');
        if (link === undefined) return;

        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (deletedEventListener !== undefined)
                {
                    deletedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("DELETE", link.href);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.send();
    }


    function getCardTags(uuid, retrievedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (retrievedEventListener !== undefined)
                {
                    var result = JSON.parse(this.responseText);
                    retrievedEventListener(result.tags);
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("GET", `/cards/api/v1/cards/${uuid}/tags/`);
        xhr.send();
    }


    function newCardFileAttachment(uuid, formData, createdEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 201)
            {
                if (createdEventListener !== undefined)
                {
                    createdEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", `/cards/api/v1/cards/${uuid}/files/`);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.send(formData);
    }


    function deleteCardFileAttachment(file, deletedEventListener)
    {
        var link = file.links.find(link => link.rel == 'self');
        if (link === undefined) return;

        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (deletedEventListener !== undefined)
                {
                    deletedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("DELETE", link.href);
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.send();
    }


    function getCardFileAttachments(uuid, retrievedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (retrievedEventListener !== undefined)
                {
                    var result = JSON.parse(this.responseText);
                    retrievedEventListener(result.files);
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("GET", `/cards/api/v1/cards/${uuid}/files/`);
        xhr.send();
    }


    function getAllTags(retrievedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (retrievedEventListener !== undefined)
                {
                    var result = JSON.parse(this.responseText);
                    retrievedEventListener(result.tags);
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("GET", `/cards/api/v1/tags/`);
        xhr.send();
    }


    function importCardArchive(formData, importedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (importedEventListener !== undefined)
                {
                    importedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "/cards/api/v1/card-archive-import-tasks/");
        xhr.send(formData);
    }


    function advanceReviewDate(numDays, filter, advancedEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (advancedEventListener !== undefined)
                {
                    advancedEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "/cards/api/v1/advance-review-date-tasks/");
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json');

        var requestBody = {num_days: numDays};

        if (filter !== undefined)
        {
            var filter = sanitizeFilter(filter);
            requestBody.filter = filter;
        }

        xhr.send(JSON.stringify(requestBody));
    }


    function login(username, password, loggedInEventListener, errorEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                /*
                 * CSRF tokens are rotated each time a user logs in.
                 * Update the token to the latest value after successful
                 * login. See https://docs.djangoproject.com/en/2.1/ref/csrf/
                 */
                updateCSRFToken();

                if (loggedInEventListener !== undefined)
                {
                    loggedInEventListener();
                }
            }
            else
            {
                message = "Error logging in. Please try again later.";

                if (this.status == 400)
                {
                    var result = JSON.parse(this.responseText);
                    message = result.message;
                }

                if (errorEventListener !== undefined)
                {
                    errorEventListener(message);
                }

                console.log(this.responseText);
            }
        });

        xhr.open("POST", "/cards/api/v1/logins/");
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.setRequestHeader('Content-Type', 'application/json');

        var requestBody = {
            username: username,
            password: password
        };

        xhr.send(JSON.stringify(requestBody));
    }


    function logout(loggedOutEventListener)
    {
        var xhr = createXhrRequest();

        xhr.addEventListener("load", function() {
            if (this.status == 200)
            {
                if (loggedOutEventListener !== undefined)
                {
                    loggedOutEventListener();
                }
            }
            else
            {
                console.log(this.responseText);
            }
        });

        xhr.open("POST", "/cards/api/v1/logouts/");
        xhr.setRequestHeader("X-CSRFToken", csrfToken);
        xhr.send();
    }


    /*
     * Return the public API.
     */
    return {
        init: function()
        {
            init();
        },
        login: function(username, password, loggedInEventListener, errorEventListener)
        {
            login(username, password, loggedInEventListener, errorEventListener);
        },
        logout: function(loggedOutEventListener)
        {
            logout(loggedOutEventListener);
        },
        newCard: function(createdEventListener)
        {
            newCard(createdEventListener);
        },
        getCards: function(filter, retrievedEventListener)
        {
            getCards(filter, retrievedEventListener);
        },
        abortPendingRequests: function()
        {
            abortPendingRequests();
        },
        loadIndexPage: function(filter)
        {
            loadIndexPage(filter);
        },
        importCardArchive: function(formData, importedEventListener)
        {
            importCardArchive(formData, importedEventListener);
        },
        advanceReviewDate: function(numDays, filter, advancedEventListener)
        {
            advanceReviewDate(numDays, filter, advancedEventListener);
        },
        updateCard: function(cardUpdateData, updatedEventListener)
        {
            updateCard(cardUpdateData, updatedEventListener);
        },
        deleteCard: function(uuid, deletedEventListener)
        {
            deleteCard(uuid, deletedEventListener);
        },
        newRetrievalAttempt: function(uuid, success, createdEventListener)
        {
            newRetrievalAttempt(uuid, success, createdEventListener);
        },
        newCardTag: function(uuid, label, createdEventListener)
        {
            newCardTag(uuid, label, createdEventListener);
        },
        deleteCardTag: function(tag, deletedEventListener)
        {
            deleteCardTag(tag, deletedEventListener);
        },
        getCardTags: function(uuid, retrievedEventListener)
        {
            getCardTags(uuid, retrievedEventListener);
        },
        getAllTags: function(retrievedEventListener)
        {
            getAllTags(retrievedEventListener);
        },
        newCardFileAttachment: function(uuid, formData, createdEventListener)
        {
            newCardFileAttachment(uuid, formData, createdEventListener);
        },
        deleteCardFileAttachment: function(file, deletedEventListener)
        {
            deleteCardFileAttachment(file, deletedEventListener);
        },
        getCardFileAttachments: function(uuid, retrievedEventListener)
        {
            getCardFileAttachments(uuid, retrievedEventListener);
        }
    };
})();

