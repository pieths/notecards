# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from notecards import utils


def process_request(request, card_uuid, tag_id):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = utils.get_card_from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    tag = None
    tag_id = int(tag_id)

    for card_tag in card.tags.all():
        if card_tag.id == tag_id:
            tag = card_tag
            break

    if not tag:
        return utils.create_404_json_response("Tag")

    if request.method == 'DELETE':
        return delete_card_tag(request, card, tag)

    else:
        return utils.create_405_json_response(allow="DELETE")


def delete_card_tag(request, card, tag):
    card.tags.remove(tag)

    message = "Tag successfully removed from card"
    return JsonResponse({'message': message}, status=200)


url_name = 'notecards-api-card-tag'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/tags/(?P<tag_id>[0-9]+)/$',
                   process_request,
                   name=url_name)

