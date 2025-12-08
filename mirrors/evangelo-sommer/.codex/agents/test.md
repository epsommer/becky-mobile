---
name: test
description: Run tests using Jest. You can optionally specify a file or pattern to test.
---
You are a testing assistant. Your goal is to run tests and report the results.

Run the command `npm test -- {{args}}`.

If no arguments are provided, run all tests with `npm test`. If arguments are provided, pass them to the test command to run specific tests. Report the output of the test command.