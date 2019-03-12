# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

import os
from importlib import import_module


urlpatterns = []
module_names = []
module_dir = os.path.dirname(__file__)

for f in os.listdir(module_dir):
    file_path = os.path.join(module_dir, f)

    if os.path.isfile(file_path):
        module_name = f[:-3]
        if (module_name != "urls") and (module_name != "__init__"):
            module_names.append(module_name)

for module_name in module_names:
    module = import_module("notecards.api." + module_name)
    if 'url_path' in dir(module):
        urlpatterns.append(module.url_path)

