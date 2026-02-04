// Test code for null pointer dereference workshop

// POSITIVE CASE: Direct null dereference
void test_direct_null() {
    int* ptr = nullptr;
    *ptr = 42;  // Should be detected in Exercise 1 and 3
}

// POSITIVE CASE: Null from literal 0
void test_null_zero() {
    int* ptr = 0;
    *ptr = 100;  // Should be detected in Exercise 1 and 3
}

// NEGATIVE CASE: Safe pointer usage
void test_safe_pointer() {
    int value = 42;
    int* ptr = &value;
    *ptr = 100;  // Should be detected in Exercise 1 but NOT in Exercise 3
}

// NEGATIVE CASE: Null check before dereference
void test_with_check() {
    int* ptr = nullptr;
    if (ptr != nullptr) {
        *ptr = 42;  // Should be detected in Exercise 1 but NOT in Exercise 3
    }
}

// EDGE CASE: Multiple dereferences
void test_multiple() {
    int* ptr1 = nullptr;
    int* ptr2 = nullptr;
    *ptr1 = 1;  // Should be detected
    *ptr2 = 2;  // Should be detected
}
