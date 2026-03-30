// Example1 test case for PrintAST.ql

struct Example1 {
    name: String,
}

impl Example1 {
    fn new(name: &str) -> Example1 {
        Example1 {
            name: name.to_string(),
        }
    }

    fn greet(&self) -> String {
        format!("Hello, {}!", self.name)
    }
}

fn helper() -> i32 {
    42
}

fn demo(x: i32) {
    let numbers = vec![1, 2, 3];

    // For loop
    for n in &numbers {
        println!("{}", n);
    }

    // If/else
    if x > 0 {
        println!("Positive");
    } else {
        println!("Non-positive");
    }

    // Match expression
    match x {
        0 => println!("Zero"),
        1 => println!("One"),
        _ => println!("Other"),
    }
}

fn main() {
    let example = Example1::new("World");
    println!("{}", example.greet());
    let _result = helper();
    demo(5);
}
