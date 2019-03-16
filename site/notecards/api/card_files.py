# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from django.utils import timezone
from django.conf import settings
from notecards import utils
from notecards.models import FileAttachment


def process_request(request, card_uuid):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    card = utils.get_card_from_uuid(card_uuid, request.user)
    if not card:
        return utils.create_404_json_response("Card")

    if request.method == 'GET':
        return get_card_file_attachments(request, card)

    elif request.method == 'POST':
        return new_card_file_attachment(request, card)

    else:
        return utils.create_405_json_response(allow="GET, POST")


def get_card_file_attachments(request, card):
    output_format = request.GET.get('format', "")
    file_list = utils.create_card_file_attachment_list(card, output_format)
    return JsonResponse(file_list, status=200)


def new_card_file_attachment(request, card):
    if (len(request.FILES) > 0) and ('file_attachment' in request.FILES):

        media_type = request.FILES['file_attachment'].content_type

        file_attachment = FileAttachment(card=card,
                                         file=request.FILES['file_attachment'],
                                         media_type=media_type)
        file_attachment.save()

        file_path = settings.MEDIA_ROOT + "/" + str(file_attachment.file)

        file_attachment.sha_512 = utils.get_file_sha_512(file_path)
        file_attachment.save()

        card.last_modified_date = timezone.now()
        card.sha_512 = utils.compute_card_sha_512(card)
        card.save()

        file_attachment_obj = utils.create_file_attachment_obj(file_attachment)
        return JsonResponse(file_attachment_obj, status=201)

    else:
        message = "No uploadable file present in request"
        return JsonResponse({'message': message}, status=400)


url_name = 'notecards-api-card-files'
url_path = re_path(r'^cards/(?P<card_uuid>[0-9a-zA-Z_-]{22})/files/$',
                   process_request,
                   name=url_name)

