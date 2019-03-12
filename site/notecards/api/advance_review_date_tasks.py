# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from datetime import timedelta
from django.http import JsonResponse
from django.urls import re_path
from django.db import transaction
from notecards import utils

import json


def process_request(request):
    if request.method == 'POST':
        return advance_review_date(request)

    else:
        return utils.create_405_json_response(allow="POST")


def advance_review_date(request):
    if request.content_type != "application/json":
        return utils.create_415_json_response()

    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    ard_data = json.loads(request.body)

    if not 'num_days' in ard_data:
        message = "num_days not specified"
        return utils.create_400_json_response(message)

    num_days = int(ard_data['num_days'])

    if num_days < 0:
        message = "num_days must be a positive integer"
        return utils.create_400_json_response(message)

    filter_params = {}
    if 'filter' in ard_data and isinstance(ard_data['filter'], dict):
        filter_params = utils.parse_card_filter(ard_data['filter'])

    # Get all the cards corresponding to the filters
    # Not just the cards for the current page
    filter_params['page'] = 1
    filter_params['cards_per_page'] = 0

    cards = utils.get_filtered_cards(filter_params, request.user)

    with transaction.atomic():
        for card in cards:
            card.next_retrieval_date = card.next_retrieval_date + timedelta(days=int(num_days))
            card.save()

    return JsonResponse({}, status=200)


url_name = 'notecards-api-advance-review-date-tasks'
url_path = re_path(r'^advance-review-date-tasks/$',
                   process_request,
                   name=url_name)

