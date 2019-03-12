# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls

from . import utils

import io
import json
import base64


@tag('card-api', 'integration')
class CardFilesApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/files/

    ### GET

    Retrieves a list of records referencing the files which are
    associated with the specified card. The optional 'format'
    query parameter specifies how the records should be formatted.

    (see GET tests below for details)

    ### POST

    Creates a new file attachment for the specified card. The file
    is uploaded via the request body and should be stored in a
    field named 'file_attachment'.

    (see POST tests below for details)
    """

    def test_anonymous_users_can_not_view_card_files(self):
        """
        Method: GET
        Anonymous users do not have GET access to this resource.
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
        url = utils.get_rest_link(content['links'], 'files')
        url += "/"

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertEqual(len(content['files']), 1)

        utils.logout(self)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_anonymous_users_can_not_upload_files(self):
        """
        Method: POST
        Anonymous users do not have POST access to this resource.
        """
        card_values = {
            "uuid": "GLhV7iK2Rm6qyOjbPaHIO9",
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        files_url = utils.get_rest_link(content['links'], 'files')
        files_url += "/"

        utils.logout(self)

        file_bytes = b"fake file bytes"
        file_like_object = io.BytesIO(file_bytes)
        response = self.client.post(files_url, {'file_attachment': file_like_object})
        self.assertEqual(response.status_code, 401)

    def test_upload_file_attachment_to_card(self):
        """
        Basic upload file test
        """
        card_values = {
            "uuid": "GLhV7iK2Rm6qyOjbPaHIO9",
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        files_url = utils.get_rest_link(content['links'], 'files')
        files_url += "/"

        file_bytes = b"fake file bytes"
        file_like_object = io.BytesIO(file_bytes)
        response = self.client.post(files_url, {'file_attachment': file_like_object})
        self.assertEqual(response.status_code, 201)

        response = self.client.get(files_url, {'format': 'archive'})
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertEqual(len(content['files']), 1)

        retrieved_file_bytes = base64.b64decode(content['files'][0]['data'])
        self.assertEqual(retrieved_file_bytes, file_bytes)

