# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import HttpResponse, HttpResponseNotFound, HttpResponseNotAllowed
from django.conf import settings
from django.views import static
from django.urls import re_path

from notecards.models import Card


def get_file_path(card, file_name):
    path = "{}/{}/{}/{}/{}/files/{}".format(
            card.uuid[0],
            card.uuid[1],
            card.uuid[2],
            card.uuid,
            card.user.pk,
            file_name)

    return path


def process_request(request, card_uuid, user_id, file_name):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)

    if int(user_id) != request.user.pk:
        return HttpResponse('Unauthorized', status=401)

    card = Card.from_uuid(card_uuid, request.user)

    if not card:
        return HttpResponseNotFound()

    file_path = get_file_path(card, file_name)

    if settings.DEBUG:
        return static.serve(request, file_path, settings.MEDIA_ROOT)

    else:
        response = HttpResponse()

        # Content-type will be detected by nginx
        del response['Content-Type']

        protected_path = '/protected/media/' + file_path
        response['X-Accel-Redirect'] = protected_path
        return response


url_name = 'notecards-media'
url_path = re_path(r'^%s./././(?P<card_uuid>[0-9a-zA-Z_-]{22})/(?P<user_id>\d+)/files/(?P<file_name>.{1,200})$' % settings.MEDIA_URL.lstrip('/'),
                   process_request,
                   name=url_name)

