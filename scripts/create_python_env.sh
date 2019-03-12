# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

echo
echo Using `python3 --version` located in `which python3`
echo
echo Creating the base python environment...
echo

# See https://docs.python.org/3/library/venv.html
python3 -m venv python_env

. ./python_env/bin/activate

echo
echo Using `python --version` located in `which python`
echo Upgrading pip...
echo

# See https://bugs.python.org/issue30628
python -m pip install --upgrade pip

echo
echo Using `pip3 --version`
echo
echo Installing required python packages...
echo

pip3 install Django==2.1.5

