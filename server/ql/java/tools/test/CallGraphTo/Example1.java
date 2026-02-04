// COMPLIANT: Methods that should not be analyzed
class Example1 {
    void unrelated1() {
        // No calls
    }

    // NON_COMPLIANT: Target method for call graph analysis
    void targetFunc() {
        unrelated1();
    }

    void caller1() {
        targetFunc();
    }

    void caller2() {
        targetFunc();
    }
}
