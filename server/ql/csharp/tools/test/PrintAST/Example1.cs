// Example1 test case for PrintAST.ql
using System;

public class Example1
{
    // Field and constant
    private static readonly string[] Greetings = { "Hello", "Hi" };
    private int counter = 0;

    // Property
    public string Name { get; set; } = "World";

    public static void Main(string[] args)
    {
        // $Example1
        
        // Variable declarations
        var example = new Example1();
        string message = "Hello World!";
        int length = message.Length;
        bool isLong = length > 10;
        
        // Conditional statement
        if (args.Length > 0)
        {
            example.Name = args[0];
        }
        else
        {
            Console.WriteLine(message);
        }

        // Switch statement
        switch (DateTime.Now.DayOfWeek)
        {
            case DayOfWeek.Monday:
                Console.WriteLine("Monday");
                break;
            default:
                Console.WriteLine("Other day");
                break;
        }

        // Method call
        example.DemoLoops();
        
        // Array and character processing
        char[] letters = new char[3];
        int count = 0;
        for (int i = 0; i < message.Length && count < 3; i++)
        {
            char c = message[i];
            if (char.IsLetter(c))
            {
                letters[count] = char.ToUpper(c);
                count++;
            }
        }
        
        // Ternary operator
        string result = count > 0 ? 
            "Found letters" : 
            "No letters";
        
        Console.WriteLine(result);
        
        // Exception handling
        try
        {
            int divisor = args.Length == 0 ? 1 : 0;
            int division = 10 / divisor;
        }
        catch (DivideByZeroException ex)
        {
            Console.WriteLine("Error: " + ex.Message);
        }
    }

    // Instance method
    private void DemoLoops()
    {
        int[] numbers = { 1, 2, 3 };
        
        // For loop
        for (int i = 0; i < numbers.Length; i++)
        {
            Console.Write(numbers[i] + " ");
        }
        Console.WriteLine();

        // Foreach loop
        foreach (int num in numbers)
        {
            Console.Write(num * 2 + " ");
        }
        Console.WriteLine();

        // While loop
        int index = 0;
        while (index < 2)
        {
            Console.Write(index);
            index++;
        }
        Console.WriteLine();

        // Do-while loop
        do
        {
            counter++;
            Console.Write(counter);
        } while (counter < 2);
        Console.WriteLine();
        
        // Array processing
        for (int i = 0; i < Greetings.Length; i++)
        {
            string greeting = Greetings[i];
            string fullGreeting = greeting + ", " + Name + "!";
            
            // Unary and binary operations
            int greetingLength = greeting.Length;
            greetingLength++; 
            bool isEven = (greetingLength % 2) == 0;
            
            // Logical operations
            if (isEven && greetingLength > 3)
            {
                Console.WriteLine("Long: " + fullGreeting);
            }
            else
            {
                Console.WriteLine(fullGreeting);
            }
        }
    }
}
