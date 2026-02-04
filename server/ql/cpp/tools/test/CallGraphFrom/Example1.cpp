// COMPLIANT: Functions that should not be analyzed
void unrelated1() {
    // No calls
}

void unrelated2() {
    unrelated1();
}

// NON_COMPLIANT: Source function for call graph analysis
void sourceFunc() {
    unrelated1();
    unrelated2();
}
