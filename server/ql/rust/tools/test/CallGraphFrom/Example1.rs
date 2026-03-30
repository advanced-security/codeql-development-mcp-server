// COMPLIANT: Functions that should not be analyzed
fn unrelated1() {
    // No calls
}

fn unrelated2() {
    unrelated1();
}

// NON_COMPLIANT: Source function for call graph analysis
fn source_func() {
    unrelated1();
    unrelated2();
}

fn main() {
    source_func();
}
