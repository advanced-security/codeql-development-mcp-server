// COMPLIANT: Functions that should not be analyzed
func unrelated1() {
    // No calls
}

func unrelated2() {
    unrelated1()
}

// NON_COMPLIANT: Source function for call graph analysis
func sourceFunc() {
    unrelated1()
    unrelated2()
}
