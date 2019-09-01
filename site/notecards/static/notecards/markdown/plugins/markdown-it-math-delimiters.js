/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.markdownitMathDelimiters = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){

'use strict';

function asciimath_delimiter(state, silent)
{
    var found = false,
        content,
        token,
        pos,
        max = state.posMax,
        start = state.pos;

    if (state.src.charCodeAt(start) !== 0x24 /* $ */ ||
        state.src.charCodeAt(start + 1) !== 0x5b /* [ */) { return false; }
    if (silent) { return false; } // don't run any pairs in validation mode
    if (start + 4 >= max) { return false; }

    start = start + 2;
    pos = start;

    while ((pos = state.src.indexOf(']', pos)) != -1)
    {
        if (state.src.charCodeAt(pos+1) === 0x24 /* $ */)
        {
            found = true;
            break;
        }

        pos++;
    }

    if (!found) return false;

    content = state.src.slice(start, pos);

    if (content.length > 0)
    {
        token         = state.push('asciimath_delimiter_open', 'span', 1);
        token.markup  = '$[';
        token.content = content;

        token         = state.push('asciimath_delimiter_close', 'span', -1);
        token.markup  = ']$';
    }

    state.pos = pos + 2;
    return true;
}


function render_asciimath(tokens, idx, _options, env, self)
{
    if (tokens[idx].nesting === 1)
    {
        return `<span class="asciimath-container">$[${tokens[idx].content}]$`;
    }
    else
    {
        return '</span>';
    }
}


function texinline_delimiter(state, silent)
{
    var found = false,
        content,
        token,
        pos,
        max = state.posMax,
        start = state.pos;

    if (state.src.charCodeAt(start) !== 0x24 /* $ */ ||
        state.src.charCodeAt(start + 1) !== 0x24 /* $ */) { return false; }
    if (silent) { return false; } // don't run any pairs in validation mode
    if (start + 4 >= max) { return false; }

    start = start + 2;
    pos = start;

    while ((pos = state.src.indexOf('$', pos)) != -1)
    {
        if (state.src.charCodeAt(pos+1) === 0x24 /* $ */)
        {
            found = true;
            break;
        }

        pos++;
    }

    if (!found) return false;

    content = state.src.slice(start, pos);

    if (content.length > 0)
    {
        token         = state.push('texinline_delimiter_open', 'span', 1);
        token.markup  = '$$';
        token.content = content;

        token         = state.push('texinline_delimiter_close', 'span', -1);
        token.markup  = '$$';
    }

    state.pos = pos + 2;
    return true;
}


function render_texinline(tokens, idx, _options, env, self)
{
    if (tokens[idx].nesting === 1)
    {
        return '<span class="tex-inline-equation-container">$$ ' + tokens[idx].content + ' $$';
    }
    else
    {
        return '</span>';
    }
}


module.exports = function math_delimiters_plugin(md)
{
    md.inline.ruler.after('emphasis', 'asciimath_delimiter', asciimath_delimiter);
    md.renderer.rules['asciimath_delimiter_open'] = render_asciimath;
    md.renderer.rules['asciimath_delimiter_close'] = render_asciimath;

    md.inline.ruler.after('asciimath_delimiter', 'texinline_delimiter', texinline_delimiter);
    md.renderer.rules['texinline_delimiter_open'] = render_texinline;
    md.renderer.rules['texinline_delimiter_close'] = render_texinline;
};

},{}]},{},[1])(1)
});
