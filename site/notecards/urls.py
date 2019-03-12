# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django.urls import re_path, include

from . import views


urlpatterns = [

    re_path(r'^$', views.index, name='notecards-index'),

    re_path(r'^edit/(?P<card_uuid>[0-9a-zA-Z_-]{22})/$',
            views.edit_card,
            name='notecards-edit-card'),

    re_path(r'^review/(?P<card_uuid>[0-9a-zA-Z_-]{22})/$',
            views.review_card,
            name='notecards-review-card'),

    re_path(r'^api/v1/', include('notecards.api.urls'))
]

