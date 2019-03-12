# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

import re
import inspect

from notecards.tests.test_api_cards import CardsApiTests
from notecards.tests.test_api_card import CardApiTests
from notecards.tests.test_api_card_tags import CardTagsApiTests
from notecards.tests.test_api_card_tag import CardTagApiTests
from notecards.tests.test_api_card_files import CardFilesApiTests
from notecards.tests.test_api_card_file import CardFileApiTests
from notecards.tests.test_api_card_retrieval_attempts import RetrievalAttemptsApiTests
from notecards.tests.test_api_card_retrieval_attempt import RetrievalAttemptApiTests
from notecards.tests.test_api_tags import TagsApiTests
from notecards.tests.test_api_card_archive_import_tasks import CardArchiveImportTasksApiTests
from notecards.tests.test_api_advance_review_date_tasks import AdvanceReviewDateTasksApiTests


# To create the api documentation, execute
# the following on the command line:
#
#    $ python manage.py shell --command='from notecards import docs; print(docs.export_api_doc())'
#


def convert_to_list(items, indent=""):
    result = []
    for index, item in enumerate(items, start=1):
        marker = "{}.".format(index).ljust(4)

        if index > 1:
            result.append('')

        for i, line in enumerate(item):
            if i == 0:
                result.append(indent + marker + line)

            else:
                result.append(indent + "    " + line)

    return result


def export_api_tests_docstrings(cls):
    get_docstrings = []
    put_docstrings = []
    post_docstrings = []
    patch_docstrings = []
    delete_docstrings = []

    members = inspect.getmembers(cls)
    members = filter(lambda m: m[0].startswith("test_") and inspect.isfunction(m[1]), members)
    members = sorted(members, key=lambda m: m[1].__code__.co_firstlineno)

    for name, value in members:
        lines = inspect.getdoc(value).splitlines()

        if lines[0] == "Method: GET":
            get_docstrings.append(lines[1:])

        elif lines[0] == "Method: PUT":
            put_docstrings.append(lines[1:])

        elif lines[0] == "Method: POST":
            post_docstrings.append(lines[1:])

        elif lines[0] == "Method: PATCH":
            patch_docstrings.append(lines[1:])

        elif lines[0] == "Method: DELETE":
            delete_docstrings.append(lines[1:])

    main_class_doc_lines = inspect.getdoc(cls).splitlines()

    pattern = re.compile(r'^(\s*)\(see ([A-Z]+) tests below for details\)\s*$')
    result = []

    for line in main_class_doc_lines:
        match = pattern.match(line)

        if not match:
            result.append(line)

        else:
            verb = match.group(2)
            indent = match.group(1)

            if verb == 'GET':
                result.extend(convert_to_list(get_docstrings, indent))

            elif verb == 'PUT':
                result.extend(convert_to_list(put_docstrings, indent))

            elif verb == 'POST':
                result.extend(convert_to_list(post_docstrings, indent))

            elif verb == 'PATCH':
                result.extend(convert_to_list(patch_docstrings, indent))

            elif verb == 'DELETE':
                result.extend(convert_to_list(delete_docstrings, indent))

    return '\n'.join(result)


def export_api_doc():
    classes = [
        CardsApiTests,
        CardApiTests,
        CardTagsApiTests,
        CardTagApiTests,
        CardFilesApiTests,
        CardFileApiTests,
        RetrievalAttemptsApiTests,
        RetrievalAttemptApiTests,
        TagsApiTests,
        CardArchiveImportTasksApiTests,
        AdvanceReviewDateTasksApiTests
    ]

    result = []

    for cls in classes:
        result.append(export_api_tests_docstrings(cls))

    separator = "\n\n------------------------------------------------------------\n\n"
    return separator.join(result)

