# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse, FileResponse
from django.urls import re_path
from datetime import datetime
from notecards import utils

import json


def process_request(request):
    if request.method == 'GET':
        return get_cards(request)

    elif request.method == 'POST':
        return new_card(request)

    else:
        return utils.create_405_json_response(allow="GET, POST")


def get_cards(request):
    if not request.user.is_authenticated:
        card_list = utils.create_card_list([])
        return JsonResponse(card_list, status=200)

    filter_params = utils.parse_card_filter(request.GET)
    cards = utils.get_filtered_cards(filter_params, request.user)

    card_output_format = request.GET.get('format', 'index')

    if card_output_format == 'archive':
        tmp_file = utils.create_card_archive(cards)

        now = datetime.utcnow()
        filename = now.strftime('%Y%m%d.%H%M%S.car')
        return FileResponse(tmp_file, as_attachment=True, filename=filename)

    else:
        card_list = utils.create_card_list(cards, card_output_format, filter_params=filter_params)
        return JsonResponse(card_list, status=200)


def new_card(request):
    if request.content_type != "application/json":
        return utils.create_415_json_response()

    if len(request.body) == 0:
        message = "Missing request body"
        return utils.create_400_json_response(message)

    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    response = None
    card_data = json.loads(request.body)

    if isinstance(card_data, dict):
        result = utils.import_card(card_data, request.user)

        if result[0] == 201:
            card_obj = utils.create_card_object(result[1])
            response = JsonResponse(card_obj, status=201)

        elif result[0] == 409:
            response = utils.create_409_json_response(result[1])

        else:
            response = utils.create_400_json_response(result[1])

    else:
        message = "Invalid json format. Root must be an object"
        response = utils.create_400_json_response(message)

    return response


url_name = 'notecards-api-cards'
url_path = re_path(r'^cards/$',
                   process_request,
                   name=url_name)

