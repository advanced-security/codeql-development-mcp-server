fn unrelated() {
    // No calls
}

fn target() {
    unrelated();
}

fn intermediate() {
    target();
}

fn source() {
    intermediate();
}

fn main() {
    source();
}
