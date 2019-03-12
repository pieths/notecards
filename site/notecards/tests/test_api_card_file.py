# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls
from django.core.serializers.json import DjangoJSONEncoder

from . import utils

import json


@tag('card-api', 'integration')
class CardFileApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/files/{file_id}/

    ### GET

    Retrieves the specified file record which is associated with the card.
    The url to the actual file is stored in the 'url' field of the returned
    record.

    (see GET tests below for details)

    ### DELETE

    Deletes the file associate with the card.

    (see DELETE tests below for details)
    """

    def test_must_be_logged_in_to_view_a_card_file(self):
        """
        Method: GET
        Anonymous users can not view any card files.
        """
        card_values = {
            "uuid": "GLhV7iK2Rm6qyOjbPaHIO9",
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
        }

        file_content = "some initial text data"
        utils.attach_text_to_card_obj_as_file(card_values, file_content, "test_file.txt")

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        url = utils.get_rest_link(content['files'][0]['links'], 'self')
        url += "/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        utils.logout(self)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_must_be_logged_in_to_delete_a_card_file(self):
        """
        Method: DELETE
        Anonymous users can not delete card files.
        """
        card_values = {
            "uuid": "GLhV7iK2Rm6qyOjbPaHIO9",
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
        }

        file_content = "some initial text data"
        utils.attach_text_to_card_obj_as_file(card_values, file_content, "test_file.txt")

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        url = utils.get_rest_link(content['files'][0]['links'], 'self')
        url += "/"

        utils.logout(self)

        response = self.client.delete(url)
        self.assertEqual(response.status_code, 401)

