// Example1 test case for PrintCFG.ql

public class Example1 {
    // COMPLIANT - Basic control flow for CFG testing
    public static void simpleMethod(int x) {
        if (x > 0) {
            System.out.println("Positive");
        } else {
            System.out.println("Non-positive");
        }

        for (int i = 0; i < 3; i++) {
            System.out.println(i);
        }
    }

    // NON_COMPLIANT - Method with complex control flow
    public static int complexMethod(int value) {
        if (value < 0) {
            return -1;
        }

        while (value > 10) {
            value = value / 2;
        }

        switch (value) {
            case 0:
                return 0;
            case 1:
                return 1;
            default:
                return value * 2;
        }
    }
}
