# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from __future__ import unicode_literals
import subprocess

from datetime import datetime, timedelta, time

from django.conf import settings
from django.utils import timezone
from django.http import Http404, JsonResponse
from django.db import IntegrityError
from django.core.paginator import Paginator, Page
from django.core.serializers.json import DjangoJSONEncoder
from django.core.files import File
from django.utils.http import urlencode

from .models import Card, FileAttachment, Tag, RetrievalAttempt

import io
import pathlib
import json
import copy
import base64
import hashlib
import tarfile
import tempfile


def create_400_json_response(message="Bad request"):
    response = JsonResponse({'message': message}, status=400)
    return response


def create_401_json_response(message="Unauthorized. User must be logged in to perform this action."):
    response = JsonResponse({'message': message}, status=401)
    return response


def create_404_json_response(resource_name="Resource"):
    message = resource_name + " not found"
    response = JsonResponse({'message': message}, status=404)
    return response


def create_405_json_response(message="Invalid http method", allow="POST"):
    response = JsonResponse({'message': message}, status=405)
    response['Allow'] = allow
    return response


def create_409_json_response(message="Conflict"):
    response = JsonResponse({'message': message}, status=409)
    return response


def create_415_json_response(message="Content type not supported"):
    response = JsonResponse({'message': message}, status=415)
    return response


def get_utc_datetime_for_local_midnight():
    # Get date time for today (local) at 12 in the morning (no timezone info)
    dt = datetime.combine(timezone.localdate(), time())

    # Get date time for today (local) at 12 midnight (no timezone info)
    dt_midnight = dt + timedelta(days=1)

    # Get date time for today (local) at 12 midnight with timezone info 
    dt_aware = timezone.make_aware(dt_midnight)

    # Convert to UTC
    dt_utc = dt_aware.astimezone(timezone.utc)
    return dt_utc


def parse_card_filter(filter_dict):
    filter_params = {
        'tags_filter':    str(filter_dict.get('tags_filter', "")),
        'title_filter':   str(filter_dict.get('title_filter', "")),
        'active':         int(filter_dict.get('active', 2)),
        'order_by':       int(filter_dict.get('order_by', 0)),
        'review_status':  int(filter_dict.get('review_status', 1)),
        'page':           int(filter_dict.get('page', 1)),
        'cards_per_page': int(filter_dict.get('cards_per_page', 0)),
    }

    return filter_params


def get_card_query_from_filter_params(filter_params, **kwargs):
    fp_copy = copy.deepcopy(filter_params)
    fp_copy.update(kwargs)
    query = urlencode(fp_copy)

    if len(query) > 0:
        query = "?" + query

    return query


def get_filtered_cards(filter_params, user):
    cards = Card.objects.filter(user=user)

    if 'tags_filter' in filter_params:
        tag_labels = filter_params['tags_filter'].split()
        for tag_label in tag_labels:
            cards = cards.filter(tags__label__icontains=tag_label)

        cards = cards.distinct()

    if 'title_filter' in filter_params:
        title_keywords = filter_params['title_filter'].split()
        for title_keyword in title_keywords:
            cards = cards.filter(title__icontains=title_keyword)

    if 'review_status' in filter_params:
        if filter_params['review_status'] == 0:
            dt = get_utc_datetime_for_local_midnight()
            cards = cards.filter(next_retrieval_date__lte=dt)

    if 'order_by' in filter_params:
        if filter_params['order_by'] == 0:
            cards = cards.order_by('next_retrieval_date')
        elif filter_params['order_by'] == 1:
            cards = cards.order_by('creation_date')

    if 'active' in filter_params:
        if filter_params['active'] == 0:
            cards = cards.filter(active__exact=False)
        elif filter_params['active'] == 1:
            cards = cards.filter(active__exact=True)

    if 'page' in filter_params and 'cards_per_page' in filter_params:
        num_cards_per_page = filter_params['cards_per_page']
        if (num_cards_per_page < 1):
            num_cards_per_page = max(len(cards), 1)

        paginator = Paginator(cards, num_cards_per_page)
        cards = paginator.get_page(filter_params['page'])

    return cards


