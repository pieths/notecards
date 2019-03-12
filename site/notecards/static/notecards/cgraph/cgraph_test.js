/* Copyright (c) 2019, Piet Hein Schouten. All rights reserved.
 * Licensed under the terms of the MIT license.
 */

const cgraphTester = (function() {

    const STATE_UNINITIALIZED = 0;
    const STATE_INITIALIZING = 1;
    const STATE_INITIALIZED = 2;

    var state = STATE_UNINITIALIZED;


    function testParse(testObject, logger)
    {
        var stats = { passes: 0, failures: 0 };

        let createErrorString = (result, expectedResult) => {
            let string = "Result:\n[";

            for (var i=0; i < result.length; i++)
            {
                let value = result[i].value.replace("\t", "\\t");
                value = value.replace(/\r/g, "\\r");
                value = value.replace(/\n/g, "\\n");
                string += `\ttype: "${result[i].type}", value: "${value}"\n`;
            }

            string += "]\n\nExpected Result:\n[";

            for (var i=0; i < expectedResult.length; i++)
            {
                let value = expectedResult[i].value.replace("\t", "\\t");
                value = value.replace(/\r/g, "\\r");
                value = value.replace(/\n/g, "\\n");
                string += `\ttype: "${expectedResult[i].type}", value: "${value}"\n`;
            }

            string += "]\n";
            return string;
        };

        let test = (description, input, expectedResult) =>
        {
            let passed = true;

            description = description.replace(/\s{2,}/g, " ");
            description += '\n';

            logger.log("RUNNING TEST: " + description);

            let result = testObject.parser.parse(input);

            if (result.length != expectedResult.length)
            {
                passed = false;
                logger.error(createErrorString(result, expectedResult));
            }
            else
            {
                for (var i=0; i < result.length; i++)
                {
                    if ((result[i].type  != expectedResult[i].type) ||
                        (result[i].value != expectedResult[i].value))
                    {
                        passed = false;
                        logger.error(createErrorString(result, expectedResult));
                        break;
                    }
                }
            }

            if (passed) stats.passes++;
            else stats.failures++;
        }

        test(`Empty input should return empty array.`,

             "",
             []);

        test(`Input containing only whitespace should return the whitespace
              followed by command boundaries.`,

             "  \t   \n  \n\r\n ",
             [
                 {type: 'unknown', value: '  \t   '},
                 {type: 'command_boundary', value: '\n'},
                 {type: 'unknown', value: '  '},
                 {type: 'command_boundary', value: '\n\r\n'},
                 {type: 'unknown', value: ' '},
                 {type: 'command_boundary', value: ''}
             ]);

        /*
         * LINE CONTINUATION TESTS
         */

        test(`A command statement can be continued on the next line by placing
              a backslash '\' immediately at the end of the line. The backslash
              and end of line characters following it are replaced with a single
              space character.`,

             "a\\\r\nb\\\rc\\\nd",
             [
                 {type: 'unknown', value: 'a b c d'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Line continuation with '\' is greedy. It consumes all end of line
              characters until it finds a character which is not an end of line
              character.`,

             "a\\\r\n\n\n\n\n\r\r\r\n\n\r\n\r\n\r\nb",
             [
                 {type: 'unknown', value: 'a b'},
                 {type: 'command_boundary', value: ''}
             ]);

        /*
         * UNKNOWN TESTS
         */

        test(`White space is considered part of an unknown block and is
              passed through as is.`,

             " a b\tc    d \t",
             [
                 {type: 'unknown', value: ' a b\tc    d \t'},
                 {type: 'command_boundary', value: ''}
             ]);

        /*
         * COMMAND BOUNDARY TESTS
         */

        test(`Command boundaries are delimited by new lines, carriage returns,
              semicolons and the end of the input.`,

             "a;b\nc\r\nd",
             [
                 {type: 'unknown', value: 'a'},
                 {type: 'command_boundary', value: ';'},
                 {type: 'unknown', value: 'b'},
                 {type: 'command_boundary', value: '\n'},
                 {type: 'unknown', value: 'c'},
                 {type: 'command_boundary', value: '\r\n'},
                 {type: 'unknown', value: 'd'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`There should only be one final command boundary if input ends
              in new line.`,

             "a\n",
             [
                 {type: 'unknown', value: 'a'},
                 {type: 'command_boundary', value: '\n'}
             ]);

        test(`There should only be one final command boundary if input ends
              in carriage return and new line.`,

             "a\r\n",
             [
                 {type: 'unknown', value: 'a'},
                 {type: 'command_boundary', value: '\r\n'}
             ]);

        test(`There should only be one final command boundary if input ends
              in semicolon.`,

             "a;",
             [
                 {type: 'unknown', value: 'a'},
                 {type: 'command_boundary', value: ';'}
             ]);

        /*
         * GROUP TESTS
         */

        test(`A group is delimited by open and close parenthesis ( ).`,

             "a (group of characters)",
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'group', value: 'group of characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Command boundary characters have no special meaning inside of groups.`,

             'a (group; of\n characters\r\n)',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'group', value: 'group; of\n characters\r\n'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Script or string delimiters have no special meaning inside of groups.`,

             'a ("group" of {characters})',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'group', value: '"group" of {characters}'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Consecutive groups do not get combined in to a single group.`,

             'a (group)(of) characters',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'group', value: 'group'},
                 {type: 'group', value: 'of'},
                 {type: 'unknown', value: ' characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`If a group is not closed by the end of the input then it is automatically closed.`,

             'this (group of characters',
             [
                 {type: 'unknown', value: 'this '},
                 {type: 'group', value: 'group of characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        /*
         * STRING TESTS
         */

        test(`A string is delimited by quotes (").`,

             'a "string of characters"',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'string', value: 'string of characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Command boundary characters have no special meaning inside of strings.`,

             'a "string; of\n characters\r\n"',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'string', value: 'string; of\n characters\r\n'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Script or group delimiters have no special meaning inside of strings.`,

             'a "(string) of {characters}"',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'string', value: '(string) of {characters}'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Consecutive strings do not get combined in to a single string.`,

             'a "string""of" characters',
             [
                 {type: 'unknown', value: 'a '},
                 {type: 'string', value: 'string'},
                 {type: 'string', value: 'of'},
                 {type: 'unknown', value: ' characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`If a string is not closed by the end of the input then it is automatically closed.`,

             'this "string of characters',
             [
                 {type: 'unknown', value: 'this '},
                 {type: 'string', value: 'string of characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        /*
         * SCRIPT TESTS
         */

        test(`A script block is delimited by curly braces { }.`,

             'a {b=3; return b + 1}',
             [
                 {type: 'unknown', value: 'a 4'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`An empty script block is replaced with nothing.`,

             'a{}b',
             [
                 {type: 'unknown', value: 'ab'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Command boundary characters have no special meaning inside of scripts.`,

             'a {a=1; b=2;\n c=3;\r\n return a + b + c;\n}',
             [
                 {type: 'unknown', value: 'a 6'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`String or group delimiters have no special meaning inside of scripts.`,

             'a {a=3; b="this"; if (a >= 3) b = "that"; return b}',
             [
                 {type: 'unknown', value: 'a that'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A command boundary after a command boundary at the end of a script return
              value should only result in one command bounday.`,

             'a {return `one\n`};two',
             [
                 {type: 'unknown', value: 'a one'},
                 {type: 'command_boundary', value: '\n;'},
                 {type: 'unknown', value: 'two'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Test script at the end of the input string.`,

             'a {return `one`}',
             [
                 {type: 'unknown', value: 'a one'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`If a script starts with an equal sign then the remaining characters
              are seen as the expression which is to be evaluated and returned. In
              other words, an equal sign at the start of a script is replaced with
              a return string before the script is evaluated.`,

             'a {=`one`}',
             [
                 {type: 'unknown', value: 'a one'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A script without a return value should add no characters to the input stream.`,

             'a this{b=1}that',
             [
                 {type: 'unknown', value: 'a thisthat'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A script return value is specified with either "return [expression]" any where
              in the script or by starting the script with an equal sign.`,

             '{a=5; b=6; c=7} a:{return a} b:{=b} c:{c}',
             [
                 {type: 'unknown', value: ' a:5 b:6 c:'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`The return value of a script is substituted inplace of the script verbatim.`,

             'a {d="three"; return `one`},two,{=d}',
             [
                 {type: 'unknown', value: 'a one,two,three'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A script can output strings and groups`,

             'a {a=`"two"`; b = "(three)"} test {=b}and{=a}',
             [
                 {type: 'unknown', value: 'a  test '},
                 {type: 'group', value: 'three'},
                 {type: 'unknown', value: 'and'},
                 {type: 'string', value: 'two'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Scripts can be nested. Their values are processed in the order that
              they are encountered.`,

             'test {=`(one) {="(2) {=3}"}`} four',
             [
                 {type: 'unknown', value: 'test '},
                 {type: 'group', value: 'one'},
                 {type: 'unknown', value: ' '},
                 {type: 'group', value: '2'},
                 {type: 'unknown', value: ' 3 four'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`Variable assignments and declarations which are prefixed with var,
              let or const  are local to the script and can not be accessed from
              other scripts. Each script block is run as a Function body.`,

             '{a=10; b=11; c=12;} {var a=13; let b=14; const c=15; return `${a}${b}${c}`} {=`${a}${b}${c}`}',
             [
                 {type: 'unknown', value: ' 131415 101112'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`If a script block is not closed by the end of the input then it is not executed
              and it is replaced with an unknown block with an empty string as its value.`,

             '{a=0; b=1; return a + b;',
             [
                 {type: 'unknown', value: ''},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A group which is started in a script continues past the script.`,

             'this {="(group of"} characters)',
             [
                 {type: 'unknown', value: 'this '},
                 {type: 'group', value: 'group of characters'},
                 {type: 'command_boundary', value: ''}
             ]);

        test(`A string which is started in a script continues past the script.`,

             'this {=`"string of`} characters" more text',
             [
                 {type: 'unknown', value: 'this '},
                 {type: 'string', value: 'string of characters'},
                 {type: 'unknown', value: ' more text'},
                 {type: 'command_boundary', value: ''}
             ]);


        logger.log("Completed testing parser.parse");
        logger.log(`Passes:   ${stats.passes}`);
        logger.log(`Failures: ${stats.failures}`);
    }

    function runTests(logger)
    {
        if (state === STATE_UNINITIALIZED)
        {
            state = STATE_INITIALIZING;

            CGraph.init("./", () => {
                state = STATE_INITIALIZED;
                runTests(logger);
            });
        }
        else if (state === STATE_INITIALIZED)
        {
            let testObject = CGraph.getTestObject();

            testParse(testObject, logger);
        }
    }

    return {
        runTests: function(logger) { runTests(logger); }
    };
})();

