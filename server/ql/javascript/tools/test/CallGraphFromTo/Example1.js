function unrelated() {
    // No calls
}

function target() {
    unrelated();
}

function intermediate() {
    target();
}

function source() {
    intermediate();
}
