// Example1 test case for PrintCFG.ql

// COMPLIANT - Basic control flow for CFG testing
fn simple_function(x: i32) {
    if x > 0 {
        println!("Positive");
    } else {
        println!("Non-positive");
    }

    for i in 0..3 {
        println!("{}", i);
    }
}

// NON_COMPLIANT - Function with complex control flow
fn complex_function(value: i32) -> i32 {
    if value < 0 {
        return -1;
    }

    let mut val = value;
    while val > 10 {
        val = val / 2;
    }

    match val {
        0 => 0,
        1 => 1,
        _ => val * 2,
    }
}

fn main() {
    simple_function(5);
    let result = complex_function(20);
    println!("{}", result);
}
