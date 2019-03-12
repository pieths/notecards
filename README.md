## Overview

Notecards is an open source web app for creating, maintaining and
utilizing _personal knowledge bases_. It stores the knowledge elements in discrete
chunks called _cards_ and includes the following features:

* __Markdown based content format__ with custom extensions for content like
   mathematics and graphs/diagrams.

* __Vi key bindings__. The default web client has been designed from the
   ground up to be controllable with a keyboard using Vi like keybindings.
   The content editors are based on CodeMirror and default to Vi mode when
   on the desktop.

* A __REST like interface__ to the backend. This allows for the creation of other
   types of clients. See the command line backup tool (`notecards_cli.py`) in
   the scripts directory for an example of using the API from the command
   line in python.

* __Responsive layout__ for use across different types of devices.

* An __AsciiMath input mode__ to aid the user with entering
    [asciimath](http://asciimath.org/) markup.

* __Realtime preview__ when creating content.

* __Graph/Diagram support__ using cgraph a compact and scriptable
    declarative graphing library.

* A __Point Adjust__ editor mode for manipulating points in CGraph markup
    with Vi like keybindings.

* Each card is self contained and supports __file attachments__.

* A __Spaced repetition__ learning system.

* __Tag based organization__ of the cards. 

* Basic __multi-user support__. 

## Installation

### Requirements

* Python 3.5+

### Command Line Installation (Linux/sqlite)

Switch to the root directory of the repository and create the virtual
python environment using the `create_python_env.sh` script.

```console
$ ./scripts/create_python_env.sh
```

Set the following environmental variables to the desired values.

```console
$ export NOTECARDS_APP_SECRET_KEY="..."

# Leave blank for default which is localhost
$ export NOTECARDS_APP_ALLOWED_HOSTS="192.168.1.1, ..."

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

## Basic Usage

### Starting The Server (Linux/sqlite)

Navigate to root of the repository and execute the following
commands to setup the environment and launch the server.

```console
$ . ./python_env/bin/activate
$ cd site
$ python manage.py runserver 0:8000
```

### Logging In To The System

On the index page, click the menu button on the top right of the page
and select the _Login_ menu item. Then type in the username and password
and click the _Login_ button.

![Login Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/login.gif)

The login screen can also be accessed by typing `:` to open up the
command bar and then typing `login` followed by the enter key.


### Creating A New Card

There are two ways to create a new card through the web client.

1. On the index page, click the menu button on the top right of the page
   and select the _New Card_ menu item.
   
2. Type `:` to open up the command bar. Then type `new` followed by the enter key.

    ![New Card Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/new_card.gif)


### Navigating With Keystrokes

These keystrokes are currently available to navigate the index page:

* `j` and `k` move the selection down and up respectively.
* `h` and `l` switch to the previous and next pages respectively.
* `e` switches to the edit screen for the selected card or the first card
    if no card is selected.
* `r` switches to the review screen for the selected card or the first card
	if no card is selected.
    
These keystrokes are currently available to navigate on the edit page:

* `Ctrl-J` and `Ctrl-K` navigate down and up in the editors respectively.
    These are aliases for `Ctrl-D` and `Ctrl-U`.

* `Ctrl-Shift-J` and `Ctrl-Shift-K` move the preview window down and up respectively.

* `Shift-Z-J` moves the focus from the query editor to the answer editor.
    Note, the editor must be in _normal_ mode for this to work.

* `Shift-Z-K` moves the focus from the answer editor to the query editor.
    Note, the editor must be in _normal_ mode for this to work.

* `:q` when typed in _normal_ mode in either the query or answer editors will
	stop editing without saving any changes and go back to the index page.
    
![Keyboard Navigation Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/keyboard_nav.gif)


### Searching For Cards

The card list on the index page can be filtered in two different ways.

1. Click the _Filters_ button at the top right of the index page. This will expose
    a form which can be used to filter the cards based on different criteria.

2. Type `/` to open up the command bar in search mode and enter the desired
	search parameters. Each parameter starts with the field name followed by
    the value separated by a space. Multiple parameters can be specified and
    should be separated by a semicolon. Here is a list of some of the field names:
    
    * `tag` or `tags`
    * `title`
    * `active` (value must be one of `true`, `1`, `false`, `0`, `any`, `2`)
    * `rs` or `reviewstatus` (value must be one of `rr`, `0`, `any`, `1`)
    * `ob` or `orderby` (value must be one of `review`, `0`, `create`, `1`)
    
    If the starting `/` is immediately followed by `+` then the specified query
    parameters are added to the current ones. Otherwise, the query parameters
    are added to the default which is a filter that specifies all cards.
    
    If `/` is specified by itself then the query parameters are reset
    back to their defaults.
    
    The card list will update in real time as new search criteria is entered.
    This is only a preview and is not made permament until the `enter` key is
    typed to finalize the query.
    
    To cancel the search query at any point, type `Ctrl-[`.
    
    The `tag` and `title` search fields perform case insensitive matching.

    Here are a few examples:
    
    * The following shows the cards which have been assigned the `python` tag.
    
        ![Search Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/search.png)
    
    * `/+active 0; title pca`
    
        This adds to the current filter. Requesting inactive cards whose
        title contains the string `pca`.
    
    * `/title matrix inverse`
    
        Shows all the cards whose title contains the string `matrix` and `inverse`.
        The text `matrix` and `inverse` are treated as separate values so that
        this will also match titles like `Inverse of an Orthogonal Matrix`.

The search criteria is stored in the query parameters in the url so that
searches can be bookmarked.


### Introduction To The AsciiMath Input Mode

This mode will help the user enter and format asciimath markup.

AsciiMath input mode is activate by typing `Ctrl-9` when the focus
is in either the query or answer editors on the edit card page. This will create
the `$[` and `]$` delimiters and insert the cursor between them.
To enter AsciiMath mode without creating the delimiters, type `[` while in Vi normal
mode.

It is exited with `Ctrl-0`. This moves the cursor to the end of the AsciiMath
block and puts the editor in Vi normal mode.

In this mode, the cursor is limited to positions inbetween the `$[` and `]$`
tags which delimit the AsciiMath block.

In the default mode, when the spacebar is pressed, the previous non-committed
characters are checked against a list of templates. If a template is matched
then the characters are replaced with the template value. There are too
many templates to list but here are a few examples:

|Template Name|Description                       |
|-------------|----------------------------------|
|`dintt`      | Definite integral template       |
|`limt`       | Limit template                   |
|`sumt`       | Summation template               |
|`vect`       | Vector template                  |
|`sqrtt`      | Square root template             |
|`ubrace`     | Underbrace template              |
|`pow`        | Raise to power template          |
|`mat3r`      | 3 row matrix template            |
|`mat3i`      | 3x3 identity matrix template     |
|...          | more templates (see online help) |

There are a few special keystrokes that insert templates as well.
For instance, `Ctrl-/` inserts a fraction template.

Typing `tab` moves forward to the next place holder which is represented by `___`.

The spacebar moves the cursor forward when there is no non-committed characters
at the cursor. `Ctrl-Space` moves the cursor backwards. The left and right
arrows will do the same thing.

`Shift-Space` will insert an actual space. This is usually not needed
since the text is automatically formatted as it is inserted.

More information about this mode and how to use it will be in the
online help system (coming soon).

![AsciiMath Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/asciimath_example.gif)


### Introduction To Graphs And Diagrams With CGraph

CGraph is a scriptable declarative graphing library. The documentation
for this will be in the online help system soon.

Here are a few examples:

* A basic graph. Note, the default coordinates have the `x` value increasing
    from left to right and `y` values increasing from bottom to top
    (just like standard math graphs).

    ![CGraph Basic Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/cgraph_basic.png)

* A riemann sum. Changing the value of the width
	variable with `Ctrl-A` and `Ctrl-X` will automatically update the graph
    in real time. The value that those key strokes increment by can be
    set with `:set snap=[value]` where `[value]` is the new numerical
    increment value.

    ![CGraph Riemann Sum Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/cgraph_riemann_sum.gif)
    
* A graph containing diagram like elements. This also demonstrates the
	__point adjust__ mode which is an editor mode that uses vim like 
    keybindings (ie. `j`, `k`, `h`, `l`, ...) to adjust points in the cgraph markup.
    
    ![CGraph Diagram Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/cgraph_diagram.gif)

* A more advanced example demonstrating the scripting interface.
	This is a procedurally generated visualization of a neural net.
    Updating any of the variables or adding more layers will update
    the graph in real time in the preview window.

    ![CGraph Neural Net Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/cgraph_neural_net.png)


### Assigning Tags To Cards

Tags can be created and assigned/removed from cards in the tag dialog.
This dialog is opened by clicking on the tag bar which is found in the __TAGS__
section towards the button of the edit card page.

The top section of the dialog contains the tags currently assigned to the card.
Clicking on one of these will remove it from the card.

The middle section of the dialog contains the new tag input field. New tags
that don't already exist in the system for the current user can be typed in here.
If the tag does not already exist, it will be added to the system and
assigned to the card.

The bottom section of the dialog shows all the tags that are defined for the
current user. Clicking on one of these tags will assign it to the card.

![Tags Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/tags.gif)


### Adding File Attachments

Files can be uploaded and attached to cards. Each card has its own set of files.

To __upload__ a file and attach it to a card:

1. Open the file attachments dialog by clicking on one of the
   `(Files)` links which are in the top right of the query and
   answer editor frames.

2. Click the file input field (in Chrome this contains a button labeled
    `Choose File`).

3. Select the file to upload and attach to the card.

To __delete__ a file and detach it from a card:

1. Open the file attachments dialog by clicking on one of the
   `(Files)` links which are in the top right of the query and
   answer editor frames.

2. Click the `Delete` button corresponding to the file to delete and detach.

Clicking on the preview thumbnail in the file attachments dialog
will open/download the file.

File attachments can be referenced in the content by appending `@`
to the front of the file name. For example, assume there are two files called
`data.csv` and `image.png` attached to a card. To create a link to the
`data.csv` file use:

`[Link Description](@data.csv)`

To use `image.png` for inline images use:

`![Image Description](@image.png)`

This can also be used in CGraph markdown as a url for the `image` command.


### Reviewing Cards

If a card is marked as `active` then it is used for recall learning.
The `Next Review Date` field represents the next day that the card should
be reviewed by the user.

Every successful recall of a card will move the card to the next _spacing bin_.
An unsuccessful recall of a card moves it back to the starting _spacing bin_.
Spacing bins represent increasing amount of time before the next review date.
See [Spaced Repetition Learning](https://en.wikipedia.org/wiki/Spaced_repetition)
for an overview of how these types of learning systems work.

To review a card, either click the `Review` button on the index page or
type `r` with the card highlighted. This will show the review card page
for the selected card.

Only the query portion of the card will be initially visible on this page.
The user can then attempt a recall of the answer. Clicking on the `Answer`
header will show the answer so the user can verify the recall.

Click the `Retrieved` button at the bottom of the page if the recall
was successfull. Click the `Forgot` button at the bottom of the page if the
recall was unsuccessful. This will log the recall attempt and adjust the
spacing bin and next review date accordingly.

![Review Card Image](https://github.com/pieths/notecards/raw/master/docs/images/readme/review_card.gif)


### Importing And Exporting Cards

The file format used for importing and exporting is a gzipped tar archive
with a \*.car extension (Card ARchive). Each entry in the archive
corresponds to the json representation of a card.

__Importing/Exporting Cards With The Web Client__

To export a card or collection of cards, click the menu button
at the top right of the index page and select the _Export Cards_
menu option. This will export all the cards which satisfy the
active filter options.

To import a card archive (\*.car) click the menu button at the
top right of the index page and select the _Import Cards_ menu
option. This will import the selected \*.car archive.

__Note__: the web import/export interface should only be used for small
batches of cards since large batches can overwhelm the server.
To import/export large batches of cards at a time, use the
command line interface.

__Importing/Exporting Cards With The Command Line Interface__

The command line interface, `notecards_cli.py`, is located in the
scripts directory in the root of the repository. This python script
has no external dependencies and can be executed by any valid python 3.5+
installation. This is the recommended method for importing and exporting
large batches of cards.

Use the `--help` command line option to see up to date usage information.

```console
$ python notecards_cli.py --help

usage: notecards_cli.py [-h] [-s SERVER_URL] [-p PORT] [-u FILE | -d FILE]

Interact with a notecards server from the command line.

optional arguments:
  -h, --help            show this help message and exit
  -s SERVER_URL, --server SERVER_URL
                        The base url for the server to connect to. This should
                        include the scheme. The default is 'http://127.0.0.1'
  -p PORT, --port PORT  The port to access on the server. The default is 8000.
  -u FILE, --upload FILE
                        Upload cards stored in a card archive (*.car file) to
                        the server.
  -d FILE, --download FILE
                        Download cards from the server in to a card archive
                        (*.car).
```

To download cards from a local notecards server:

```console
$ python notecards_cli.py -s http://localhost -p 8000 -d archive.car
```

To upload cards to a local notecards server:

``` console
$ python notecards_cli.py -s http://localhost -p 8000 -u archive.car
```

WARNING: Be careful when importing cards from untrusted sources.
The scripting interface in CGraph is not secure and allows
ill crafted CGraph markdown to have full access to the currently
logged in users notecards account.

## 3rd Party Licenses

The following 3rd party software is included.
Please see their respective directories and/or files for their license terms.

* CodeMirror
* MathJax
* JQuery
* JQuery Mobile
* markdown-it
* smooth-0.1.7.js
* js.cookie.js

