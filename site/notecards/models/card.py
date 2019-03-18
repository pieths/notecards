# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

import uuid as _uuid
import base64

from .tag import Tag


def get_new_uuid():
    uuid = _uuid.uuid4()
    uuid = base64.urlsafe_b64encode(uuid.bytes)
    uuid = uuid.decode(encoding="utf-8")
    return uuid[:-2] # remove "==" from the end


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

