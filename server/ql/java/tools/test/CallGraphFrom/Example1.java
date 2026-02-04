// COMPLIANT: Methods that should not be analyzed
class Example1 {
    void unrelated1() {
        // No calls
    }

    void unrelated2() {
        unrelated1();
    }

    // NON_COMPLIANT: Source method for call graph analysis
    void sourceFunc() {
        unrelated1();
        unrelated2();
    }
}
