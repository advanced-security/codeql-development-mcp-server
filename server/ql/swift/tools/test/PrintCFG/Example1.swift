// Example1 test case for PrintCFG.ql

// COMPLIANT - Basic control flow for CFG testing
func simpleMethod(x: Int) {
    var result = 0
    if x > 0 {
        result = 1
    } else {
        result = -1
    }

    for i in 0..<3 {
        result = result + i
    }
}

// NON_COMPLIANT - Function with complex control flow
func complexMethod(value: Int) -> Int {
    var val = value
    if val < 0 {
        return -1
    }

    while val > 10 {
        val = val / 2
    }

    switch val {
    case 0:
        return 0
    case 1:
        return 1
    default:
        return val * 2
    }
}
