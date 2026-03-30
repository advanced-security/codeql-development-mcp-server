// COMPLIANT: Functions that should not be analyzed
fn unrelated1() {
    // No calls
}

// NON_COMPLIANT: Target function for call graph analysis
fn target_func() {
    unrelated1();
}

fn caller1() {
    target_func();
}

fn caller2() {
    target_func();
}

fn main() {
    caller1();
    caller2();
}
