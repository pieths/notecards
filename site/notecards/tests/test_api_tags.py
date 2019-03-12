# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls

from . import utils

import json


@tag('card-api', 'integration')
class TagsApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/tags/

    ### GET

    Retrieves all the tags stored in the system for the signed in user.
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.cards = [{
            'uuid': '6JedrZh2R3ia8FEojJb9b2',
            'tags': [{'label':'tag1'}, {'label':'tag2'}]
        },
        {
            'uuid': '1JedrZh2R3ia8FEojJb9b2',
            'tags': [{'label':'tag3'}, {'label':'tag4'}]
        }]

        user = utils.get_user(utils.test_user1)

        for card in cls.cards:
            utils.import_card(card, user)


    def test_anonymous_users_can_not_retrieve_tags(self):
        """
        Test anonymous user can not retrieve tags.
        """
        url = urls.reverse('notecards-api-tags')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)


    def test_get_all_tags(self):
        """
        Test retrieving all the tags in the system which
        belong to the specified user.
        """
        utils.login(self)

        url = urls.reverse('notecards-api-tags')
        response = self.client.get(url)

        tag_list = json.loads(response.content)['tags']
        tag_list = sorted(tag_list, key=lambda i: i['label'])

        self.assertEqual(len(tag_list), 4)
        self.assertEqual(tag_list[0]['label'], 'tag1')
        self.assertEqual(tag_list[1]['label'], 'tag2')
        self.assertEqual(tag_list[2]['label'], 'tag3')
        self.assertEqual(tag_list[3]['label'], 'tag4')

        utils.logout(self)

        # Make sure the other user does not have any tags
        utils.login(self, utils.test_user2)

        response = self.client.get(url)
        tag_list = json.loads(response.content)['tags']
        self.assertEqual(len(tag_list), 0)

