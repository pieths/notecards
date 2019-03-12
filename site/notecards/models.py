# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

import uuid as _uuid
import base64


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


def get_new_uuid():
    uuid = _uuid.uuid4()
    uuid = base64.urlsafe_b64encode(uuid.bytes)
    uuid = uuid.decode(encoding="utf-8")
    return uuid[:-2] # remove "==" from the end


class Tag(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    label = models.CharField(max_length=100, default="")

    class Meta:
        unique_together = ("user", "label")

    def __str__(self):
        return 'id: {0} label: {1}'.format(str(self.pk), self.label)


class Card(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    uuid = models.CharField(max_length=22, default=get_new_uuid)
    title = models.CharField(max_length=128, default="")
    query = models.TextField(default="")
    answer = models.TextField(default="")
    creation_date = models.DateTimeField('date created', default=timezone.now)
    last_modified_date = models.DateTimeField()
    next_retrieval_date = models.DateTimeField()
    spacing_bin = models.IntegerField(default=1)
    active = models.BooleanField(default=True)
    tags = models.ManyToManyField(Tag)
    sha_512 = models.CharField(max_length=100)

    class Meta:
        unique_together = ("user", "uuid")

    def __str__(self):
        return "id:" + str(self.pk) \
            + " uuid:" + str(self.uuid) \
            + " spacing_bin:" + str(self.spacing_bin) \
            + " active:" + str(self.active) \
            + " title:[" + self.title[:40] + "]" \
            + " query:[" + self.query[:40] + "]" \
            + " answer:[" + self.answer[:40] + "]" \
            + " sha_512:[" + self.sha_512 + "]"


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


class RetrievalAttempt(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    retrieval_date = models.DateTimeField(default=timezone.now)
    retrieved = models.BooleanField(default=False)
    spacing_bin = models.IntegerField(default=1)

    def __str__(self):
        return "id:" + str(self.pk) \
            + " Referenced card id: " + str(self.card.pk) \
            + " spacing_bin:" + str(self.spacing_bin)

