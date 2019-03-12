# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls

from . import utils

import json


@tag('card-api', 'integration')
class RetrievalAttemptApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/retrieval-attempts/{retrieval_attempt_id}/

    ### GET

    Returns the specified retrieval attempt which belongs to the
    card referenced by {uuid}.

    (see GET tests below for details)
    """

    def test_anonymous_user_can_not_view_retrieval_attempts(self):
        """
        Method: GET
        Anonymous users do not have GET access to this resource.
        """
        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 0)

        uuid = content['uuid']
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        # Create a new retrieval attempt
        data = {'success': True}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the self url of the newly created retrieval attempt
        content = json.loads(response.content)
        url = utils.get_rest_link(content['links'], 'self')
        url += "/" # avoid redirect

        utils.logout(self)

        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_get_card_retrieval_attempt(self):
        """
        Basic test of getting a retrieval attempt
        """
        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 0)

        uuid = content['uuid']
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        # Create a new retrieval attempt
        data = {'success': True}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the self url of the newly created retrieval attempt
        content = json.loads(response.content)
        url = utils.get_rest_link(content['links'], 'self')
        url += "/" # avoid redirect

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)

        self.assertEqual(content['retrieved'], True)
        self.assertEqual(content['spacing_bin'], 1)
        self.assertTrue('links' in content)

