# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls
from django.core.serializers.json import DjangoJSONEncoder

from . import utils

import json


@tag('card-api', 'integration')
class CardApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/

    ### GET

    Retrieves the specified card using the format specified by
    the optional `format` query parameter.

    (see GET tests below for details)

    ### PATCH

    Updates the card specified by {uuid} with the patch data
    supplied in the request body. The request content type
    must be application/json-patch+json and the patch format
    is a slimmed down version of [JSON Patch](https://tools.ietf.org/html/rfc6902).

    (see PATCH tests below for details)

    ### DELETE

    Deletes the card specified by {uuid}. Returns 200 status code if
    the deletion was successfull.

    (see DELETE tests below for details)
    """

    def test_must_be_logged_in_to_view_a_card(self):
        """
        Method: GET
        Anonymous users can not view any cards.
        """
        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.login(self, utils.test_user1)

        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        utils.logout(self)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_anonymous_users_can_not_patch_a_card_resource(self):
        """
        Method: PATCH
        Anonymous users can not update any cards.
        """
        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        utils.logout(self)

        patch_doc = [
            {'op': 'replace', 'path': '/title', 'value': 'patched title'},
            {'op': 'replace', 'path': '/query', 'value': 'patched query'}
        ]

        patch_json = json.dumps(patch_doc, cls=DjangoJSONEncoder)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.patch(url, patch_json, content_type='application/json-patch+json')
        self.assertEqual(response.status_code, 401)

    def test_update_card_fields_with_patch(self):
        """
        Method: PATCH
        Only the following fields are accessible with the 'path' field
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
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        card_objects[2].update({
            'title': 'patched title',
            'query': 'patched query',
            'answer': 'patched answer',
            'active': False
        })

        patch_doc = [
            {'op': 'replace', 'path': '/title', 'value': card_objects[2]['title']},
            {'op': 'replace', 'path': '/query', 'value': card_objects[2]['query']},
            {'op': 'replace', 'path': '/answer', 'value': card_objects[2]['answer']},
            {'op': 'replace', 'path': '/active', 'value': card_objects[2]['active']},
            {'op': 'replace', 'path': '/spacing_bin', 'value': 7},
            {'op': 'replace', 'path': '/next_retrieval_date', 'value': '2016-05-21T17:10:17.732Z'},
            {'op': 'replace', 'path': '/creation_date', 'value': '2015-05-21T17:10:17.732Z'}
        ]

        patch_json = json.dumps(patch_doc, cls=DjangoJSONEncoder)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_objects[2]['uuid']})
        response = self.client.patch(url, patch_json, content_type='application/json-patch+json')
        self.assertEqual(response.status_code, 200)

        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1, 'active': 2, 'format': ''})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

    def test_last_modified_date_is_set_correctly_when_updating_a_card(self):
        """
        Method: PATCH
        When a card is updated using the PATCH api, the last modified
        date is also updated.
        """
        card_values = { "last_modified_date": "2017-09-26T21:41:46.628Z" }

        utils.login(self, utils.test_user1)

        # Create a card with a last modified date already specified
        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertEqual(content['last_modified_date'], card_values['last_modified_date'])

        patch_doc = [
            {'op': 'replace', 'path': '/title', 'value': "new title"}
        ]

        patch_json = json.dumps(patch_doc, cls=DjangoJSONEncoder)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': content['uuid']})
        response = self.client.patch(url, patch_json, content_type='application/json-patch+json')
        self.assertEqual(response.status_code, 200)

        content = json.loads(response.content)
        utils.assertDateTimeIsNow(self, content['last_modified_date'])

    def test_anonymous_users_can_not_delete_a_card_resource(self):
        """
        Method: DELETE
        Anonymous users can not delete any cards.
        """
        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        utils.logout(self)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 401)
        utils.assertNumCardsEquals(self, 1)

    def test_delete_card(self):
        """
        General delete test.
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        utils.assertNumCardsEquals(self, 5)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_objects[2]['uuid']})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)
        utils.assertNumCardsEquals(self, 4)

        del card_objects[2]
        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1, 'active': 2, 'format': ''})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

