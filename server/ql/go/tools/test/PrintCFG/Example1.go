// Example1 test case for PrintCFG.ql
package main

import "fmt"

// COMPLIANT - Basic control flow for CFG testing
func simpleMethod(x int) {
	if x > 0 {
		fmt.Println("Positive")
	} else {
		fmt.Println("Non-positive")
	}

	for i := 0; i < 3; i++ {
		fmt.Println(i)
	}
}

// NON_COMPLIANT - Method with complex control flow
func complexMethod(value int) int {
	if value < 0 {
		return -1
	}

	for value > 10 {
		value = value / 2
	}

	switch value {
	case 0:
		return 0
	case 1:
		return 1
	default:
		return value * 2
	}
}

func main() {
	simpleMethod(5)
	result := complexMethod(20)
	fmt.Println(result)
}
