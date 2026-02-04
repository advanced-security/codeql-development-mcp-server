// COMPLIANT: Methods that should not be analyzed
class Example1 {
    void Unrelated1() {
        // No calls
    }

    void Unrelated2() {
        Unrelated1();
    }

    // NON_COMPLIANT: Source method for call graph analysis
    void SourceFunc() {
        Unrelated1();
        Unrelated2();
    }
}
