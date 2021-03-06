# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.shortcuts import render
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseNotAllowed
from django.core.serializers.json import DjangoJSONEncoder

from notecards.models import Card, RetrievalAttempt

import json
from . import utils


def index(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    filter_params = utils.parse_card_filter(request.GET)

    if not 'cards_per_page' in request.GET:
        filter_params['cards_per_page'] = 20

    context = {'filter_params': filter_params}
    return render(request, 'notecards/index.html', context)


def edit_card(request, card_uuid):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)

    card = Card.from_uuid(card_uuid, request.user)

    if not card:
        return HttpResponseNotFound()

    context = {'card': card }

    retrieval_attempts = RetrievalAttempt.objects.filter(card=card).order_by('-retrieval_date')
    if len(retrieval_attempts) > 0:
        context['retrieval_attempts'] = retrieval_attempts

    return render(request, 'notecards/edit_card.html', context)


def review_card(request, card_uuid):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])

    if not request.user.is_authenticated:
        return HttpResponse('Unauthorized', status=401)

    card = Card.from_uuid(card_uuid, request.user)

    if card:
        card_obj = utils.create_card_object(card)

        url_map = { f['name']: f['url'] for f in card_obj['files'] }

        context = {
            'card': card_obj,
            'url_map_json': json.dumps(url_map, cls=DjangoJSONEncoder)
        }

        return render(request, 'notecards/review_card.html', context)

    else:
        return HttpResponseNotFound()

