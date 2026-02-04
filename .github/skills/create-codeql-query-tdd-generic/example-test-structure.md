# Example Test Structure

This document shows the expected structure for CodeQL query tests.

## Directory Structure

```
server/ql/{language}/tools/test/{QueryName}/
├── {QueryName}.qlref         # Reference to query being tested
├── test.{ext}                # Test source code
├── {QueryName}.expected      # Expected results
└── {QueryName}.testproj/     # Generated test database (created by extraction)
```

## Example: JavaScript Function Finder

### Directory: `server/ql/javascript/tools/test/FindFunctions/`

#### FindFunctions.qlref

```
src/FindFunctions/FindFunctions.ql
```

#### test.js

```javascript
// Positive case: Function declaration
function myFunction() {
  return 42;
}

// Positive case: Arrow function
const myArrow = () => 42;

// Negative case: Variable declaration (not a function)
const myVar = 42;

// Edge case: Anonymous function
const myAnon = function () {
  return 42;
};
```

#### FindFunctions.expected

```
| file    | line | col | endLine | endCol | message                |
| test.js | 2    | 1   | 4       | 2      | Function: myFunction   |
| test.js | 7    | 16  | 7       | 27     | Function: myArrow      |
| test.js | 13   | 16  | 15      | 2      | Function: myAnon       |
```

## Expected File Format

The `.expected` file must:

- Start with a header row defining columns
- Use `|` as column separator
- Include columns: `file`, `line`, `col`, `endLine`, `endCol`, `message`
- List each expected match on a new row
- Use consistent spacing for readability
