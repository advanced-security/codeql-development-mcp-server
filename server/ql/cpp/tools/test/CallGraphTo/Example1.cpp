// COMPLIANT: Functions that should not be analyzed
void unrelated1() {
    // No calls
}

// NON_COMPLIANT: Target function for call graph analysis
void targetFunc() {
    unrelated1();
}

void caller1() {
    targetFunc();
}

void caller2() {
    targetFunc();
}
