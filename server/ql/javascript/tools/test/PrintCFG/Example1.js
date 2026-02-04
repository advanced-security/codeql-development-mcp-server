// Example1 test case for PrintCFG.ql

// COMPLIANT - Basic control flow for CFG testing
function simpleMethod(x) {
    if (x > 0) {
        console.log("Positive");
    } else {
        console.log("Non-positive");
    }

    for (let i = 0; i < 3; i++) {
        console.log(i);
    }
}

// NON_COMPLIANT - Function with complex control flow
function complexMethod(value) {
    if (value < 0) {
        return -1;
    }

    while (value > 10) {
        value = value / 2;
    }

    switch (value) {
        case 0:
            return 0;
        case 1:
            return 1;
        default:
            return value * 2;
    }
}
