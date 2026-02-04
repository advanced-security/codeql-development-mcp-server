// COMPLIANT: Functions that should not be analyzed
function unrelated1() {
    // No calls
}

function unrelated2() {
    unrelated1();
}

// NON_COMPLIANT: Source function for call graph analysis
function sourceFunc() {
    unrelated1();
    unrelated2();
}
