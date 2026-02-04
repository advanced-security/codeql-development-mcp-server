// COMPLIANT: Functions that should not be analyzed
function unrelated1() {
    // No calls
}

function caller1() {
    targetFunc();
}

function caller2() {
    targetFunc();
}

// NON_COMPLIANT: Target function for call graph analysis
function targetFunc() {
    unrelated1();
}
