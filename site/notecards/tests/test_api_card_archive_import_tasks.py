# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django import urls
from django.test import tag

import io
import json

from . import utils


@tag('card-api', 'integration')
class CardArchiveImportTasksApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/card-archive-import-tasks/

    ### POST

    Create a new card archive import task. This task imports
    the cards which are contained in a card archive. A card
    archive is generated when cards are exported from the system.

    (see POST tests below for details)
    """
    def test_anonymous_users_can_not_import_card_archives(self):
        """
        Method: POST
        Anonymous users can not import card archives.
        """
        file_like_object = io.BytesIO(b"fake archive file bytes")
        response = self.client.post(urls.reverse('notecards-api-card-archive-import-tasks'),
                                    {'archive_file': file_like_object})
        self.assertEqual(response.status_code, 401)

    def test_post_archive(self):
        """
        Method: POST
        A post request of content type multipart/form-data which contains a
        card archive as a file attachment is uploaded and the cards in the
        archive are imported in to the system. The form name field for
        the uploaded file in the request body is `archive_file`.
        """

        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)
        response = self.client.get(urls.reverse('notecards-api-cards'),
                                   {'review_status': 1, 'format': 'archive'})
        self.assertEqual(response['Content-Type'], "application/octet-stream")
        self.assertTrue(response['Content-Disposition'].startswith('attachment; filename="'))

        file_like_object = io.BytesIO(b"".join(response.streaming_content))
        file_like_object.seek(0)

        utils.clear_database()

        utils.assertNumCardsEquals(self, 0)
        self.client.post(urls.reverse('notecards-api-card-archive-import-tasks'),
                         {'archive_file': file_like_object})
        utils.assertNumCardsEquals(self, len(card_objects))

        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

