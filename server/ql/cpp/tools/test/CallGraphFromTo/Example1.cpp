void unrelated() {
    // No calls
}

void target() {
    unrelated();
}

void intermediate() {
    target();
}

void source() {
    intermediate();
}
