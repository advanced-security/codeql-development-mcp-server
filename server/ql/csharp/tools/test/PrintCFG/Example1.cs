// Example1 test case for PrintCFG.ql
using System;

public class Example1
{
    public static void Main(string[] args)
    {
        // COMPLIANT - Basic control flow for CFG testing
        int x = 5;

        if (x > 0)
        {
            Console.WriteLine("Positive");
        }
        else
        {
            Console.WriteLine("Non-positive");
        }

        for (int i = 0; i < 3; i++)
        {
            Console.WriteLine(i);
        }
    }

    // NON_COMPLIANT - Method with complex control flow
    public static int ComplexMethod(int value)
    {
        if (value < 0)
        {
            return -1;
        }

        while (value > 10)
        {
            value = value / 2;
        }

        switch (value)
        {
            case 0:
                return 0;
            case 1:
                return 1;
            default:
                return value * 2;
        }
    }
}
