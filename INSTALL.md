## Requirements

* Python 3.6+


## Command Line Installation (Debug/Linux/sqlite)

Get the notecards repository.

```console
$ git clone https://github.com/pieths/notecards.git
$ git submodule init
$ git submodule update
```

Switch to the root directory of the repository and create the virtual
python environment using the `create_python_env.sh` script. The script
can take an optional parameter that points to the bin directory which
contains the python3 executable to use.

```console
$ ./scripts/create_python_env.sh [path/to/python3/bin]
```

Set the following environmental variables to the desired values.

```console
$ export NOTECARDS_APP_SECRET_KEY="[django_secret_key]"

$ export NOTECARDS_APP_ALLOWED_HOSTS="[allowed_hosts]"

$ export DJANGO_SETTINGS_MODULE=main.settings_dev_sqlite
```

These environmental variables can also be added to the end of the virtual environment
activate script (`./python_env/bin/activate`) so that they are automatically set when
the virtual environment is activated.

Activate the python virtual environment. Note, this file must be _sourced_ to
work correctly.

```console
$ . ./python_env/bin/activate
```

Navigate to the `site` directory and create the initial database.

```console
$ cd site
$ python manage.py migrate
```

Create a user. A user is required for adding new cards to the system.

```console
$ python ../scripts/create_user.py
```

The installation should now be complete. To test the installation run the following
command in the `site` directory and try an access the server in a web browser using
any of the addresses specified in the `NOTECARDS_APP_ALLOWED_HOSTS` environmental
variable (or `localhost:8000` if the variable was left blank).

```console
$ python manage.py runserver 0:8000
```


## Command Line Installation (Non-Debug/RaspberryPi/PostgreSQL)

### Build Python From Source

Install the Python build dependencies.

```console
$ sudo apt-get install libssl-dev
$ sudo apt-get install libsqlite3-dev
$ sudo apt-get install libgdbm-dev
$ sudo apt-get install libbz2-dev
$ sudo apt-get install liblzma-dev
$ sudo apt-get install libreadline6-dev
$ sudo apt-get install libffi-dev
$ sudo apt-get install uuid-dev
```

Get the Python source from GitHub.
        
```console
$ mkdir -p ~/notecards/python
$ cd ~/notecards/python
$ git clone https://github.com/python/cpython.git repo
```

Build Python (takes around 5 hours on Raspberry Pi 2 Model B when
building with optimizations).

```console
$ cd ~/notecards/python/repo
$ git checkout v3.7.2
$ ./configure --enable-optimizations --prefix=/home/pi/notecards/python/build/3.7.2
$ make -j 4

    Python build finished successfully!
    The necessary bits to build these optional modules were not found:
    _curses               _curses_panel         _tkinter           
    To find the necessary bits, look in setup.py in detect_modules() for the module's name.


    The following modules found by detect_modules() in setup.py, have been
    built by the Makefile instead, as configured by the Setup files:
    _abc                  atexit                pwd                
    time                                                   
```

Though not necessary, lets install the newly built Python in to the prefix
directory specified in the configure step. Later steps in the installation
assume that this has been done.

```console
$ make install
```

### Install And Setup The Notecards App

Get the notecards repository and setup the virtual python environment.

```console
$ git clone https://github.com/pieths/notecards.git ~/notecards/repo
$ git submodule init
$ git submodule update
$ cd ~/notecards/repo
$ ./scripts/create_python_env.sh ~/notecards/python/build/3.7.2/bin/
```

Set the core environmental variables. Though they can be put anywhere,
lets add them to the end of the activate script in
`~/notecards/repo/python_env/bin/activate`. Replace the square bracketed
text with the desired values.

```console
export NOTECARDS_APP_SECRET_KEY="[django_secret_key]"
export NOTECARDS_APP_ALLOWED_HOSTS="[allowed_hosts]"
export DJANGO_SETTINGS_MODULE=main.settings_prod_postgres
```

### Install And Setup PostgreSQL

Install the PostgreSQL package.

```console
$ sudo apt-get install postgresql
```

Set the password of the PostgreSQL user (role) called `postgres`.

```console
$ sudo -u postgres psql postgres

postgres=# \password postgres
...
postgres=# \q
```

Create a new user and database in PostgreSQL which will be used
for the notecards app. Replace `[user_name]`, `[password]` and
`[database_name]` with the desired values.

