# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from notecards.models import Card, FileAttachment, Tag
from notecards import utils as nc_utils

from django import urls
from django.utils import timezone, dateparse
from django.test import TestCase, TransactionTestCase
from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.auth.models import User

import copy
import json
import base64
import pprint
import datetime


default_card_values = {
    "title": "",
    "query": "",
    "answer": "",
    "spacing_bin": 1,
    "active": True,
    "tags": [],
    "files": [],
    "retrieval_attempts": []
}

test_user1 = {
    "username": "test_user1",
    "password": "password1",
    "email":    "test_user1@test.com"
}

test_user2 = {
    "username": "test_user2",
    "password": "password2",
    "email":    "test_user2@test.com"
}


def get_default_card_objects(count):
    card_objects = [copy.deepcopy(default_card_values) for _ in range(count)]
    return card_objects


def get_user(user=test_user1):
    try:
        user = User.objects.get(username=user['username'])
    except:
        user = None

    return user


def import_card(card_obj, user=test_user1):
    card = None

    if isinstance(user, dict):
        user = get_user(user)

    if user:
        result = nc_utils.import_card(card_obj, user)
        if result[0] == 201:
            card = result[1]

    return card


def add_card_set_1_to_database(test_class_instance, user=test_user1):
    num_cards_in_database = len(Card.objects.all())

    card_objects = get_default_card_objects(5)
    card_objects[0].update({
        'uuid': 'kJOgWtagTqOt0hTfEnswvQ',
        'title': 'title one',
        'query': 'query one',
        'answer': 'answer one',
        'next_retrieval_date': '2018-05-21T17:10:17.732Z'
    })
    card_objects[1].update({
        'uuid': '6JedrZhSR3ia8FEojJb9bQ',
        'title': 'title two',
        'query': 'query two',
        'answer': 'answer two',
        'next_retrieval_date': '2018-06-21T17:10:17.732Z',
        'spacing_bin': 2
    })
    card_objects[2].update({
        'uuid': 'BJz8cXCgSoymQ3I-G2S8lg',
        'title': 'the title three',
        'query': 'the query three',
        'answer': 'the answer three',
        'next_retrieval_date': '2018-07-21T17:10:17.732Z',
        'spacing_bin': 3
    })
    card_objects[3].update({
        'uuid': 'lqFXTjLeSQGkRHKAmfJC6g',
        'title': 'the title four',
        'query': 'the query four',
        'answer': 'the answer four',
        'next_retrieval_date': '2018-07-07T17:10:17.732Z',
        'spacing_bin': 4,
        'retrieval_attempts': [
        {
            'retrieval_date': '2018-03-03T03:56:18.713Z',
            'retrieved': True,
            'spacing_bin': 1
        },
        {
            'retrieval_date': '2018-03-07T00:57:34.041Z',
            'retrieved': True,
            'spacing_bin': 2
        },
        {
            'retrieval_date': '2018-03-15T22:28:37.941Z',
            'retrieved': True,
            'spacing_bin': 3
        }]
    })
    card_objects[4].update({
        'uuid': 'M3ZlsTyhThSdIGNRa3mUEg',
        'title': 'math five',
        'query': 'math question five',
        'answer': 'math answer five',
        'last_modified_date': '2018-03-13T17:10:19.732Z',
        'next_retrieval_date': '2018-06-17T17:10:17.732Z',
        'spacing_bin': 5
    })

    if isinstance(user, dict):
        user = get_user(user)

    for card_object in card_objects:
        import_card(card_object, user)

    assertNumCardsEquals(test_class_instance, num_cards_in_database + len(card_objects))
    return card_objects


def attach_text_to_card_obj_as_file(card_obj, text, name, media_type="text/plain"):
    encoded_string = base64.b64encode(text.encode())
    encoded_string = encoded_string.decode(encoding="utf-8")

    if not 'files' in card_obj:
        card_obj['files'] = []

    card_obj['files'].append({
        'name': name,
        'media_type': media_type,
        'data': encoded_string
    })


def remove_filesystem_files():
    file_attachments = FileAttachment.objects.all()
    for file_attachment in file_attachments:
        file_attachment.file.delete(save=False)


def remove_cards_from_database():
    remove_filesystem_files()

    cards = Card.objects.all()
    for card in cards:
        card.delete()


def remove_tags_from_database():
    tags = Tag.objects.all()
    for tag in tags:
        tag.delete()


def clear_database():
    remove_cards_from_database()
    remove_tags_from_database()


def post_json(test_class_instance, url_name, data={}):
    if not isinstance(data, dict):
        # Data which is not of type dict is currently
        # not encoded correctly by the client post
        # method logic. Force the encoding here.
        data = json.dumps(data, cls=DjangoJSONEncoder)

    url = urls.reverse(url_name)
    return test_class_instance.client.post(url, data, content_type='application/json')


def login(test_class_instance, user=test_user1, use_api=False):
    if use_api:
        login_data = {
            'username': user['username'],
            'password': user['password']
        }

        response = post_json(test_class_instance, 'notecards-api-logins', login_data)

        if response.status_code != 200:
            message = json.loads(response.content)['message']
            test_class_instance.assertTrue(False, msg=message)

    else:
        # Use the faster force_login method
        user = User.objects.get_or_create(username=user['username'])[0] 
        test_class_instance.client.force_login(user);


def logout(test_class_instance):
    response = post_json(test_class_instance, 'notecards-api-logouts')
    test_class_instance.assertEqual(response.status_code, 200)