def create_card_object(card, output_format="", output_format_overrides={}):
    options = {
        'include_title':       True,
        'include_query':       True,
        'include_answer':      True,
        'max_query_length':    -1, # Anything other than >= 0 will return full query
        'max_answer_length':   -1, # Anything other than >= 0 will return full answer
        'include_creation_date': True,
        'include_last_modified_date': True,
        'include_next_retrieval_date': True,
        'include_retrieval_attempts': True,
        'include_file_attachments': True,
        'include_spacing_bin':  True,
        'include_active':       True,
        'include_tags':         True,
        'include_hash':         True,
        'include_links':        True,
        'tag_output_format':    "",
        'file_attachment_output_format': "",
        'retrieval_attempt_output_format': ""
    }

    if output_format == "index":
        options.update({
            'max_query_length': 160,
            'include_answer': False,
            'include_retrieval_attempts': False,
            'include_file_attachments':  True,
            'file_attachment_output_format': "index",
            'include_hash': False,
        })

    elif output_format == "archive":
        options.update({
            'include_links': False,
            'tag_output_format': "archive",
            'file_attachment_output_format': "archive",
            'retrieval_attempt_output_format': "archive"
        })
    elif output_format == "links":
        options.update({
            'include_title':       False,
            'include_query':       False,
            'include_answer':      False,
            'include_creation_date': False,
            'include_last_modified_date': False,
            'include_next_retrieval_date': False,
            'include_retrieval_attempts': False,
            'include_file_attachments': False,
            'include_spacing_bin':  False,
            'include_active':       False,
            'include_tags':         False,
            'include_hash':         False,
            'include_links':        True
        })

    options.update(output_format_overrides)

    card_obj = {'version': 1}
    card_obj['uuid'] = card.uuid

    if options['include_title']:
        card_obj['title'] = card.title

    if options['include_query']:
        if options['max_query_length'] >= 0:
            if len(card.query) > options['max_query_length']:
                card_obj['query'] = card.query[:options['max_query_length'] - 3] + "..."
            else:
                card_obj['query'] = card.query[:options['max_query_length']]

        else:
            card_obj['query'] = card.query

    if options['include_answer']:
        if options['max_answer_length'] >= 0:
            if len(card.answer) > options['max_answer_length']:
                card_obj['answer'] = card.answer[:options['max_answer_length'] - 3] + "..."
            else:
                card_obj['answer'] = card.answer[:options['max_answer_length']]

        else:
            card_obj['answer'] = card.answer

    if options['include_creation_date']:
        card_obj['creation_date'] = card.creation_date

    if options['include_last_modified_date']:
        card_obj['last_modified_date'] = card.last_modified_date

    if options['include_next_retrieval_date']:
        card_obj['next_retrieval_date'] = card.next_retrieval_date

    if options['include_retrieval_attempts']:
        ra_list = create_card_retrieval_attempt_list(card, options['retrieval_attempt_output_format'])
        card_obj.update(ra_list)

    if options['include_spacing_bin']:
        card_obj['spacing_bin'] = card.spacing_bin

    if options['include_active']:
        card_obj['active'] = card.active

    if options['include_hash']:
        card_obj['sha_512'] = card.sha_512

    if options['include_tags']:
        tag_list = create_card_tag_list(card, options['tag_output_format'])
        card_obj.update(tag_list)

    if options['include_file_attachments']:
        file_attachment_list = create_card_file_attachment_list(card, options['file_attachment_output_format'])
        card_obj.update(file_attachment_list)

    if options['include_links']:
        card_obj['links'] = [
            { 'rel': 'self', 'href': '/cards/api/v1/cards/' + str(card.uuid)},
            { 'rel': 'edit-page', 'href': '/cards/edit/' + str(card.uuid)},
            { 'rel': 'review-page', 'href': '/cards/review/' + str(card.uuid)},
            { 'rel': 'tags', 'href': '/cards/api/v1/cards/' + str(card.uuid) + '/tags'},
            { 'rel': 'files', 'href': '/cards/api/v1/cards/' + str(card.uuid) + '/files'},
            { 'rel': 'retrieval-attempts', 'href': '/cards/api/v1/cards/' + str(card.uuid) + '/retrieval-attempts'}
        ]

    return card_obj


def create_card_from_object(card_obj):
    card = Card()

    if 'uuid' in card_obj:
        card.uuid = card_obj['uuid']

    if 'title' in card_obj:
        card.title = card_obj['title']

    if 'query' in card_obj:
        card.query = card_obj['query']

    if 'answer' in card_obj:
        card.answer = card_obj['answer']

    if 'creation_date' in card_obj:
        card.creation_date = card_obj['creation_date']

    if 'last_modified_date' in card_obj:
        card.last_modified_date = card_obj['last_modified_date']
    else:
        card.last_modified_date = timezone.now()

    if 'next_retrieval_date' in card_obj:
        card.next_retrieval_date = card_obj['next_retrieval_date']
    else:
        card.next_retrieval_date = timezone.now() + timedelta(days=1)

    if 'spacing_bin' in card_obj:
        card.spacing_bin = card_obj['spacing_bin']

    if 'active' in card_obj:
        card.active = card_obj['active']

    return card


