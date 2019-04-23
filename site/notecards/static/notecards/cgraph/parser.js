/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const DELIMITED_BLOCKS_START_VALUE = 20;

const TYPE_UNKNOWN = 0;
const TYPE_TEXT = 1;
const TYPE_COMMAND_BOUNDARY = 2;
const TYPE_LINE_CONTINUATION = 3;
const TYPE_SCRIPT_SHORTHAND = 4;
const TYPE_GROUP_SCRIPT_SHORTHAND = 5;
const TYPE_INPUT_END = 6;
const TYPE_GROUP = DELIMITED_BLOCKS_START_VALUE;
const TYPE_STRING = DELIMITED_BLOCKS_START_VALUE + 1;
const TYPE_SCRIPT = DELIMITED_BLOCKS_START_VALUE + 2;
const TYPE_GROUP_SCRIPT = DELIMITED_BLOCKS_START_VALUE + 3;


function List()
{
    let head = null;
    let tail = null;

    this.getHead = () => head;
    this.getTail = () => tail;

    this.append = function(type, value)
    {
        if (type == TYPE_LINE_CONTINUATION)
        {
            type = TYPE_TEXT;
            value = ' ';
        }
        else if (type == TYPE_SCRIPT_SHORTHAND)
        {
            type = TYPE_SCRIPT;

            if (value.charAt(0) == '=')
                value = "=$." + value.substring(1);
            else value = "$." + value.substring(1);
        }
        else if (type == TYPE_GROUP_SCRIPT_SHORTHAND)
        {
            type = TYPE_GROUP_SCRIPT;

            if (value.charAt(0) == '=')
                value = "=$." + value.substring(1);
            else value = "$." + value.substring(1);
        }

        let node = {data: {type: type, value: value}, prev: null, next: null};
        if (head == null)
        {
            head = node;
            tail = node;
        }
        else
        {
            if ((type == TYPE_TEXT) &&
                (tail.data.type == TYPE_TEXT))
            {
                tail.data.value += value;
            }
            else
            {
                tail.next = node;
                node.prev = tail;
                tail = node;
            }
        }
    };

    this.trimEnd = function(type)
    {
        if (head == null) return;
        else if (tail.data.type == type)
        {
            if (tail.prev == null)
            {
                head = null;
                tail = null;
            }
            else
            {
                tail.prev.next = null;
                tail = tail.prev;
            }
        }
    }

    function Iterator(node)
    {
        let current = node;

        this.getNode = () => { return current; }
        this.getData = () => { return current.data; }
        this.advance = () => { if (current) current = current.next; }
        this.atEnd = () => { return (current === null); }
        this.clone = () => { return new Iterator(current); }
        this.equals = (other) => { return (current == other.getNode()); }
        this.remove = () => {
            if (current.prev === null)
            {
                head = current.next;
                if (tail == current) tail = null;
                else head.prev = null;
                current = current.next;
            }
            else if (current.next === null)
            {
                tail = tail.prev;
                tail.next = null;
                current = null;
            }
            else
            {
                current.prev.next = current.next;
                current.next.prev = current.prev;
                current = current.next;

                this.mergeIfRequired();
            }
        }

        /* Replace the current node with the passed in list */
        this.replaceWithList = (list) => {
            let otherHead = list.getHead();
            let otherTail = list.getTail();

            if (current === null) return;

            if (list.isEmpty())
            {
                this.remove();
            }
            else
            {
                /*
                 * Insert the list after the current node.
                 * Then cleanup the end points.
                 */

                let next = current.next;
                current.next = otherHead;
                otherHead.prev = current;
                otherTail.next = next;

                if (next === null) tail = otherTail;
                else
                {
                    next.prev = otherTail;
                    new Iterator(next).mergeIfRequired();
                }

                this.remove();
                list.clear();
            }
        }

        this.mergeIfRequired = () => {
            let prevType = current.prev.data.type;
            let typesMatch = (current.data.type === prevType);

            if (typesMatch &&
                ((prevType == TYPE_TEXT) ||
                 (prevType == TYPE_COMMAND_BOUNDARY)))
            {
                current.prev.data.value += current.data.value;
                this.remove();
            }
        }
    }

    this.getIterator = function() { return new Iterator(head); }
    this.isEmpty = function() { return (head === null); }
    this.clear = function() { head = null; tail = null; }
}


let isEOLChar = ch => ((ch == "\r") || (ch == "\n"));
let isWhiteSpace = ch => ((ch == " ") || (ch == "\n") || (ch == "\r") || (ch == "\t"));


