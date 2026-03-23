class Example1 {
    void Unrelated() {
        // No calls
    }

    void Target() {
        Unrelated();
    }

    void Intermediate() {
        Target();
    }

    void Source() {
        Intermediate();
    }
}
