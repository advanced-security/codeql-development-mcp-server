import java.io.IOException;

/**
 * Example production class with methods that throw checked exceptions.
 * This class represents a typical production code scenario where methods
 * throw IOException under various conditions.
 */
public class ExampleClass {
    /**
     * Throws IOException if count is not zero.
     * @param count the count to check
     * @return the count if zero
     * @throws IOException if count is not zero
     */
    int exceptionOnNotZero(int count) throws IOException {
        if (count != 0) {
            throw new IOException("IOException invalid count");
        }
        return count;
    }

    /**
     * Throws IOException if count is negative.
     * @param count the count to check
     * @return the count if non-negative
     * @throws IOException if count is negative
     */
    int exceptionOnNegative(int count) throws IOException {
        if (count < 0) {
            throw new IOException("IOException invalid count");
        }
        return count;
    }

    /**
     * Throws IOException if count is positive.
     * @param count the count to check
     * @return the count if non-positive
     * @throws IOException if count is positive
     */
    int exceptionOnPositive(int count) throws IOException {
        if (count > 0) {
            throw new IOException("IOException invalid count");
        }
        return count;
    }
}
