# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

import re
import getpass
import subprocess


email_re = re.compile(r'^[0-9a-zA-Z_@.-]{5,}$')
username_re = re.compile(r'^[a-zA-Z][0-9a-zA-Z]{3,}$')
password_re = re.compile(r'^[0-9a-zA-Z_[\]~!@#$%^&*()]{8,}$')

default_email = "user1@test-123456789.com"
default_username = "user1"
default_password = "password"

email = ""
username = ""
password = ""


def is_valid_email(email):
    match = email_re.fullmatch(email)
    return match != None


def is_valid_username(username):
    match = username_re.fullmatch(username)
    return match != None


def is_valid_password(password):
    match = password_re.fullmatch(password)
    return match != None


while not is_valid_username(username):
    username = input("Username [{}]: ".format(default_username))
    if username == "":
        username = default_username

while not is_valid_email(email):
    email = input("Email [{}]: ".format(default_email))
    if email == "":
        email = default_email

while not is_valid_password(password):
    password = getpass.getpass("Password [{}]: ".format(default_password))
    if password == "":
        password = default_password

py_code = 'from django.contrib.auth.models import User; '
py_code += 'User.objects.create_user(\"{0}\", \"{1}\", \"{2}\")'
py_code = py_code.format(username, email, password)

command = "python manage.py shell --command='{}'".format(py_code)

completed_process = subprocess.run(command,
                                   shell=True,
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE)

print(completed_process.stdout.decode())
print(completed_process.stderr.decode())

