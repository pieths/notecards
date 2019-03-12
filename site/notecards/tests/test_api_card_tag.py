# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls

from notecards.models import Tag
from . import utils

import json


@tag('card-api', 'integration')
class CardTagApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/tags/{tag_id}/

    ### DELETE

    Disassociates the tag specified by {tag_id} from the card
    specified by {uuid}.

    (see DELETE tests below for details)
    """

    def test_anonymous_users_can_not_delete_card_tags(self):
        """
        Method: DELETE
        Anonymous users do not have DELETE access to this resource.
        """
        card_values = {
            'uuid': '6JedrZh2R3ia8FEojJb9bQ',
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            'tags': [{'label':'tag1'}, {'label':'tag2'}, {'label':'tag3'}]
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)

        tag_list1 = json.loads(response.content)['tags']

        url = utils.get_rest_link(tag_list1[1]['links'], 'card-self')

        utils.logout(self)

        response = self.client.delete(url)
        self.assertEqual(response.status_code, 401)

    def test_delete_tag_from_card_using_card_self_link(self):
        """
        Method: DELETE
        The 'card-self' link which is included with each tag
        when retrieving the tags which belong to a specific
        card provides the url for this api call.
        """
        card_values = {
            'uuid': '6JedrZh2R3ia8FEojJb9bQ',
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            'tags': [{'label':'tag1'}, {'label':'tag2'}, {'label':'tag3'}]
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)

        tag_list1 = json.loads(response.content)['tags']

        # Remove the second tag from the card tag list
        # so that the comparison works correctly
        removed_tag = tag_list1[1]
        del tag_list1[1]

        url = utils.get_rest_link(removed_tag['links'], 'card-self')

        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)

        tag_list2 = json.loads(response.content)['tags']

        utils.assertTagsMatch(self, tag_list1, tag_list2)

    def test_delete_tag_from_card_does_not_remove_tag_from_system(self):
        """
        Method: DELETE
        When a tag is disconnected from a card, it is not
        removed from the system.
        """
        card_values = {
            'uuid': '6JedrZh2R3ia8FEojJb9bQ',
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            'tags': [{'label':'tag1'}, {'label':'tag2'}, {'label':'tag3'}]
        }

        self.assertEqual(len(Tag.objects.all()), 0)

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        self.assertEqual(len(Tag.objects.all()), 3)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)

        tag_list1 = json.loads(response.content)['tags']

        # Remove the second tag from the card tag list
        # so that the comparison works correctly
        removed_tag = tag_list1[1]
        del tag_list1[1]

        url = utils.get_rest_link(removed_tag['links'], 'card-self')

        response = self.client.delete(url)
        self.assertEqual(response.status_code, 200)

        url = urls.reverse('notecards-api-card-tags', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)

        tag_list2 = json.loads(response.content)['tags']

        utils.assertTagsMatch(self, tag_list1, tag_list2)

        self.assertEqual(len(Tag.objects.all()), 3)

