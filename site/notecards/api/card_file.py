# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from django.utils import timezone
from notecards import utils


def process_request(request, card_uuid, file_id):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = utils.get_card_from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    file_attachment = utils.get_file_attachment_from_id(file_id)
    if not file_attachment:
        return utils.create_404_json_response("File")

    if file_attachment.card != card:
        message = "File exists but does not belong to the specified card"
        return JsonResponse({'message': message}, status=400)

    if request.method == 'GET':
        return get_card_file_attachment(request, file_attachment)

    elif request.method == 'DELETE':
        return delete_card_file_attachment(request, file_attachment)

    else:
        return utils.create_405_json_response(allow="GET, DELETE")


def get_card_file_attachment(request, file_attachment):
    output_format = request.GET.get('format', "")
    file_attachment_obj = utils.create_file_attachment_obj(file_attachment, output_format)
    return JsonResponse(file_attachment_obj, status=200)


def delete_card_file_attachment(request, file_attachment):
    card = file_attachment.card

    file_attachment.file.delete(save=False)
    file_attachment.delete()

    card.last_modified_date = timezone.now()
    card.sha_512 = utils.compute_card_sha_512(card)
    card.save()

    message = "File successfully deleted"
    return JsonResponse({'message': message}, status=200)


url_name = 'notecards-api-card-file'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/files/(?P<file_id>[0-9]+)/$',
                   process_request,
                   name=url_name)

