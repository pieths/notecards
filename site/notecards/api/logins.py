# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.contrib import auth
from django.http import JsonResponse
from django.urls import re_path
from notecards import utils

import json


def process_request(request):
    if request.method == 'POST':
        return new_login(request)

    else:
        return utils.create_405_json_response(allow="POST")


def new_login(request):
    if request.content_type != "application/json":
        return utils.create_415_json_response()

    body = json.loads(request.body)

    if (not 'username' in body) or (not 'password' in body):
        message = "Invalid JSON format"
        return JsonResponse({'message': message}, status=400)

    if request.user.is_authenticated:
        message = "User already logged in"
        return JsonResponse({'message': message}, status=400)

    username = body['username']
    password = body['password']
    user = auth.authenticate(request, username=username, password=password)
    if user is not None:
        auth.login(request, user)
        return JsonResponse({}, status=200)

    else:
        message = "Invalid credentials"
        return JsonResponse({'message': message}, status=400)


url_name = 'notecards-api-logins'
url_path = re_path(r'^logins/$',
                   process_request,
                   name=url_name)

