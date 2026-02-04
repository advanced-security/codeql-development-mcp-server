// Example1 test case for PrintAST.ql

class Example1 {
    constructor(name = "World") {
        this.name = name;
    }
    
    static main(args = []) {
        // $Example1
        
        const example = new Example1();
        let message = "Hello World!";
        
        if (args.length > 0) {
            example.name = args[0];
        } else {
            console.log(message);
        }
        
        example.demo();
    }
    
    demo() {
        const numbers = [1, 2, 3];
        
        // For loop
        for (let i = 0; i < numbers.length; i++) {
            console.log(numbers[i]);
        }
        
        // Array method with arrow function
        numbers.forEach(n => console.log(n * 2));
        
        // Object and template literal
        const person = { name: this.name, age: 25 };
        console.log(`Hello, ${person.name}!`);
        
        // Try-catch
        try {
            const result = 10 / 0;
        } catch (error) {
            console.log("Error occurred");
        }
    }
}

// Function declaration
function helper() {
    return "Helper";
}

// Main execution
if (require.main === module) {
    Example1.main();
}