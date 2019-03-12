# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from django.utils import timezone
from datetime import timedelta
from notecards import utils
from notecards.models import RetrievalAttempt

import json


def process_request(request, card_uuid):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = utils.get_card_from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    if request.method == 'GET':
        return get_card_retrieval_attempts(request, card)

    elif request.method == 'POST':
        return new_card_retrieval_attempt(request, card)

    else:
        return utils.create_405_json_response(allow="GET, POST")


def get_card_retrieval_attempts(request, card):
    ra_list = utils.create_card_retrieval_attempt_list(card)
    return JsonResponse(ra_list, status=200)


def new_card_retrieval_attempt(request, card):
    if request.content_type != "application/json":
        return utils.create_415_json_response()

    body = json.loads(request.body)

    if not 'success' in body:
        message = "Invalid JSON format"
        return JsonResponse({'message': message}, status=400)

    if body['success']:
        return advance_card_bin(card)

    else:
        return reset_card_bin(card)


def advance_card_bin(card):
    bins = {
        1: 1,
        2: 3,
        3: 7,
        4: 13,
        5: 19,
        6: 29,
        7: 37
    }

    retrieval_attempt = RetrievalAttempt(
        card=card,
        retrieval_date = timezone.now(),
        retrieved = True,
        spacing_bin = card.spacing_bin)
    retrieval_attempt.save()

    if card.spacing_bin in bins:
        card.spacing_bin = card.spacing_bin + 1

    if card.spacing_bin in bins:
        days_till_next_retrieval = bins[card.spacing_bin]
        card.next_retrieval_date = timezone.now() + timedelta(days=days_till_next_retrieval)

    else:
        # The card has run through all the bins.
        card.next_retrieval_date = timezone.now() + timedelta(days=365*10)
        card.active = False

    card.save()

    ra_obj = utils.create_retrieval_attempt_obj(retrieval_attempt)
    return JsonResponse(ra_obj, status=200)


def reset_card_bin(card):
    retrieval_attempt = RetrievalAttempt(
        card=card,
        retrieval_date = timezone.now(),
        retrieved = False,
        spacing_bin = card.spacing_bin)
    retrieval_attempt.save()

    card.spacing_bin = 1
    card.next_retrieval_date = timezone.now() + timedelta(days=1)
    card.save()

    ra_obj = utils.create_retrieval_attempt_obj(retrieval_attempt)
    return JsonResponse(ra_obj, status=200)


url_name = 'notecards-api-card-retrieval-attempts'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/retrieval-attempts/$',
                   process_request,
                   name=url_name)

