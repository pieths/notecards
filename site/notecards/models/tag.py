# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.db import models
from django.contrib.auth.models import User


class Tag(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    label = models.CharField(max_length=100, default="")

    class Meta:
        unique_together = ("user", "label")

    def __str__(self):
        return 'id: {0} label: {1}'.format(str(self.pk), self.label)

