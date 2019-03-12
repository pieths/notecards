# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.test import tag
from django import urls
from django.utils import dateparse, timezone

from . import utils

import json


@tag('card-api', 'integration')
class RetrievalAttemptsApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/cards/{uuid}/retrieval-attempts/

    ### GET

    Returns a list of the all the retrieval attempts which
    belong to the card specified by {uuid}.

    (see GET tests below for details)

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

    (see POST tests below for details)
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

        # Get all the retrieval attempts
        response = self.client.get(url)
        ra_list = json.loads(response.content)['retrieval_attempts']
        self.assertEqual(len(ra_list), 1)

        utils.logout(self)

        # Get all the retrieval attempts as an anonymous user
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_new_card_created_with_default_values_has_no_retrieval_attempts(self):
        """
        Method: GET
        Creating a new card with default values has no retrieval attempts.
        """
        utils.login(self)

        utils.assertNumCardsEquals(self, 0)
        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        utils.assertNumCardsEquals(self, 1)

        content = json.loads(response.content)
        self.assertTrue('retrieval_attempts' in content)
        self.assertTrue(type(content['retrieval_attempts']) == list)
        self.assertTrue(len(content['retrieval_attempts']) == 0)
        self.assertTrue(content['spacing_bin'] == 1)

        uuid = content['uuid']
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        response = self.client.get(url)
        ra_list = json.loads(response.content)['retrieval_attempts']
        self.assertTrue(type(ra_list) == list)
        self.assertTrue(len(ra_list) == 0)

    def test_anonymous_user_can_not_create_new_retrieval_attempts(self):
        """
        Method: POST
        Anonymous users do not have POST access to this resource.
        """
        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 0)

        uuid = content['uuid']
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        utils.logout(self)

        # Create a new retrieval attempt
        data = {'success': True}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_add_new_successfull_retrieval_attempt(self):
        """
        Method: POST
        Creating a new retrieval attempt with a {success:true}
        body advances the spacing bin by one and advances the
        next retrieval date by more than one day in the future.
        """
        utils.login(self)

        response = utils.post_json(self, 'notecards-api-cards', {})
        self.assertEqual(response.status_code, 201)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 0)
        self.assertTrue(content['spacing_bin'] == 1)

        # Verify that the next retrieval date is roughly one day from now
        next_retrieval_date = dateparse.parse_datetime(content['next_retrieval_date'])
        now = timezone.now()
        delta = abs(now - next_retrieval_date)
        self.assertTrue(abs(86400 - delta.seconds) < 3)

        uuid = content['uuid']
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        # Get all the retrieval attempts
        response = self.client.get(url)
        ra_list = json.loads(response.content)['retrieval_attempts']
        self.assertTrue(len(ra_list) == 0)

        # Create a new retrieval attempt
        data = {'success': True}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the card
        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': uuid})
        response = self.client.get(url)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 1)
        self.assertTrue(content['spacing_bin'] == 2)
        self.assertTrue(content['retrieval_attempts'][0]['spacing_bin'] == 1)

        # Verify next retrieval date has been advanced by more than one day
        next_retrieval_date = dateparse.parse_datetime(content['next_retrieval_date'])
        delta = abs(now - next_retrieval_date)
        self.assertTrue(delta.days > 1)

    def test_add_new_unsuccessfull_retrieval_attempt(self):
        """
        Method: POST
        Creating a new retrieval attempt with a {success:false}
        body resets the spacing bin to 1 and sets the next
        retrieval date to one day from now.
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)
        uuid = card_objects[3]['uuid']

        # Get the card
        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': uuid})
        response = self.client.get(url)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 3)
        self.assertTrue(content['spacing_bin'] == 4)
        self.assertTrue(content['retrieval_attempts'][2]['spacing_bin'] == 3)

        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': uuid})

        # Get all the retrieval attempts
        response = self.client.get(url)
        ra_list = json.loads(response.content)['retrieval_attempts']
        self.assertTrue(len(ra_list) == 3)

        # Create a new retrieval attempt
        data = {'success': False}
        response = self.client.post(url, data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the card
        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': uuid})
        response = self.client.get(url)
        content = json.loads(response.content)
        self.assertTrue(len(content['retrieval_attempts']) == 4)
        self.assertTrue(content['spacing_bin'] == 1)
        self.assertTrue(content['retrieval_attempts'][3]['spacing_bin'] == 4)

        # Verify that the next retrieval date is roughly one day from now
        next_retrieval_date = dateparse.parse_datetime(content['next_retrieval_date'])
        now = timezone.now()
        delta = abs(now - next_retrieval_date)
        self.assertTrue(abs(86400 - delta.seconds) < 3)

    def test_completing_all_spacing_bins_deactivates_card_and_locks_spacing_bin(self):
        """
        Method: POST
        If a card is in the final spacing bin, creating a new
        retrieval attempt with a {success:true} body will
        deactivate the card and will advance the review date.
        Note, the spacing bin will no longer change after
        this update.
        """
        card_values = {
            'uuid': '6JedrZhSR3ia8FEojJb9bQ',
            'next_retrieval_date': '2018-06-21T17:10:17.732Z',
            'spacing_bin': 7,
            "active": True,
        }

        utils.import_card(card_values, user=utils.test_user1)
        utils.login(self)

        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': card_values['uuid']})

        ra_data = {'success': True}

        # Create a new retrieval attempt
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': card_values['uuid']})
        response = self.client.post(url, ra_data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the card
        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)
        content = json.loads(response.content)
        self.assertTrue(content['active'] == False)
        self.assertEqual(content['spacing_bin'], 8)
        self.assertEqual(content['retrieval_attempts'][-1]['spacing_bin'], 7)

        # Verify next retrieval date has been advanced by 10 years.
        # Note, subtracting one day from 10 years in comparison because
        # the api call happens slightly before the verification check
        next_retrieval_date = dateparse.parse_datetime(content['next_retrieval_date'])
        delta = abs(timezone.now() - next_retrieval_date)
        self.assertTrue(delta.days, (365*10 - 1))

        # Simulate another positive retrieval attempt

        # Create a new retrieval attempt
        url = urls.reverse('notecards-api-card-retrieval-attempts',
                           kwargs={'card_uuid': card_values['uuid']})
        response = self.client.post(url, ra_data, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the card
        url = urls.reverse('notecards-api-card', kwargs={'card_uuid': card_values['uuid']})
        response = self.client.get(url)
        content = json.loads(response.content)
        self.assertTrue(content['active'] == False)
        self.assertEqual(content['spacing_bin'], 8)
        self.assertEqual(content['retrieval_attempts'][-1]['spacing_bin'], 8)

        # Verify next retrieval date has been advanced by 10 years.
        # Note, subtracting one day from 10 years in comparison because
        # the api call happens slightly before the verification check
        next_retrieval_date = dateparse.parse_datetime(content['next_retrieval_date'])
        delta = abs(timezone.now() - next_retrieval_date)
        self.assertTrue(delta.days, (365*10 - 1))

