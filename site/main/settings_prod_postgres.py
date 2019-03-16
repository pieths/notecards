# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from .settings_base import *


DEBUG = False

# Recommended because file attachments can
# increase the POST payload significantly
# when creating new cards with json data.
DATA_UPLOAD_MAX_MEMORY_SIZE = 10_000_000


# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('NOTECARDS_DB_NAME', ''),
        'USER': os.environ.get('NOTECARDS_DB_USER', ''),
        'PASSWORD': os.environ.get('NOTECARDS_DB_PASS', ''),
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


# User uploaded files

FILE_UPLOAD_PERMISSIONS = 0o644

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

