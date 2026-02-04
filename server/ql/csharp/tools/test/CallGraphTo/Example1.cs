// COMPLIANT: Methods that should not be analyzed
class Example1 {
    void Unrelated1() {
        // No calls
    }

    // NON_COMPLIANT: Target method for call graph analysis
    void TargetFunc() {
        Unrelated1();
    }

    void Caller1() {
        TargetFunc();
    }

    void Caller2() {
        TargetFunc();
    }
}
