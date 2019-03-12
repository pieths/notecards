# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from unittest import skip

from django.test import tag
from django import urls
from django.db import transaction

from . import utils

import io
import json
import tarfile


@tag('card-api', 'integration')
class CardsApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/

    ### GET

    Returns a list of cards which are optionally filtered by the
    the specified filter parameters.

    (see GET tests below for details)

    ### POST

    Create a new card. The content type must be application/json.
    The content of the request specifies the values to be used for
    the fields of the card.

    (see POST tests below for details)
    """

    def test_get_archive(self):
        """
        Method: GET
        A GET request with a query parameter `format=archive` returns a list
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
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        response = self.client.get(urls.reverse('notecards-api-cards'),
                                   {'review_status': 1, 'format': 'archive'})
        self.assertEqual(response['Content-Type'], "application/octet-stream")
        self.assertTrue(response['Content-Disposition'].startswith('attachment; filename="'))

        file_like_object = io.BytesIO(b"".join(response.streaming_content))
        tf = tarfile.open(fileobj=file_like_object, mode='r:gz')

        self.assertEqual(len(tf.getmembers()), len(card_objects))

        response_card_list = []

        for tarinfo in tf:
            buffered_reader = tf.extractfile(tarinfo)
            obj = json.load(buffered_reader)
            response_card_list.append(obj)

        utils.assertCardListsMatch(self, response_card_list, card_objects)

    def test_get_cards_returns_empty_list_for_anonymous_users(self):
        """
        Method: GET
        A get cards request performed by an anonymous user will
        not return any results.
        """
        utils.login(self, utils.test_user1)

        card_values1 = {"uuid": "iNK676auRH6ahf_IkCqKLw"}
        card_values2 = {"uuid": "iNK676auRH6ahf_IkCq000"}

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values1)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        response = utils.post_json(self, 'notecards-api-cards', card_values2)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 2)

        utils.logout(self)

        response = self.client.get(urls.reverse('notecards-api-cards'),
                                   {'review_status': 1, 'active': 2})
        content = json.loads(response.content)
        self.assertEqual(len(content['cards']), 0)

    def test_get_cards_only_returns_the_cards_that_belong_to_the_owner(self):
        """
        Method: GET
        When retrieving a list of cards, the system will only
        return cards which belong to the currently logged in user.
        """
        utils.login(self, utils.test_user1)

        card_values1 = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values1)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        utils.logout(self)
        utils.login(self, utils.test_user2)

        card_values2 = {"uuid": "123676auRH6ahf_IkCq000"}

        response = utils.post_json(self, 'notecards-api-cards', card_values2)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 2)

        utils.logout(self)
        utils.login(self, utils.test_user1)

        response = self.client.get(urls.reverse('notecards-api-cards'),
                                   {'review_status': 1, 'active': 2})
        content = json.loads(response.content)
        self.assertEqual(len(content['cards']), 1)
        self.assertEqual(content['cards'][0]['uuid'], card_values1['uuid'])

        utils.logout(self)
        utils.login(self, utils.test_user2)

        response = self.client.get(urls.reverse('notecards-api-cards'),
                                   {'review_status': 1, 'active': 2})
        content = json.loads(response.content)
        self.assertEqual(len(content['cards']), 1)
        self.assertEqual(content['cards'][0]['uuid'], card_values2['uuid'])

    def test_new_card_not_created_when_request_content_type_not_equal_to_json(self):
        """
        Method: POST
        New card requests whose Content-Type is not equal to application/json
        are not accepted. An error code of 415 will be returned and no new
        card is added to the database.
        """
        utils.assertNumCardsEquals(self, 0)
        response = self.client.post(urls.reverse('notecards-api-cards'), {},
                                    content_type='application/x-www-form-urlencoded')
        utils.assertNumCardsEquals(self, 0)
        self.assertEqual(response.status_code, 415)

        utils.assertNumCardsEquals(self, 0)
        response = self.client.post(urls.reverse('notecards-api-cards'), {}) # multipart/form-data
        utils.assertNumCardsEquals(self, 0)
        self.assertEqual(response.status_code, 415)

    def test_new_card_not_created_with_json_root_that_is_not_an_object(self):
        """
        Method: POST
        New card requests with content type application/json
        and anything other than a root object (ie. root list)
        does not create a new card and returns a 400 error.
        """
        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', [])
        self.assertEqual(response.status_code, 400)
        utils.assertNumCardsEquals(self, 0)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', ['stuff', 'in', 'list'])
        self.assertEqual(response.status_code, 400)
        utils.assertNumCardsEquals(self, 0)

    # See django.test.client.RequestFactory.generic(...)
    @skip("Can't easily test because content-type is removed from requests with empty body")
    def test_new_card_not_created_if_request_body_is_empty(self):
        """
        Method: POST
        New card requests with content type application/json
        and an empty body does not create a new card and returns
        a 400 error code.
        """
        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', "")
        self.assertEqual(response.status_code, 400)
        utils.assertNumCardsEquals(self, 0)

    def test_new_empty_card_created_with_empty_object(self):
        """
        Method: POST
        New card requests with content type application/json
        and an empty json object ({}) as content creates a new
        card using the default values.
        """
        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        utils.assertCardFieldsMatch(self, content, utils.default_card_values)
        utils.assertDateTimeIsNow(self, content['creation_date'])

    def test_new_card_created_with_user_supplied_values(self):
        """
        Method: POST
        New card requests with content type application/json
        and a root content object containing values for some
        of the card fields creates a new card with the specified
        fields set to the specified values.
        """
        card_values = {
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            "spacing_bin": 3,
            "active": True,
            "creation_date": "2017-09-26T21:41:46.628Z",
            "next_retrieval_date": "2018-06-21T17:10:17.732Z",
            'retrieval_attempts': [
            {
                u'retrieval_date': u'2018-03-02T19:52:58.992Z',
                u'retrieved': True,
                u'spacing_bin': 1
            },
            {
                u'retrieval_date': u'2018-03-07T00:34:14.651Z',
                u'retrieved': True,
                u'spacing_bin': 2
            }]
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        utils.assertCardFieldsMatch(self, content, card_values)

    def test_new_card_create_request_with_user_supplied_uuid_creates_card_only_if_not_already_exists(self):
        """
        Method: POST
        A new card request that contains a user supplied uuid will
        create a new card with the specified uuid unless a card already
        exists with that uuid. If a card with the specified uuid already
        exists, then no new card is created and a 409 error is returned
        stating that there is a conflict with the uuid.
        """
        utils.login(self)

        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertEqual(content['uuid'], card_values['uuid'])

        card_values.update(content)

        utils.assertNumCardsEquals(self, 1)
        # See https://stackoverflow.com/a/23326971 for why the `with` is used here
        # Also see, https://docs.djangoproject.com/en/2.1/topics/db/transactions/
        with transaction.atomic():
            response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 409)
        utils.assertNumCardsEquals(self, 1)

    def test_multiple_new_card_create_requests_with_same_uuid_is_valid_when_created_by_separate_users(self):
        """
        Method: POST
        More than one of the same card can exist in the
        system so long as they belong to different users.
        """
        utils.login(self, utils.test_user1)

        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertEqual(content['uuid'], card_values['uuid'])

        utils.logout(self)
        utils.login(self, utils.test_user2)

        # See https://stackoverflow.com/a/23326971 for why the `with` is used here
        # Also see, https://docs.djangoproject.com/en/2.1/topics/db/transactions/
        with transaction.atomic():
            response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 2)

    def test_new_card_created_with_tags(self):
        """
        Method: POST
        If a new card request contains a 'tags' field then the
        tags contained in this field are associated with the card.
        """
        card_values = {
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            "spacing_bin": 3,
            "active": True,
            "creation_date": "2017-09-26T21:41:46.628Z",
            "next_retrieval_date": "2018-06-21T17:10:17.732Z",
            'retrieval_attempts': [
            {
                u'retrieval_date': u'2018-03-02T19:52:58.992Z',
                u'retrieved': True,
                u'spacing_bin': 1
            },
            {
                u'retrieval_date': u'2018-03-07T00:34:14.651Z',
                u'retrieved': True,
                u'spacing_bin': 2
            }],
            'tags': [{'label':'tag1'}, {'label':'TAG2'}, {'label':'Tag3'}]
        }

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        # Convert the expected value tags to lower case for comparison
        for tag in card_values['tags']:
            tag['label'] = tag['label'].lower()

        content = json.loads(response.content)
        utils.assertCardFieldsMatch(self, content, card_values)

    def test_new_card_created_with_file_attachment(self):
        """
        Method: POST
        If a new card request contains a 'files' field then the
        files contained in this field are associated with the card.
        """
        card_values = {
            "uuid": "GLhV7iK2Rm6qyOjbPaHIOc",
            "title": "title string",
            "query": "query string",
            "answer": "answer string",
            "spacing_bin": 3,
            "active": True,
            "creation_date": "2017-09-26T21:41:46.628Z",
            "next_retrieval_date": "2018-06-21T17:10:17.732Z",
            'retrieval_attempts': [
            {
                u'retrieval_date': u'2018-03-02T19:52:58.992Z',
                u'retrieved': True,
                u'spacing_bin': 1
            },
            {
                u'retrieval_date': u'2018-03-07T00:34:14.651Z',
                u'retrieved': True,
                u'spacing_bin': 2
            }],
            'tags': [{'label':'tag1'}, {'label':'TAG2'}, {'label':'Tag3'}]
        }

        file_content = "some initial text data"
        utils.attach_text_to_card_obj_as_file(card_values, file_content, "test_file.txt")

        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url, {'format': 'archive'})
        self.assertEqual(response.status_code, 200)

        content = json.loads(response.content)

        self.assertTrue('files' in content)
        self.assertEqual(len(content['files']), 1)
        self.assertTrue('data' in content['files'][0])

        self.assertEqual(content['files'][0]['data'],
                         card_values['files'][0]['data'])

    def test_must_be_logged_in_to_create_a_new_card(self):
        """
        Method: POST
        New cards can only be created by a logged in user.
        """
        card_values = {"uuid": "iNK676auRH6ahf_IkCqKLw"}

        # Try creating a new card when not logged in
        with transaction.atomic():
            response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 401)
        utils.assertNumCardsEquals(self, 0)

        utils.login(self, utils.test_user1)

        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertEqual(content['uuid'], card_values['uuid'])

    def test_last_modified_date_is_set_correctly_when_creating_a_new_card(self):
        """
        Method: POST
        A new card created without a last modified date has the last
        modified date set to the date and time when the card is created.
        When a new card is created with a specified last modified date
        then that value is used.
        """
        last_modified_date = "2017-09-26T21:41:46.628Z"
        card_values = {
            "last_modified_date": last_modified_date
        }

        utils.login(self, utils.test_user1)

        # Create a card with a last modified date already specified
        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', card_values)
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertEqual(content['last_modified_date'], last_modified_date)

        # Create a card without the last modified date already specified
        utils.assertNumCardsEquals(self, 1)
        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 2)

        content = json.loads(response.content)
        utils.assertDateTimeIsNow(self, content['last_modified_date'])