def pretty_print_json(value):
    value = json.loads(value)
    print(json.dumps(value, indent=4))


def pretty_print_python(data):
    pp = pprint.PrettyPrinter(indent=4)
    pp.pprint(data)


def assertNumCardsEquals(test_class_instance, length):
    cards = Card.objects.all()
    test_class_instance.assertEqual(len(cards), length)


def assertDateTimeIsNow(test_class_instance, dt, acceptable_error=3):
    if isinstance(dt, str):
        dt = dateparse.parse_datetime(dt)

    test_class_instance.assertTrue(isinstance(dt, datetime.datetime))

    delta = abs(timezone.now() - dt)
    test_class_instance.assertTrue(delta.seconds <= acceptable_error)


def assertRetrievalAttemptsMatch(test_class_instance, ra_list1, ra_list2):
    test_class_instance.assertEqual(len(ra_list1), len(ra_list2))

    ra_list1 = sorted(ra_list1, key=lambda i: i['retrieval_date'])
    ra_list2 = sorted(ra_list2, key=lambda i: i['retrieval_date'])

    for i in range(len(ra_list1)):
        test_class_instance.assertEqual(ra_list1[i]['retrieval_date'],
                                        ra_list2[i]['retrieval_date'])

        test_class_instance.assertEqual(ra_list1[i]['retrieved'],
                                        ra_list2[i]['retrieved'])

        test_class_instance.assertEqual(ra_list1[i]['spacing_bin'],
                                        ra_list2[i]['spacing_bin'])


def assertTagsMatch(test_class_instance, tag_list1, tag_list2):
    test_class_instance.assertEqual(len(tag_list1), len(tag_list2))

    tag_list1 = sorted(tag_list1, key=lambda i: i['label'])
    tag_list2 = sorted(tag_list2, key=lambda i: i['label'])

    for i in range(len(tag_list1)):
        test_class_instance.assertEqual(tag_list1[i]['label'],
                                        tag_list2[i]['label'])


def assertCardFieldsMatch(test_class_instance, card_obj, expected_values):
    if 'uuid' in card_obj and 'uuid' in expected_values:
        test_class_instance.assertEqual(card_obj['uuid'], expected_values['uuid'])

    if 'title' in card_obj and 'title' in expected_values:
        test_class_instance.assertEqual(card_obj['title'], expected_values['title'])

    if 'query' in card_obj and 'query' in expected_values:
        test_class_instance.assertEqual(card_obj['query'], expected_values['query'])

    if 'answer' in card_obj and 'answer' in expected_values:
        test_class_instance.assertEqual(card_obj['answer'], expected_values['answer'])

    if 'spacing_bin' in card_obj and 'spacing_bin' in expected_values:
        test_class_instance.assertEqual(card_obj['spacing_bin'], expected_values['spacing_bin'])

    if 'active' in card_obj and 'active' in expected_values:
        test_class_instance.assertEqual(card_obj['active'], expected_values['active'])

    if 'tags' in card_obj and 'tags' in expected_values:
        assertTagsMatch(test_class_instance, card_obj['tags'], expected_values['tags'])

    if 'images' in card_obj and 'images' in expected_values:
        test_class_instance.assertEqual(len(card_obj['images']), len(expected_values['images']))

    if 'creation_date' in card_obj and 'creation_date' in expected_values:
        test_class_instance.assertEqual(card_obj['creation_date'], expected_values['creation_date'])

    if 'last_modified_date' in card_obj and 'last_modified_date' in expected_values:
        test_class_instance.assertEqual(card_obj['last_modified_date'], expected_values['last_modified_date'])

    if 'next_retrieval_date' in card_obj and 'next_retrieval_date' in expected_values:
        test_class_instance.assertEqual(card_obj['next_retrieval_date'],
                                        expected_values['next_retrieval_date'])

    if 'retrieval_attempts' in card_obj and 'retrieval_attempts' in expected_values:
        assertRetrievalAttemptsMatch(test_class_instance,
                                     card_obj['retrieval_attempts'],
                                     expected_values['retrieval_attempts'])

    # TODO: check the files field inner data?


def assertCardListsMatch(test_class_instance, card_list1, card_list2, sort_key='uuid'):
    test_class_instance.assertEqual(len(card_list1), len(card_list2))

    card_list1 = sorted(card_list1, key=lambda i: i[sort_key])
    card_list2 = sorted(card_list2, key=lambda i: i[sort_key])

    for i in range(len(card_list1)):
        assertCardFieldsMatch(test_class_instance, card_list1[i], card_list2[i])


def get_rest_link(links, rel):
    url = ""

    for link in links:
        if link['rel'] == rel:
            url = link['href']
            break

    return url


class CardApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        User.objects.create_user(test_user1['username'],
                                 test_user1['email'],
                                 test_user1['password'])

        User.objects.create_user(test_user2['username'],
                                 test_user2['email'],
                                 test_user2['password'])

    def tearDown(self):
        remove_filesystem_files()
        super().tearDown()


class CardApiTransactionTestCase(TransactionTestCase):
    def setUp(self):
        User.objects.create_user(test_user1['username'],
                                 test_user1['email'],
                                 test_user1['password'])

        User.objects.create_user(test_user2['username'],
                                 test_user2['email'],
                                 test_user2['password'])

        super().setUp()

    def tearDown(self):
        remove_filesystem_files()
        super().tearDown()

