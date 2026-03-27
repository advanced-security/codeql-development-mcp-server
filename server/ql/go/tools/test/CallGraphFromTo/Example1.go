package main

func unrelated() {
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

func main() {
	source()
}
