# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.http import JsonResponse
from django.urls import re_path
from notecards import utils


def process_request(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return utils.create_401_json_response()

        if (len(request.FILES) > 0) and ('archive_file' in request.FILES):
            num_cards_imported = utils.import_card_archive(request.FILES['archive_file'],
                                                           request.user)
            return JsonResponse({'num_cards_imported': num_cards_imported}, status=200)

        else:
            return utils.create_400_json_response('No archive file found')

    else:
        return utils.create_405_json_response(allow="POST")


url_name = 'notecards-api-card-archive-import-tasks'
url_path = re_path(r'^card-archive-import-tasks/$',
                   process_request,
                   name=url_name)

