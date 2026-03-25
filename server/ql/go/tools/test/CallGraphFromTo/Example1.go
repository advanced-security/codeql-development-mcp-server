package callgraphfromto
package main

func unrelated() {
	// No calls
}

func target() {
	unrelated()
}

func intermediate() {
	target()
}

func source() {
	intermediate()
}
