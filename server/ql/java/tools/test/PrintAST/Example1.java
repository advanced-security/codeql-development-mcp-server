// Example1 test case for PrintAST.ql

import java.util.Arrays;
import java.util.List;

public class Example1 {
    private String name;
    
    public Example1() {
        this("World");
    }
    
    public Example1(String name) {
        this.name = name;
    }
    
    public static void main(String[] args) {
        // $Example1
        
        Example1 example = new Example1();
        String message = "Hello World!";
        
        if (args.length > 0) {
            example.name = args[0];
        } else {
            System.out.println(message);
        }
        
        example.demo();
    }
    
    public void demo() {
        List<Integer> numbers = Arrays.asList(1, 2, 3);
        
        // For loop
        for (int i = 0; i < numbers.size(); i++) {
            System.out.println(numbers.get(i));
        }
        
        // Enhanced for loop
        for (int n : numbers) {
            System.out.println(n * 2);
        }
        
        // Stream with lambda
        numbers.stream().forEach(n -> System.out.println(n * 3));
        
        // Object creation and string formatting
        Person person = new Person(this.name, 25);
        System.out.printf("Hello, %s (age %d)!%n", person.getName(), person.getAge());
        
        // Try-catch
        try {
            int result = 10 / 0;
            System.out.println(result);
        } catch (ArithmeticException e) {
            System.out.println("Error occurred");
        }
    }
    
    private static class Person {
        private String name;
        private int age;
        
        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }
        
        public String getName() {
            return name;
        }
        
        public int getAge() {
            return age;
        }
    }
    
    public static String helper() {
        return "Helper";
    }
}
