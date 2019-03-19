# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from notecards import utils
from notecards.models import Card

import json


def process_request(request, card_uuid):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = Card.from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    if request.method == 'GET':
        return get_card_tags(request, card)

    elif request.method == 'POST':
        return new_card_tag(request, card)

    else:
        return utils.create_405_json_response(allow="GET, POST")


def get_card_tags(request, card):
    tag_list = utils.create_card_tag_list(card)
    return JsonResponse(tag_list, status=200)


def new_card_tag(request, card):
    if request.content_type != "application/json":
        return utils.create_415_json_response()

    if len(request.body) == 0:
        message = "Missing request body"
        return utils.create_400_json_response(message)

    response = None
    tag_data = json.loads(request.body)

    if isinstance(tag_data, dict):
        tag = utils.import_tag(tag_data, request.user)

        if tag:
            card.tags.add(tag)
            tag_obj = utils.create_tag_obj(tag, card=card)
            response = JsonResponse(tag_obj, status=200)

        else:
            message = "Could not import tag"
            response = utils.create_400_json_response(message)

    else:
        message = "Invalid json format. Root must be an object and contain a label field"
        response = utils.create_400_json_response(message)

    return response


url_name = 'notecards-api-card-tags'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/tags/$',
                   process_request,
                   name=url_name)

