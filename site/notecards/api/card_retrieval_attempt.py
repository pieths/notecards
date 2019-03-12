# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from notecards import utils


def process_request(request, card_uuid, retrieval_attempt_id):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = utils.get_card_from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    retrieval_attempt = utils.get_retrieval_attempt_from_id(retrieval_attempt_id)
    if not retrieval_attempt:
        return utils.create_404_json_response("RetrievalAttempt")

    if retrieval_attempt.card != card:
        message = "RetrievalAttempt exists but does not belong to specified card"
        return utils.create_400_json_response(message)

    if request.method == 'GET':
        return get_card_retrieval_attempt(request, retrieval_attempt)

    else:
        return utils.create_405_json_response(allow="GET")


def get_card_retrieval_attempt(request, retrieval_attempt):
    ra_obj = utils.create_retrieval_attempt_obj(retrieval_attempt)
    return JsonResponse(ra_obj, status=200)


url_name = 'notecards-api-card-retrieval-attempt'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/retrieval-attempts/(?P<retrieval_attempt_id>[0-9]+)/$',
                   process_request,
                   name=url_name)

