# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

from django import template

register = template.Library()


def rest_link(links, rel):
    result = "#"

    for link in links:
        if link['rel'] == rel:
            result = link['href']
            break

    return result


register.filter('rest_link', rest_link)