def import_card(card_obj, user):
    result = (400, 'Could not import card')

    try:
        card = create_card_from_object(card_obj)
        card.sha_512 = compute_card_sha_512(card)
        card.user = user
        card.save()

    except IntegrityError as err:
        error_string = str(err).lower()

        # TODO: will this work for databases other than sqlite?
        if 'unique' in error_string and 'uuid' in error_string:
            result = (409, 'Card with uuid already exists.')

    else:
        try:
            if 'retrieval_attempts' in card_obj:
                import_retrieval_attempts_from_list(card, card_obj['retrieval_attempts'])

            if (('files' in card_obj) and (len(card_obj['files']) > 0)):
                if import_file_attachments_from_list(card, card_obj['files']):
                    card.sha_512 = compute_card_sha_512(card)
                    card.save()

                else:
                    raise RuntimeError("One or more file attachments could not be imported.")

            if 'tags' in card_obj:
                tags = import_tags_from_list(card_obj['tags'], user)

                for tag in tags:
                    card.tags.add(tag)

        except RuntimeError as err:
            # TODO: remove this
            print(err)

            delete_card(card)

        else:
            result = (201, card)

    return result


def create_card_list(cards,
                     card_output_format="",
                     card_output_format_overrides={},
                     filter_params={}):

    card_list = {'version': 1, 'cards': []}

    for card in cards:
        card_obj = create_card_object(card, card_output_format, card_output_format_overrides)
        card_list['cards'].append(card_obj)

    page_info = {'links': [
        {'rel': 'next', 'href': None},
        {'rel': 'prev', 'href': None},
        {'rel': 'next-index-page', 'href': None},
        {'rel': 'prev-index-page', 'href': None}
    ]}

    if isinstance(cards, Page):
        page_info.update({
            'num_cards':       len(cards),
            'total_num_cards': cards.paginator.count,
            'num_pages':       cards.paginator.num_pages,
            'current_page':    cards.number,
            'start_index':     cards.start_index(),
            'end_index':       cards.end_index(),
            'has_previous':    cards.has_previous(),
            'has_next':        cards.has_next()
        })

        if page_info['has_previous']:
            page_num = cards.previous_page_number()
            page_info['previous_page_number'] = page_num

            query = get_card_query_from_filter_params(filter_params, page=page_num)
            href = '/cards/api/v1/cards/' + query
            page_info['links'][1] = {'rel': 'prev', 'href': href}

            href = '/cards/' + query
            page_info['links'][3] = {'rel': 'prev-index-page', 'href': href}

        if page_info['has_next']:
            page_num = cards.next_page_number()
            page_info['next_page_number'] = page_num

            query = get_card_query_from_filter_params(filter_params, page=page_num)
            href = '/cards/api/v1/cards/' + query
            page_info['links'][0] = {'rel': 'next', 'href': href}

            href = '/cards/' + query
            page_info['links'][2] = {'rel': 'next-index-page', 'href': href}

    else:
        page_info.update({
            'num_cards':       len(cards),
            'total_num_cards': len(cards),
            'num_pages':       1,
            'current_page':    1,
            'start_index':     1 if len(cards) > 0 else 0,
            'end_index':       len(cards),
            'has_previous':    False,
            'has_next':        False
        })

    card_list['page_info'] = page_info
    return card_list


def create_card_archive(cards):
    tmp_file = tempfile.NamedTemporaryFile(suffix=".notecards")
    tf = tarfile.open(fileobj=tmp_file, mode='w:gz')

    for card in cards:
        card_obj = create_card_object(card, 'archive')

        data = json.dumps(card_obj, cls=DjangoJSONEncoder)
        data = data.encode('utf-8')
        byte_stream = io.BytesIO(data)

        tarinfo = tarfile.TarInfo(name=card_obj['uuid'])
        tarinfo.size = len(data)

        tf.addfile(tarinfo=tarinfo, fileobj=byte_stream)

    tf.close()

    # Return the temporary file which contains the gzipped
    # tar data. The caller is responsible for closing the
    # file. Note, the file will be automatically deleted
    # when the file is closed.
    tmp_file.seek(0)
    return tmp_file