```console
$ sudo -u postgres psql postgres
postgres=# CREATE USER [user_name] WITH PASSWORD '[password]';
CREATE ROLE
postgres=# CREATE DATABASE [database_name] WITH OWNER [user_name];
CREATE DATABASE
postgres=# \q
```

Add the following environmental variables to `~/notecards/repo/python_env/bin/activate`.
Replace `[user_name]`, `[password]` and `[database_name]` with the values
specified above.


```console
export NOTECARDS_DB_NAME="[database_name]"
export NOTECARDS_DB_USER="[user_name]"
export NOTECARDS_DB_PASS="[password]"
```

### Install Pyscopg2

Get the `pyscopg2` source from GitHub.

```console
$ cd ~/notecards
$ git clone https://github.com/psycopg/psycopg2.git psycopg2
```

Install the build dependencies.

```console
$ sudo apt-get install libpq-dev
```

Activate the virtual python environment if it is not already active.
This can be skipped if it was done in a previous step.

```console
$ . ~/notecards/repo/python_env/bin/activate
```

Build and install `psycopg2` in to the virtual Python environment.

```console
$ cd ~/notecards/psycopg2
$ git checkout 2_7_7
$ python setup.py build
$ python setup.py install
```

To verify that `pyscopg2` was installed correctly in the venv:

```console
$ pip list
```

`psycopg2 2.7.7` should be listed in the output

### Create The Initial Database And User

Activate the virtual python environment if it is not already active.
This can be skipped if it was done in a previous step.

```console
$ . ~/notecards/repo/python_env/bin/activate
```

Perform the initial database migrations.

```console
$ cd ~/notecards/repo/site/
$ python manage.py migrate
```

Create a user. A user is required for adding new cards to the system.

```console
$ cd ~/notecards/repo
$ python ./scripts/create_user.py
```

### Install Gunicorn

Activate the virtual python environment if it is not already active.
This can be skipped if it was done in a previous step.

```console
$ . ~/notecards/repo/python_env/bin/activate
```

Install gunicorn from the main Python repository.
Note there maybe an issue with accessing `https://www.piwheels.org/simple` when using `pip`
because the website is down and `pip` might time out. Let it timeout a few times and 
it will finally use the regular pypi.

```console
$ pip3 install gunicorn
```

To verify that it installed:

```console
$ pip list

Package    Version
---------- -------
Django     2.1.5  
gunicorn   19.9.0 
pip        19.0.3 
psycopg2   2.7.7  
pytz       2018.9 
setuptools 40.6.2 
```

### Install And Setup Nginx

Install nginx from the package repository.

```console
$ sudo apt-get install nginx
```

Here is a basic configuration file. Put this in
`/etc/nginx/sites-available/notecards`.

```console
upstream app_server {
    # fail_timeout=0 means we always retry an upstream even if it failed
    # to return a good HTTP response

    # for UNIX domain socket setups
    server unix:/tmp/gunicorn.sock fail_timeout=0;

    # for a TCP configuration
    #server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;

    root /home/pi/notecards/repo/site/notecards/static/notecards;

    location / {
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Protocol $scheme;
        proxy_pass http://app_server;
    }

    location /static/notecards/ {
        root /home/pi/notecards/repo/site/notecards;
    }

    location /protected/media/ {
        internal;
        alias /home/pi/notecards/repo/site/media/;
    }
}
```

Enable the server defined in the configuration file.

```console
$ cd /etc/nginx/sites-enabled
$ sudo ln -s ../sites-available/notecards notecards)
```

### Test The Server

Start nginx.

```console
$ sudo /etc/init.d/nginx stop
$ sudo /etc/init.d/nginx start
```

Activate the virtual python environment if it is not already active.
This can be skipped if it was done in a previous step.

```console
$ . ~/notecards/repo/python_env/bin/activate
```

Start gunicorn.

```console
$ cd ~/notecards/repo/site
$ gunicorn -b unix:/tmp/gunicorn.sock main.wsgi 
```

or, to see debug output,

```console
$ cd ~/notecards/repo/site
$ gunicorn -b unix:/tmp/gunicorn.sock --log-file=- --log-level=debug main.wsgi
```

Hit `ctrl-c` to stop the gunicorn process.

