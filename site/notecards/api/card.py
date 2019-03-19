# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from django.utils import timezone
from notecards import utils
from notecards.models import Card, FileAttachment

import json


def process_request(request, card_uuid):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = Card.from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    if request.method == 'GET':
        return get_card(request, card)

    elif request.method == 'PATCH':
        return update_card(request, card)

    elif request.method == 'DELETE':
        return delete_card(request, card)

    else:
        return utils.create_405_json_response(allow="GET, PATCH, DELETE")


def get_card(request, card):
    card_output_format = request.GET.get('format', "")

    card_obj = utils.create_card_object(card, card_output_format)
    return JsonResponse(card_obj, status=200)


def update_card(request, card):
    if request.content_type != "application/json-patch+json":
        return utils.create_415_json_response()

    patch_data = json.loads(request.body)

    if not isinstance(patch_data, list):
        message = "Invalid patch format. Root must be a list"
        return utils.create_400_json_response(message)

    for op in patch_data:
        if (('op' in op) and ('path' in op) and
            ('value' in op) and (op['op'] == 'replace')):

            if op['path'] == '/title':
                card.title = op['value']

            elif op['path'] == '/query':
                card.query = op['value']

            elif op['path'] == '/answer':
                card.answer = op['value']

            elif op['path'] == '/active':
                card.active = op['value']

    card.last_modified_date = timezone.now()
    card.sha_512 = utils.compute_card_sha_512(card)
    card.save()

    card_obj = utils.create_card_object(card)
    return JsonResponse(card_obj, status=200)


def delete_card(request, card):
    utils.delete_card(card)
    return JsonResponse({'message': 'Card successfully deleted'}, status=200)


url_name = 'notecards-api-card'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/$',
                   process_request,
                   name=url_name)

