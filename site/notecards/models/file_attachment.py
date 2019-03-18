# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.utils import timezone

from .card import Card


def get_file_path(instance, filename):
    card_uuid = instance.card.uuid
    user_pk   = instance.card.user.pk
    path = "{}/{}/{}/{}/{}/files/{}".format(
            card_uuid[0],
            card_uuid[1],
            card_uuid[2],
            card_uuid,
            user_pk,
            filename)
    return path


class FileAttachment(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    file = models.FileField(upload_to=get_file_path)
    sha_512 = models.CharField(max_length=100)
    media_type = models.CharField(max_length=128, default="application/octet-stream")
    creation_date = models.DateTimeField('date created', default=timezone.now)

    def __str__(self):
        return "id:" + str(self.pk) \
            + " name: " + self.file.name \
            + " media_type: "  + self.media_type \
            + " card_id: " + str(self.card.pk)

