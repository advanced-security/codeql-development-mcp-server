import java.io.IOException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * JUnit 5 (Jupiter) test cases demonstrating compliant and non-compliant 
 * exception testing patterns.
 */
public class JUnit5_Test {
    
    // =================================================================
    // COMPLIANT CASES: Each test method tests one method invocation
    // for a single expected exception type
    // =================================================================
    
    public class CompliantCases {
        /**
         * COMPLIANT: Single method call in try-catch block
         */
        @Test
        public void testCompliant1() {
            ExampleClass example = new ExampleClass();
            try {
                int negative = -1;
                example.exceptionOnNegative(negative); // COMPLIANT
            } catch (IOException e) {
                System.out.println(e);
            }
        }

        /**
         * COMPLIANT: Single method call in assertThrows lambda
         */
        @Test
        public void testCompliant2() {
            ExampleClass example = new ExampleClass();
            int negative = -1;
            Assertions.assertThrows(
                IOException.class,
                () -> example.exceptionOnNotZero(negative) // COMPLIANT
            );
        }

        /**
         * COMPLIANT: Single method call in assertThrows lambda
         */
        @Test
        public void testCompliant3() {
            ExampleClass example = new ExampleClass();
            int negative = -1;
            Assertions.assertThrows(
                IOException.class,
                () -> example.exceptionOnNegative(negative) // COMPLIANT
            );
        }

        /**
         * COMPLIANT: Single method call in assertThrows lambda
         */
        @Test
        public void testCompliant4() {
            ExampleClass example = new ExampleClass();
            int positive = 1;
            Assertions.assertThrows(
                IOException.class,
                () -> example.exceptionOnPositive(positive) // COMPLIANT
            );
        }
    }

    // =================================================================
    // NON-COMPLIANT CASES: Multiple method invocations in same test
    // assertion that could throw the same checked exception
    // =================================================================
    
    public class NonCompliantCases {
        /**
         * NON-COMPLIANT: Nested method calls in assertThrows lambda
         * Both exceptionOnNotZero and exceptionOnNegative can throw IOException
         */
        @Test
        public void testNonCompliant1() {
            ExampleClass example = new ExampleClass();
            int negative = -1;
            Assertions.assertThrows(
                IOException.class,
                () -> example.exceptionOnNotZero(example.exceptionOnNegative(negative)) // NON_COMPLIANT
            );
        }

        /**
         * NON-COMPLIANT: Multiple method calls in same try block with fail()
         * Both methods can throw IOException, so test is ambiguous
         */
        @Test
        public void testNonCompliant2() {
            ExampleClass example = new ExampleClass();
            try {
                int negative = -1;
                int positive = 1;
                example.exceptionOnNegative(negative); // NON_COMPLIANT
                example.exceptionOnNotZero(positive); // NON_COMPLIANT
                Assertions.fail("Expected an IOException to be thrown");
            } catch (IOException e) {
                System.out.println(e);
            }
        }

        /**
         * NON-COMPLIANT: Nested method calls in try block with fail()
         */
        @Test
        public void testNonCompliant3() {
            ExampleClass example = new ExampleClass();
            try {
                int negative = -1;
                example.exceptionOnNotZero(example.exceptionOnNegative(negative)); // NON_COMPLIANT
                Assertions.fail("Expected an IOException to be thrown");
            } catch (IOException e) {
                System.out.println(e);
            }
        }
    }
}
