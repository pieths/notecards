# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.utils import timezone

from .card import Card


class RetrievalAttempt(models.Model):
    card = models.ForeignKey(Card, on_delete=models.CASCADE)
    retrieval_date = models.DateTimeField(default=timezone.now)
    retrieved = models.BooleanField(default=False)
    spacing_bin = models.IntegerField(default=1)

    def __str__(self):
        return "id:" + str(self.pk) \
            + " Referenced card id: " + str(self.card.pk) \
            + " spacing_bin:" + str(self.spacing_bin)

    @staticmethod
    def from_id(retrieval_attempt_id):
        try:
            retrieval_attempt = RetrievalAttempt.objects.get(pk__exact=retrieval_attempt_id)
        except:
            retrieval_attempt = None

        return retrieval_attempt