def import_card_archive(archive_file, user):
    num_cards_imported = 0

    tf = tarfile.open(fileobj=archive_file, mode='r:gz')
    for tarinfo in tf:
        buffered_reader = tf.extractfile(tarinfo)
        card_obj = json.load(buffered_reader)

        result = import_card(card_obj, user)

        if result[0] == 201:
            num_cards_imported += 1

    return num_cards_imported


def compute_card_sha_512(card):
    sha_512 = hashlib.sha512()

    sha_512.update(card.title.encode())
    sha_512.update(card.query.encode())
    sha_512.update(card.answer.encode())

    file_attachments = FileAttachment.objects.filter(card=card)
    for file_attachment in file_attachments:
        sha_512.update(file_attachment.sha_512.encode())

    digest = sha_512.digest()
    b64_digest = base64.b64encode(digest)
    return b64_digest.decode()


def delete_card(card):
    file_attachments = FileAttachment.objects.filter(card=card)
    for file_attachment in file_attachments:
        file_attachment.file.delete(save=False)

    card.delete()


def is_image_media_type(media_type):
    return ((media_type == "image/png") or
            (media_type == "image/jpeg") or
            (media_type == "image/gif") or
            (media_type == "image/bmp"))


def sanitize_image(image_path):
    subprocess.call(["mogrify",
                     "-background", "#ffffff",
                     "-alpha", "Remove",
                     "-resize", "1300>",
                     str(image_path)]);


def get_bytes_sha_512(data):
    sha_512 = hashlib.sha512()
    sha_512.update(data)

    digest = sha_512.digest()
    b64_digest = base64.b64encode(digest)
    return b64_digest.decode()


def get_file_sha_512(file_path):
    sha_512 = hashlib.sha512()

    with open(file_path, "rb") as f:
        while True:
            data = f.read(65536)
            if not data:
                break

            sha_512.update(data)

    digest = sha_512.digest()
    b64_digest = base64.b64encode(digest)
    return b64_digest.decode()


def create_file_attachment_obj(file_attachment, output_format=""):
    options = {
        'include_url':   True,
        'include_data':  False,
        'include_size':  False,
        'include_hash':  False,
        'include_links': True
    }

    if output_format == "archive":
        options.update({
            'include_url':   False,
            'include_data':  True,
            'include_size':  True,
            'include_hash':  True,
            'include_links': False
        })
    elif output_format == "index":
        options.update({
            'include_url':   True,
            'include_data':  False,
            'include_size':  False,
            'include_hash':  False,
            'include_links': False
        })

    file_attachment_obj = {
        'name': pathlib.Path(file_attachment.file.name).name,
        'media_type': file_attachment.media_type
    }

    local_path = settings.MEDIA_ROOT + "/" + str(file_attachment.file)

    if options['include_url']:
        file_attachment_obj['url'] = file_attachment.file.url

    if options['include_size']:
        file_attachment_obj['size'] = pathlib.Path(local_path).stat().st_size

    if options['include_data']:
        with open(local_path, "rb") as f:
            file_bytes = f.read()

            encoded_string = base64.b64encode(file_bytes)
            encoded_string = encoded_string.decode(encoding="utf-8")
            file_attachment_obj['data'] = encoded_string

    if options['include_hash']:
        file_attachment_obj['sha_512'] = file_attachment.sha_512

    if options['include_links']:
        file_attachment_obj['links'] = [
            { 'rel': 'self', 'href': '/cards/api/v1/cards/' + str(file_attachment.card.uuid) + '/files/' + str(file_attachment.pk)},
            { 'rel': 'card', 'href': '/cards/api/v1/cards/' + str(file_attachment.card.uuid)}
        ]

    return file_attachment_obj


def create_file_attachment_from_object(card, fa_obj):
    file_attachment = None

    if (('name' in fa_obj) and
        ('data' in fa_obj) and
        ('media_type' in fa_obj) and
        (len(fa_obj['data']) > 0)):

        file_attachment = FileAttachment()
        file_attachment.card = card
        file_attachment.media_type = fa_obj['media_type']

        file_bytes = base64.b64decode(fa_obj['data'])
        file_attachment.sha_512 = get_bytes_sha_512(file_bytes)

        f = File(io.BytesIO(file_bytes))
        file_attachment.file.save(fa_obj['name'], f, save=False)

    return file_attachment


