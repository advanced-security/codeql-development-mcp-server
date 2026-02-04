package main

// COMPLIANT: Functions that should not be analyzed
func unrelated1() {
	// No calls
}

// NON_COMPLIANT: Target function for call graph analysis
func targetFunc() {
	unrelated1()
}

func caller1() {
	targetFunc()
}

func caller2() {
	targetFunc()
}
