# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

import urllib.request
import urllib.parse
import getpass
import json
import io
import tarfile
import argparse


# Imports required for DjangoJSONEncoder
import datetime
import decimal
import uuid


BASE_URL       = ""
BASE_API_URL   = ""
INDEX_PAGE_URL = ""

csrf_token = ""
session_id = ""


# Taken from django.core.serializers.json version 2.1.5.
# This adds support here for encoding non-standard types
# like datetime which are used in the notecards json api.
# This class is inserted here because this file needs to
# be able to be executed in environments which do do not
# contain the Django python package.
class DjangoJSONEncoder(json.JSONEncoder):
    """
    JSONEncoder subclass that knows how to encode date/time, decimal types, and
    UUIDs.
    """
    def default(self, o):
        # See "Date Time String Format" in the ECMA-262 specification.
        if isinstance(o, datetime.datetime):
            r = o.isoformat()
            if o.microsecond:
                r = r[:23] + r[26:]
            if r.endswith('+00:00'):
                r = r[:-6] + 'Z'
            return r
        elif isinstance(o, datetime.date):
            return o.isoformat()
        elif isinstance(o, datetime.time):
            if o.utcoffset() is not None:
                raise ValueError("JSON can't represent timezone-aware times.")
            r = o.isoformat()
            if o.microsecond:
                r = r[:12]
            return r
        #elif isinstance(o, datetime.timedelta):
        #    return duration_iso_string(o)
        #elif isinstance(o, (decimal.Decimal, uuid.UUID, Promise)):
        elif isinstance(o, (decimal.Decimal, uuid.UUID)):
            return str(o)
        else:
            return super().default(o)


def set_urls(server_address="http://127.0.0.1", port="8000"):
    global BASE_URL, BASE_API_URL, INDEX_PAGE_URL
    BASE_URL       = "{}:{}".format(server_address, port)
    BASE_API_URL   = "{}/cards/api/v1/".format(BASE_URL)
    INDEX_PAGE_URL = "{}/cards/".format(BASE_URL)


def extract_cookie(headers, cookie_name):
    value = ""
    prefix = cookie_name + "="

    for header in headers:
        if ((header[0] == 'Set-Cookie') and
             header[1].startswith(prefix)):

            value = header[1].split(';')[0]
            value = value.split('=')[1]

    return value


def add_cookies_to_request(request, cookie_names=[]):
    values = [] 

    for cookie_name in cookie_names:
        if (cookie_name == "csrftoken") and (csrf_token != ""):
            values.append("csrftoken={}".format(csrf_token))

        elif (cookie_name == "sessionid") and (session_id != ""):
            values.append("sessionid={}".format(session_id))

    if len(values) > 0:
        request.add_header('Cookie', "; ".join(values))


def get_csrf_token():
    with urllib.request.urlopen(INDEX_PAGE_URL) as f:
        if f.status == 200:
            global csrf_token
            csrf_token = extract_cookie(f.getheaders(), "csrftoken")


def login(username, password):
    global csrf_token
    global session_id

    logged_in = False

    url = BASE_API_URL + "logins/"
    request = urllib.request.Request(url, method="POST")

    json_data = json.dumps({'username': username, 'password': password})
    json_bytes = json_data.encode('utf-8')

    request.add_header('Content-Type', 'application/json; charset=utf-8')
    request.add_header('Content-Length', len(json_bytes))
    request.add_header('X-CSRFToken', csrf_token)

    add_cookies_to_request(request, ['csrftoken'])

    with urllib.request.urlopen(request, json_bytes) as f:
        if f.status == 200:
            # CSRF tokens are rotated each time a user logs in.
            # Update the token to the latest value after successful
            # login. See https://docs.djangoproject.com/en/2.1/ref/csrf/
            csrf_token = extract_cookie(f.getheaders(), "csrftoken")
            session_id = extract_cookie(f.getheaders(), "sessionid")

            logged_in = True

    return logged_in


def logout():
    global session_id

    url = BASE_API_URL + "logouts/"
    request = urllib.request.Request(url, method="POST")
    request.add_header('X-CSRFToken', csrf_token)

    add_cookies_to_request(request, ['csrftoken', 'sessionid'])

    with urllib.request.urlopen(request) as f:
        if f.status == 200:
            session_id = ""


def get_card(url, card_format="archive"):
    result = None

    query_string = urllib.parse.urlencode({"format": card_format})
    url += "/?{}".format(query_string)
    request = urllib.request.Request(url, method="GET")

    add_cookies_to_request(request, ['sessionid'])

    with urllib.request.urlopen(request) as f:
        if f.status == 200:
            result = f.read()

    return result


