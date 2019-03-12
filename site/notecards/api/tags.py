# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from notecards import utils
from notecards.models import Tag


def process_request(request):
    if not request.user.is_authenticated:
        return utils.create_401_json_response()

    if request.method == 'GET':
        return get_tags(request)

    else:
        return utils.create_405_json_response(allow="GET")


def get_tags(request):
    tags = Tag.objects.filter(user=request.user)
    tag_list = utils.create_tag_list(tags)
    return JsonResponse(tag_list, status=200)


url_name = 'notecards-api-tags'
url_path = re_path(r'^tags/$',
                   process_request,
                   name=url_name)

