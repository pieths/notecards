## /api/v1/cards/

### GET

Returns a list of cards which are optionally filtered by the
the specified filter parameters.

1.  A GET request with a query parameter `format=archive` returns a list
    of filtered cards in a gzipped tar file. Each entry in the tar file
    is a complete self contained card (including files and excluding link
    fields) in json format. All files included with the card are base64 encoded.
    
    This archive can be used to backup and share cards with others.
    The archive file format is also the file format which is used for
    importing cards in to the system.
    
    __NOTE__: The `page` and `cards_per_page` filter parameters work
    as they normally do. If the client is expecting to retrieve all
    of the cards across all pages then the client is responsible for
    setting the filter parameters appropriately (ie. `page=1` and `cards_per_page=0`)

2.  A get cards request performed by an anonymous user will
    not return any results.

3.  When retrieving a list of cards, the system will only
    return cards which belong to the currently logged in user.

### POST

Create a new card. The content type must be application/json.
The content of the request specifies the values to be used for
the fields of the card.

1.  New card requests with content type application/json
    and an empty body does not create a new card and returns
    a 400 error code.

2.  New card requests whose Content-Type is not equal to application/json
    are not accepted. An error code of 415 will be returned and no new
    card is added to the database.

3.  New card requests with content type application/json
    and anything other than a root object (ie. root list)
    does not create a new card and returns a 400 error.

4.  New card requests with content type application/json
    and an empty json object ({}) as content creates a new
    card using the default values.

5.  New card requests with content type application/json
    and a root content object containing values for some
    of the card fields creates a new card with the specified
    fields set to the specified values.

6.  A new card request that contains a user supplied uuid will
    create a new card with the specified uuid unless a card already
    exists with that uuid. If a card with the specified uuid already
    exists, then no new card is created and a 409 error is returned
    stating that there is a conflict with the uuid.

7.  More than one of the same card can exist in the
    system so long as they belong to different users.

8.  If a new card request contains a 'tags' field then the
    tags contained in this field are associated with the card.

9.  If a new card request contains a 'files' field then the
    files contained in this field are associated with the card.

10. New cards can only be created by a logged in user.

------------------------------------------------------------

## /api/v1/cards/{uuid}/

### GET

Retrieves the specified card using the format specified by
the optional `format` query parameter.

1.  Anonymous users can not view any cards.

### PATCH

Updates the card specified by {uuid} with the patch data
supplied in the request body. The request content type
must be application/json-patch+json and the patch format
is a slimmed down version of [JSON Patch](https://tools.ietf.org/html/rfc6902).

1.  Anonymous users can not update any cards.

2.  Only the following fields are accessible with the 'path' field
    and each of these fields only supports the `replace` operation.
    
    1. title
    2. query
    3. answer
    4. active
    
    Here is an example request body which updates the query and answer:
    
    ``` javascript
    [
        { "op": "replace", "path": "/query", "value": "patched query" },
        { "op": "replace", "path": "/answer", "value": "patched answer" }
    ]
    ```

### DELETE

Deletes the card specified by {uuid}. Returns 200 status code if
the deletion was successfull.

1.  Anonymous users can not delete any cards.

------------------------------------------------------------

## /api/v1/cards/{uuid}/tags/

### GET

Returns a list of the all the tags which
belong to the card specified by {uuid}. This
request currently contains no parameters.

### POST

Associates the tag specified as a json object with the card
specified by {uuid}. If the tag does not already exist in the
system it is created.

1.  Anonymous users do not have POST access to this resource.

2.  Associating an existing tag (one that already exists in the
    system wide list of tags) with a card will not add a new tag to
    the system wide list and just use the preexisting tag.

3.  Associating a new tag (one that does not already exist in the
    system wide list of tags) with a card will add the new tag to
    the system wide list so that it can be used with other cards.

------------------------------------------------------------

## /api/v1/cards/{uuid}/tags/{tag_id}/

### DELETE

Disassociates the tag specified by {tag_id} from the card
specified by {uuid}.

1.  Anonymous users do not have DELETE access to this resource.

2.  The 'card-self' link which is included with each tag
    when retrieving the tags which belong to a specific
    card provides the url for this api call.

3.  When a tag is disconnected from a card, it is not
    removed from the system.

------------------------------------------------------------

## /api/v1/cards/{uuid}/files/

### GET

Retrieves a list of records referencing the files which are
associated with the specified card. The optional 'format'
query parameter specifies how the records should be formatted.

1.  Anonymous users do not have GET access to this resource.

### POST

Creates a new file attachment for the specified card. The file
is uploaded via the request body and should be stored in a
field named 'file_attachment'.

1.  Anonymous users do not have POST access to this resource.

------------------------------------------------------------

## /api/v1/cards/{uuid}/files/{file_id}/

### GET

Retrieves the specified file record which is associated with the card.
The url to the actual file is stored in the 'url' field of the returned
record.

1.  Anonymous users can not view any card files.

### DELETE

Deletes the file associate with the card.

1.  Anonymous users can not delete card files.

------------------------------------------------------------

## /api/v1/cards/{uuid}/retrieval-attempts/

### GET

Returns a list of the all the retrieval attempts which
belong to the card specified by {uuid}.

1.  Anonymous users do not have GET access to this resource.

2.  Creating a new card with default values has no retrieval attempts.

### POST

Creates a new retrieval attempt for the card specified by {uuid}.
The content type is application/json and the body must contain an
object with a field called "success" whose value is a boolean
representing whether or not the retrieval attempt was successfull.

``` javascript
{"success": true}

// or,

{"success": false}
```

1.  Anonymous users do not have POST access to this resource.

2.  Creating a new retrieval attempt with a {success:true}
    body advances the spacing bin by one and advances the
    next retrieval date by more than one day in the future.

3.  Creating a new retrieval attempt with a {success:false}
    body resets the spacing bin to 1 and sets the next
    retrieval date to one day from now.

------------------------------------------------------------

## /api/v1/cards/{uuid}/retrieval-attempts/{retrieval_attempt_id}/

### GET

Returns the specified retrieval attempt which belongs to the
card referenced by {uuid}.

1.  Anonymous users do not have GET access to this resource.

------------------------------------------------------------

## /api/v1/tags/

### GET

Retrieves all the tags stored in the system for the signed in user.

------------------------------------------------------------

## /api/v1/card-archive-import-tasks/

### POST

Create a new card archive import task. This task imports
the cards which are contained in a card archive. A card
archive is generated when cards are exported from the system.

1.  Anonymous users can not import card archives.

2.  A post request of content type multipart/form-data which contains a
    card archive as a file attachment is uploaded and the cards in the
    archive are imported in to the system. The form name field for
    the uploaded file in the request body is `archive_file`.

------------------------------------------------------------

## /api/v1/advance-review-date-tasks/

### POST

Create a new advance review date task. This task advances
the review date of the cards by the specified number of days.
An optional filter can be supplied to limit the cards whose
dates will be advanced.

1.  Anonymous users do not have POST access to this resource.

2.  The accepted content is of type `application/json` and should
    have the following form (note, the keys and values for the filter
    dictionary/object are the same as the ones used when retrieving
    a card list or archive):
    
    ``` javascript
    {
        num_days: 3,
        filter:
        {
            'tags_filter': "math",
            'review_status': 1
        }
    }
    ```
    
    A successfull post returns a 200 response code.

3.  If the request body json object does not contain
    a `num_days` field then no cards should be updated
    and an http error code of 400 is returned.

4.  If the request body json object `num_days` field
    is negative then no cards are updated and an http
    error code of `400` is returned.
