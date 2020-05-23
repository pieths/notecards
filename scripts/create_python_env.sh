# Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
# Licensed under the terms of the MIT license.

if [ $# -gt 0 ]; then
    # The first parameter is the path
    # to the python3 bin directory
    PYTHON="$1/python3"
else
    PYTHON=python3
fi

echo
echo Using `$PYTHON --version` located in `which $PYTHON`
echo
echo Creating the base python environment...
echo

# See https://docs.python.org/3/library/venv.html
$PYTHON -m venv python_env

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

pip3 install Django==2.2.12

