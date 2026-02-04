// Example1 test case for PrintCFG.ql

// COMPLIANT - Basic control flow for CFG testing
void simpleMethod(int x) {
    int result = 0;
    if (x > 0) {
        result = 1;
    } else {
        result = -1;
    }

    for (int i = 0; i < 3; i++) {
        result = result + i;
    }
}

// NON_COMPLIANT - Function with complex control flow
int complexMethod(int value) {
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
