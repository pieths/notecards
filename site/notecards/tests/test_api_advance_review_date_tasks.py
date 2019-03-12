# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django import urls
from django.test import tag
from django.utils import dateparse
from django.core.serializers.json import DjangoJSONEncoder

from datetime import timedelta

from . import utils

import json


@tag('card-api', 'integration')
class AdvanceReviewDateTasksApiTests(utils.CardApiTestCase):
    """
    ## /api/v1/advance-review-date-tasks/

    ### POST

    Create a new advance review date task. This task advances
    the review date of the cards by the specified number of days.
    An optional filter can be supplied to limit the cards whose
    dates will be advanced.

    (see POST tests below for details)
    """
    def test_anonymous_users_can_not_create_new_advance_review_date_tasks(self):
        """
        Method: POST
        Anonymous users do not have POST access to this resource.
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        num_days = 3

        request_body = {
            'num_days': num_days,
            'filter': {
                'title_filter': card_objects[1]['title'],
                'review_status': 1
            }
        }

        utils.logout(self)

        response = utils.post_json(self, 'notecards-api-advance-review-date-tasks', request_body)
        self.assertEqual(response.status_code, 401)

    def test_post_with_filter(self):
        """
        Method: POST
        The accepted content is of type `application/json` and should
        have the following form (note, the keys and values for the filter
        dictionary/object are the same as the ones used when retrieving
        a card list or archive):

        ``` javascript
        {
            num_days: 3,
            filter:
            {
                'tags_filter': "math",
                'review_status': 1
            }
        }
        ```

        A successfull post returns a 200 response code.
        """
        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        num_days = 3

        request_body = {
            'num_days': num_days,
            'filter': {
                'title_filter': card_objects[1]['title'],
                'review_status': 1
            }
        }

        response = utils.post_json(self, 'notecards-api-advance-review-date-tasks', request_body)
        self.assertEqual(response.status_code, 200)

        # Advance the expected value next_retrieval_date
        # by the specified amount of days
        next_retrieval_date = dateparse.parse_datetime(card_objects[1]['next_retrieval_date'])
        next_retrieval_date += timedelta(days=int(num_days))
        card_objects[1]['next_retrieval_date'] = json.loads(
            json.dumps(next_retrieval_date, cls=DjangoJSONEncoder)
        )

        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

    def test_post_without_num_days(self):
        """
        Method: POST
        If the request body json object does not contain
        a `num_days` field then no cards should be updated
        and an http error code of 400 is returned.
        """

        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        request_body = {
            'filter': {
                'title_filter': card_objects[1]['title'],
                'review_status': 1
            }
        }

        response = utils.post_json(self, 'notecards-api-advance-review-date-tasks', request_body)
        self.assertEqual(response.status_code, 400)

        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

    def test_post_with_a_negative_num_days_value(self):
        """
        Method: POST
        If the request body json object `num_days` field
        is negative then no cards are updated and an http
        error code of `400` is returned.
        """

        utils.login(self)

        card_objects = utils.add_card_set_1_to_database(self)

        num_days = -3

        request_body = {
            'num_days': num_days,
            'filter': {
                'title_filter': card_objects[1]['title'],
                'review_status': 1
            }
        }

        response = utils.post_json(self, 'notecards-api-advance-review-date-tasks', request_body)
        self.assertEqual(response.status_code, 400)

        response = self.client.get(urls.reverse('notecards-api-cards'), {'review_status': 1})
        content = json.loads(response.content)
        utils.assertCardListsMatch(self, content['cards'], card_objects)