function parse(input)
{
    let i = 0;
    let start = 0;
    let list = new List();
    let ch = input.charAt(i);
    let delimCount = 0;
    let delimStack = [];

    if (input == "") return list;

    let type = TYPE_UNKNOWN;
    let newType = TYPE_UNKNOWN;

    let checkForDelimiter = (ch, open, close, newTypeArg) =>
    {
        if (newTypeArg === undefined) newTypeArg = TYPE_UNKNOWN;

        if (ch == close)
        {
            if (delimCount == 0) newType = newTypeArg;
            else delimCount--;
        }
        else if (ch == open) delimCount++;
    };

    let checkForAllDelimiters = ch =>
    {
        let top = delimStack[delimStack.length - 1];

        if (top == '"')
        {
            if (ch == '"') delimStack.pop();
        }
        else if (top == "'")
        {
            if (ch == "'") delimStack.pop();
        }
        else if (top == "`")
        {
            if (ch == "`") delimStack.pop();
        }
        else
        {
            if ((ch == ')') && (top == '(')) delimStack.pop();
            else if ((ch == ']') && (top == '[')) delimStack.pop();
            else if ((ch == '}') && (top == '{')) delimStack.pop();
            else if ("([{\"'`".includes(ch)) delimStack.push(ch);
        }
    };

    let peek = () => input.charAt(i + 1);
    let prev = () => input.charAt(i - 1);


    while (type != TYPE_INPUT_END)
    {
        /* Given a type and a ch, determine the new type */

        if (ch == "") newType = TYPE_INPUT_END;
        else if (type == TYPE_GROUP)
        {
            if (ch == ')') newType = TYPE_UNKNOWN;
            else if (ch == '{') newType = TYPE_GROUP_SCRIPT;
            else if (((ch == '$') || (ch == '=')) &&
                     ((i == start) || isWhiteSpace(prev())) &&
                     !isWhiteSpace(peek())) newType = TYPE_GROUP_SCRIPT_SHORTHAND;
        }
        else if (type == TYPE_STRING) checkForDelimiter(ch, '"', '"');
        else if (type == TYPE_SCRIPT) checkForDelimiter(ch, '{', '}');
        else if (type == TYPE_GROUP_SCRIPT) checkForDelimiter(ch, '{', '}', TYPE_GROUP);
        else if (type == TYPE_SCRIPT_SHORTHAND)
        {
            if (delimStack.length == 0)
            {
                if (isWhiteSpace(ch))
                    newType = isEOLChar(ch) ? TYPE_COMMAND_BOUNDARY : TYPE_TEXT;
                else if (ch == ';') newType = TYPE_COMMAND_BOUNDARY;
                else if ("([{\"'`".includes(ch)) delimStack.push(ch);
            }
            else checkForAllDelimiters(ch);
        }
        else if (type == TYPE_GROUP_SCRIPT_SHORTHAND)
        {
            if (delimStack.length == 0)
            {
                if (isWhiteSpace(ch)) newType = TYPE_GROUP;
                else if (ch == ')') newType = TYPE_UNKNOWN;
                else if ("([{\"'`".includes(ch)) delimStack.push(ch);
            }
            else checkForAllDelimiters(ch);
        }
        else if ((type == TYPE_UNKNOWN) ||
                 (type == TYPE_TEXT) ||
                 (type == TYPE_COMMAND_BOUNDARY) ||
                 (type == TYPE_LINE_CONTINUATION))
        {
            if ((type == TYPE_LINE_CONTINUATION) && isEOLChar(ch)) { }
            else if (ch == '(') newType = TYPE_GROUP;
            else if (ch == '"') newType = TYPE_STRING;
            else if (ch == '{') newType = TYPE_SCRIPT;
            else if (isEOLChar(ch) || (ch == ';')) newType = TYPE_COMMAND_BOUNDARY;
            else if ((ch == "\\") && isEOLChar(peek())) newType = TYPE_LINE_CONTINUATION;
            else if (((ch == '$') || (ch == '=')) &&
                     ((type != TYPE_TEXT) || isWhiteSpace(prev())) &&
                     !isWhiteSpace(peek())) newType = TYPE_SCRIPT_SHORTHAND;
            else newType = TYPE_TEXT;
        }

        /* Process any type changes or end of inputs */

        if (newType == TYPE_INPUT_END)
        {
            if ((type == TYPE_GROUP_SCRIPT) ||
                (type == TYPE_GROUP_SCRIPT_SHORTHAND))
            {
                list.append(type, input.substring(start, i));
                list.append(TYPE_GROUP, '');
                type = TYPE_GROUP;
            }
            else if (type != TYPE_UNKNOWN)
            {
                list.append(type, input.substring(start, i));
            }

            if (type != TYPE_COMMAND_BOUNDARY)
                list.append(TYPE_COMMAND_BOUNDARY, '');

            type = TYPE_INPUT_END;
        }
        else if (newType != type)
        {
            if (type != TYPE_UNKNOWN)
            {
                list.append(type, input.substring(start, i));
            }

            if (type == TYPE_GROUP_SCRIPT_SHORTHAND)
            {
                if (newType == TYPE_UNKNOWN)
                {
                    list.append(TYPE_GROUP, '');
                    start = i + 1;
                }
                else if (newType == TYPE_GROUP) start = i;
            }
            else if (newType >= DELIMITED_BLOCKS_START_VALUE)
            {
                start = i + 1;
            }
            else start = i;

            type = newType;
        }

        ch = input.charAt(++i);
    }

    return list;
}


export const parser = {
    parse: function(input) { return parse(input); },

    TYPE_TEXT: TYPE_TEXT,
    TYPE_COMMAND_BOUNDARY: TYPE_COMMAND_BOUNDARY,
    TYPE_GROUP: TYPE_GROUP,
    TYPE_STRING: TYPE_STRING,
    TYPE_SCRIPT: TYPE_SCRIPT,
    TYPE_GROUP_SCRIPT: TYPE_GROUP_SCRIPT,
};

