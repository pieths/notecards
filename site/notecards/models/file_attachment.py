# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.utils import timezone

from .card import Card
from notecards import media


def get_file_path(instance, filename):
    return media.get_file_path(instance.card, filename)


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

    @staticmethod
    def from_id(file_attachment_id):
        try:
            file_attachment = FileAttachment.objects.get(pk__exact=file_attachment_id)
        except:
            file_attachment = None

        return file_attachment

