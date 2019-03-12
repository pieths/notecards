# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls

from notecards.models import Tag
from . import utils

import json


@tag('card-api', 'integration')
class CardTagsApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/tags/

    ### GET

    Returns a list of the all the tags which
    belong to the card specified by {uuid}. This
    request currently contains no parameters.

    ### POST

    Associates the tag specified as a json object with the card
    specified by {uuid}. If the tag does not already exist in the
    system it is created.

    (see POST tests below for details)
    """
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.user1_cards = [{
            'uuid': '6JedrZh2R3ia8FEojJb9b2',
            'tags': [{'label':'tag1'}, {'label':'tag2'}]
        },
        {
            'uuid': '1JedrZh2R3ia8FEojJb9b2',
            'tags': [{'label':'tag3'}, {'label':'tag4'}]
        },
        {
            'uuid': 'aJedrZh2R3ia8FEojJb9b2',
            'tags': []
        }]

        user = utils.get_user(utils.test_user1)

        for card in cls.user1_cards:
            utils.import_card(card, user)

        cls.user2_cards = [{ 'uuid': 'aJedrZh2R3ia8FEojJb9b2' }]
        utils.import_card(cls.user2_cards[0], utils.test_user2)


    def test_anonymous_users_can_not_view_card_tags(self):
        """
        Method: GET
        Anonymous users do not have GET access to this resource.
        """
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[0]['uuid']})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)


    def test_get_tags_which_belong_to_a_specific_card(self):
        """
        Test retrieving the tag list which belongs to a specified card.
        """
        utils.login(self)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[1]['uuid']})
        response = self.client.get(url)

        tag_list = json.loads(response.content)

        self.assertTrue('tags' in tag_list)
        utils.assertTagsMatch(self, tag_list['tags'], self.user1_cards[1]['tags'])


    def test_anonymous_user_can_not_add_tag_to_card(self):
        """
        Method: POST
        Anonymous users do not have POST access to this resource.
        """
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[0]['uuid']})
        data = {'label': 'tag7'}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 401)


    def test_add_new_tag_to_card_adds_tag_to_global_tag_list(self):
        """
        Method: POST
        Associating a new tag (one that does not already exist in the
        system wide list of tags) with a card will add the new tag to
        the system wide list so that it can be used with other cards.
        """
        utils.login(self)

        tags = Tag.objects.all()
        initial_num_tags = len(tags)

        tag = {'label': 'tag7'}
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[2]['uuid']})
        response = self.client.post(url, tag, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Verify that the tag is associated with the card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[2]['uuid']})
        response = self.client.get(url)
        tag_list = json.loads(response.content)
        self.assertTrue(len(tag_list['tags']) == 1)
        self.assertEqual(tag_list['tags'][0]['label'], tag['label'])

        # Verify that a new tag was added to the main tags table
        tags = Tag.objects.all()
        self.assertEqual(len(tags), initial_num_tags + 1)


    def test_tags_are_not_shared_between_users(self):
        """
        Method: POST
        Tags are not shared between users.
        """
        tag = {'label': 'tag8'}

        utils.login(self)

        # Add the tag to the user1's third card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[2]['uuid']})
        response = self.client.post(url, tag, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        utils.logout(self)
        utils.login(self, utils.test_user2)

        # Add the tag to the user2's first card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user2_cards[0]['uuid']})
        response = self.client.post(url, tag, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        utils.logout(self)
        utils.login(self)

        # Get the self link for the tag associated with user1's third card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user1_cards[2]['uuid']})
        response = self.client.get(url)
        tag_list = json.loads(response.content)['tags']
        self.assertEqual(len(tag_list), 1)
        self.assertEqual(tag_list[0]['label'], tag['label'])
        user1_tag_self_link = utils.get_rest_link(tag_list[0]['links'], 'self')

        utils.logout(self)
        utils.login(self, utils.test_user2)

        # Get the self link for the tag associated with user2's first card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': self.user2_cards[0]['uuid']})
        response = self.client.get(url)
        tag_list = json.loads(response.content)['tags']
        self.assertEqual(len(tag_list), 1)
        self.assertEqual(tag_list[0]['label'], tag['label'])
        user2_tag_self_link = utils.get_rest_link(tag_list[0]['links'], 'self')

        self.assertNotEqual(user1_tag_self_link, user2_tag_self_link)


@tag('card-api', 'integration')
class CardTagsApiTransactionalTests(utils.CardApiTransactionTestCase):
    """
    ## /api/v1/cards/{uuid}/tags/

    (see POST tests below for details)
    """
    def test_add_existing_tag_to_card(self):
        """
        Method: POST
        Associating an existing tag (one that already exists in the
        system wide list of tags) with a card will not add a new tag to
        the system wide list and just use the preexisting tag.
        """
        tags = Tag.objects.all()
        self.assertEqual(len(tags), 0)

        tag = {'label': 'tag1'}
        card_values = {
            'uuid': '6JedrZh2R3ia8FEojJb9bQ',
            'tags': [tag]
        }

        utils.import_card(card_values, utils.test_user1)
        utils.login(self)

        # Verify that the tag exists in the main tags table
        tags = Tag.objects.all()
        self.assertEqual(len(tags), 1)
        self.assertEqual(tags[0].label, 'tag1')
        self.assertEqual(tags[0].pk, 1)

        card_values = { 'uuid': '1JedrZh2R3ia8FEojJb9bQ' }
        utils.import_card(card_values, utils.test_user1)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.post(url, tag, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Verify that the tag is associated with the card
        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)
        tag_list = json.loads(response.content)
        self.assertTrue(len(tag_list['tags']) == 1)
        self.assertEqual(tag_list['tags'][0]['label'], tag['label'])

        # Verify that the system wide tag list has not changed
        tags = Tag.objects.all()
        self.assertEqual(len(tags), 1)
        self.assertEqual(tags[0].label, 'tag1')
        self.assertEqual(tags[0].pk, 1)

