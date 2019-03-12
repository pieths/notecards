/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const MarkdownUtils = (function() {

    function addCGraphSupport(md)
    {
        md.use(markdownitContainer, 'cgraph', {

            parseContent: false,

            validate: function(params) {
                return params.trim().match(/^cgraph(\s+\d+)$/);
            },

            render: function (tokens, idx) {
                var m = tokens[idx].info.trim().match(/^cgraph(\s+\d+)$/);

                if (tokens[idx].nesting === 1) {
                    var version = (m[1] !== undefined) ? m[1].trim() : "1";

                    // opening tag
                    return `<div data-content-type="cgraph_${version}">\n${tokens[idx].content}`;

                } else {
                    // closing tag
                    return '</div>\n';
                }
            }
        });
    }

    function addTexDisplayEquationSupport(md)
    {
        md.use(markdownitContainer, 'tex_display_equation', {

            marker: '$',
            parseContent: false,

            validate: function(params) {
                return true;
            },

            render: function (tokens, idx)
            {
                if (tokens[idx].nesting === 1) {
                    // opening tag
                    return `<div class="tex-display-equation-container">\n$$$\n${tokens[idx].content}`;

                } else {
                    // closing tag
                    return ' $$$</div>\n';
                }
            }
        });
    }

    function setAnchorLinksTarget(md)
    {
        // Remember old renderer, if overriden, or proxy to default renderer
        var defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
        };

        md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
            // If you are sure other plugins can't add `target` - drop check below
            var aIndex = tokens[idx].attrIndex('target');

            if (aIndex < 0) {
                tokens[idx].attrPush(['target', '_blank']); // add new attribute
            } else {
                tokens[idx].attrs[aIndex][1] = '_blank';    // replace value of existing attr
            }

            // pass token to default renderer.
            return defaultRender(tokens, idx, options, env, self);
        };
    }

    function setTableClassAttribute(md)
    {
        // Remember old renderer, if overriden, or proxy to default renderer
        var defaultRender = md.renderer.rules.table_open || function(tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
        };

        md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
            // If you are sure other plugins can't add `class` - drop check below
            var aIndex = tokens[idx].attrIndex('class');

            if (aIndex < 0) {
                tokens[idx].attrPush(['class', 'ui-table md-table']); // add new attribute
            } else {
                tokens[idx].attrs[aIndex][1] = 'ui-table md-table';    // replace value of existing attr
            }

            // pass token to default renderer.
            return defaultRender(tokens, idx, options, env, self);
        };
    }

    function getTransformedUrl(url, env)
    {
        if (url.startsWith("@"))
        {
            var key = url.substring(1);

            url = (env.hasOwnProperty("urlMap") &&
                   env.urlMap.hasOwnProperty(key)) ?
                   env.urlMap[key] : "#";
        }

        return url;
    }

    function addImageUrlTransform(md)
    {
        var defaultRender = md.renderer.rules.image;

        md.renderer.rules.image = function (tokens, idx, options, env, self) {
            var token  = tokens[idx];
            var aIndex = token.attrIndex('src');
            var url    = token.attrs[aIndex][1];

            token.attrs[aIndex][1] = getTransformedUrl(url, env);

            // pass token to default renderer.
            return defaultRender(tokens, idx, options, env, self);
        };
    }

    function addAnchorUrlTransform(md)
    {
        // Remember old renderer, if overriden, or proxy to default renderer
        var defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
            return self.renderToken(tokens, idx, options);
        };

        md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
            var token  = tokens[idx];
            var aIndex = token.attrIndex('href');
            var url    = token.attrs[aIndex][1];

            token.attrs[aIndex][1] = getTransformedUrl(url, env);

            // pass token to default renderer.
            return defaultRender(tokens, idx, options, env, self);
        };
    }

    function init()
    {
        var md = window.markdownit()
                 .use(markdownitDeflist)
                 .use(markdownitMathDelimiters);

        addCGraphSupport(md);
        addTexDisplayEquationSupport(md);
        setAnchorLinksTarget(md);
        setTableClassAttribute(md);
        addImageUrlTransform(md);
        addAnchorUrlTransform(md);

        return md;
    }

    /*
     * Return the public API.
     */
    return {
        init: function() { return init(); }
    };
})();

