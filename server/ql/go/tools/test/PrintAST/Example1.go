// Example1 test case for PrintAST.ql
package main

import (
	"fmt"
	"os"
)

type Example1 struct {
	name string
}

func NewExample1(name string) *Example1 {
	if name == "" {
		name = "World"
	}
	return &Example1{name: name}
}

func (e *Example1) demo() {
	numbers := []int{1, 2, 3}

	// For loop
	for i := 0; i < len(numbers); i++ {
		fmt.Println(numbers[i])
	}

	// Range loop
	for _, n := range numbers {
		fmt.Println(n * 2)
	}

	// Struct and string formatting
	person := struct {
		name string
		age  int
	}{e.name, 25}
	fmt.Printf("Hello, %s!\n", person.name)

	// Error handling with defer
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Error occurred")
		}
	}()
}

func helper() string {
	return "Helper"
}

func main() {
	// $Example1

	example := NewExample1("")
	message := "Hello World!"

	if len(os.Args) > 1 {
		example.name = os.Args[1]
	} else {
		fmt.Println(message)
	}

	example.demo()
}