def create_card_file_attachment_list(card=None, output_format=""):
    file_attachment_list = {'files': []}

    if card:
        file_attachments = FileAttachment.objects.filter(card=card)

        for file_attachment in file_attachments:
            file_attachment_obj = create_file_attachment_obj(file_attachment, output_format)
            file_attachment_list['files'].append(file_attachment_obj)

    return file_attachment_list


def import_file_attachments_from_list(card, fa_list):
    num_saved_files = 0

    for fa_obj in fa_list:
        file_attachment = create_file_attachment_from_object(card, fa_obj)

        if file_attachment:
            file_attachment.save()
            num_saved_files += 1

    return (num_saved_files == len(fa_list))


def create_retrieval_attempt_obj(retrieval_attempt, output_format=""):
    options = {'include_links': True}

    if output_format == "archive":
        options.update({'include_links': False})

    obj = {
        'retrieval_date': retrieval_attempt.retrieval_date,
        'retrieved': retrieval_attempt.retrieved,
        'spacing_bin': retrieval_attempt.spacing_bin
    }

    if options['include_links']:
        obj['links'] = [
            { 'rel': 'self', 'href': '/cards/api/v1/cards/' + str(retrieval_attempt.card.uuid) + '/retrieval-attempts/' + str(retrieval_attempt.pk)},
            { 'rel': 'card', 'href': '/cards/api/v1/cards/' + str(retrieval_attempt.card.uuid)},
        ]

    return obj


def create_retrieval_attempt_from_object(card, ra_obj):
    retrieval_attempt = RetrievalAttempt()
    retrieval_attempt.card = card

    if 'retrieval_date' in ra_obj:
        retrieval_attempt.retrieval_date = ra_obj['retrieval_date']

    if 'retrieved' in ra_obj:
        retrieval_attempt.retrieved = ra_obj['retrieved']

    if 'spacing_bin' in ra_obj:
        retrieval_attempt.spacing_bin = ra_obj['spacing_bin']

    return retrieval_attempt


def create_card_retrieval_attempt_list(card=None, retrieval_attempt_output_format=""):
    ra_list = {'retrieval_attempts': []}

    if card:
        retrieval_attempts = RetrievalAttempt.objects.filter(card=card)

        for retrieval_attempt in retrieval_attempts:
            retrieval_attempt_obj = create_retrieval_attempt_obj(retrieval_attempt, retrieval_attempt_output_format)
            ra_list['retrieval_attempts'].append(retrieval_attempt_obj)

    return ra_list


def import_retrieval_attempts_from_list(card, ra_list):
    for ra_obj in ra_list:
        retrieval_attempt = create_retrieval_attempt_from_object(card, ra_obj)
        retrieval_attempt.save()


def create_tag_obj(tag, output_format="", card=None):
    options = {'include_links': True}

    if output_format == "archive":
        options.update({'include_links': False})

    obj = {'label': tag.label}

    if options['include_links']:
        obj['links'] = [ { 'rel': 'self', 'href': '/cards/api/v1/tags/' + str(tag.pk)} ]

        if card:
            obj['links'].append({
                'rel': 'card-self',
                'href': '/cards/api/v1/cards/{0}/tags/{1}/'.format(card.uuid, tag.pk)
            })

    return obj


def create_tag_from_object(tag_obj):
    tag = None

    if 'label' in tag_obj:
        label = str(tag_obj['label']).strip().lower()

        if label != "":
            tag = Tag()
            tag.label = label

    return tag


def create_tag_list(tags, tag_output_format=""):
    tag_list = {'tags': []}

    for tag in tags:
        tag_obj = create_tag_obj(tag, tag_output_format)
        tag_list['tags'].append(tag_obj)

    tag_list['tags'] = sorted(tag_list['tags'], key=lambda tag: tag['label'])
    return tag_list


def create_card_tag_list(card=None, tag_output_format=""):
    tag_list = {'tags': []}

    if card:
        for tag in card.tags.all():
            tag_obj = create_tag_obj(tag, tag_output_format, card)
            tag_list['tags'].append(tag_obj)

    tag_list['tags'] = sorted(tag_list['tags'], key=lambda tag: tag['label'])
    return tag_list


def import_tag(tag_obj, user):
    tag = create_tag_from_object(tag_obj)

    if tag:
        try:
            tag.user = user
            tag.save()

        except IntegrityError:
            tag = Tag.from_label(tag.label, user)

        except:
            tag = None

    return tag


def import_tags_from_list(tag_list, user):
    tags = []

    for tag_obj in tag_list:
        tag = import_tag(tag_obj, user)

        if tag:
            tags.append(tag)

    return sorted(tags, key=lambda tag: tag.label)

