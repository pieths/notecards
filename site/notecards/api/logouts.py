# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.contrib import auth
from django.urls import re_path
from django.http import JsonResponse


def process_request(request):
    if request.method == 'POST':
        return new_logout(request)

    else:
        return utils.create_405_json_response(allow="POST")


def new_logout(request):
    auth.logout(request)
    return JsonResponse({}, status=200)


url_name = 'notecards-api-logouts'
url_path = re_path(r'^logouts/$',
                   process_request,
                   name=url_name)