def get_cards(filter_overrides={}, card_format=""):
    result = None

    card_filter = {
        'review_status': "1",
        'order_by': "1",
        'active': "2",
        'tags_filter': "",
        'title_filter': "",
        'cards_per_page': "0",
        'page': "1"
    }

    card_filter.update(filter_overrides)
    card_filter['format'] = card_format

    query_string = urllib.parse.urlencode(card_filter)
    url = BASE_API_URL + "cards/?{}".format(query_string)
    request = urllib.request.Request(url, method="GET")

    add_cookies_to_request(request, ['sessionid'])

    with urllib.request.urlopen(request) as f:
        if f.status == 200:
            result = f.read()

    return result


def new_card_from_values(card_values):
    json_data = json.dumps(card_values, cls=DjangoJSONEncoder)
    json_bytes = json_data.encode('utf-8')
    return new_card_from_json_bytes(json_bytes)


def new_card_from_json_bytes(json_bytes, num_bytes=None):
    new_card_added = False

    url = BASE_API_URL + "cards/"
    request = urllib.request.Request(url, json_bytes, method="POST")

    request.add_header('Content-Type', 'application/json; charset=utf-8')
    request.add_header('X-CSRFToken', csrf_token)

    if num_bytes:
        request.add_header('Content-Length', num_bytes)
    else:
        request.add_header('Content-Length', len(json_bytes))

    add_cookies_to_request(request, ['csrftoken', 'sessionid'])

    with urllib.request.urlopen(request) as f:
        if f.status == 201:
            new_card_added = True

    return new_card_added


def create_card_archive(file_path, filter_overrides={}):
    data = get_cards(filter_overrides={}, card_format='links')
    data = json.loads(data)

    if data['version'] != 1:
        return 0

    if len(data['cards']) == 0:
        return 0

    num_cards_archived = 0

    tf = tarfile.open(file_path, 'w:gz')

    for card in data['cards']:
        card_url = ""
        card_uuid = card['uuid']

        for link in card['links']:
            if link['rel'] == 'self':
                card_url = BASE_URL + link['href']

        if card_url == "":
            print("ERROR: could not find self link for card {}".format(card['uuid']))
            continue

        card_bytes = get_card(card_url, card_format='archive')
        byte_stream = io.BytesIO(card_bytes)

        tarinfo = tarfile.TarInfo(name=card_uuid)
        tarinfo.size = len(card_bytes)

        tf.addfile(tarinfo=tarinfo, fileobj=byte_stream)

        num_cards_archived += 1
        print('.', end='', flush=True)

    tf.close()
    return num_cards_archived


def upload_card_archive(file_path):
    num_cards_uploaded = 0

    tf = tarfile.open(file_path, 'r:gz')
    for tarinfo in tf:
        buffered_reader = tf.extractfile(tarinfo)

        if new_card_from_json_bytes(buffered_reader, tarinfo.size):
            num_cards_uploaded += 1
            print('.', end='', flush=True)

    tf.close()
    return num_cards_uploaded


def parse_command_line():
    arg_parser = argparse.ArgumentParser(description="Interact with a notecards server from the command line.")

    arg_parser.add_argument("-s",
                            "--server",
                            help="The base url for the server to connect to. This should include the scheme. The default is 'http://127.0.0.1'",
                            type=str, 
                            default="http://127.0.0.1",
                            metavar="SERVER_URL")

    arg_parser.add_argument("-p",
                            "--port",
                            help="The port to access on the server. The default is 8000.",
                            type=str,
                            default="8000",
                            metavar="PORT")

    group = arg_parser.add_mutually_exclusive_group()
    group.add_argument("-u",
                       "--upload",
                       help="Upload cards stored in a card archive (*.car file) to the server.",
                       type=str,
                       metavar="FILE")

    group.add_argument("-d",
                       "--download",
                       help="Download cards from the server in to a card archive (*.car).",
                       type=str, 
                       metavar="FILE")

    args = arg_parser.parse_args()
    return args


def run_session(func):
    get_csrf_token()

    username = input("Username: ")
    password = getpass.getpass("Password: ")

    if login(username, password):
        try:
            func()

        except Exception as err:
            print(err)

        logout()


args = parse_command_line()

set_urls(args.server, args.port)

if args.download:
    def session_func():
        num_cards_archived = create_card_archive(args.download)
        if num_cards_archived > 0:
            print("\nSuccessfully archived {} cards".format(num_cards_archived))

        else:
            print("Could not create archive file.")

    run_session(session_func)

elif args.upload:
    def session_func():
        num_cards_uploaded = upload_card_archive(args.upload)
        if num_cards_uploaded > 0:
            print("\nSuccessfully uploaded {} cards".format(num_cards_uploaded))

        else:
            print("Error uploading cards")

    run_session(session_func)

