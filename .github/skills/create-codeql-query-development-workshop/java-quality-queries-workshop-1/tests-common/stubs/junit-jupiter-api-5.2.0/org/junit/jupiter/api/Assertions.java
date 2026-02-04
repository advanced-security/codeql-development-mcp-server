/*
 * Copyright 2015-2022 the original author or authors.
 *
 * All rights reserved. This program and the accompanying materials are
 * made available under the terms of the Eclipse Public License v2.0 which
 * accompanies this distribution and is available at
 *
 * https://www.eclipse.org/legal/epl-v20.html
 */

package org.junit.jupiter.api;

import org.junit.jupiter.api.function.Executable;

public class Assertions {
    // --- fail ----------------------------------------------------------------

    /**
     * <em>Fails</em> a test <em>without</em> a failure message.
     *
     * <p>Although failing <em>with</em> an explicit failure message is recommended,
     * this method may be useful when maintaining legacy code.
     *
     * <p>See Javadoc for {@link #fail(String, Throwable)} for an explanation of
     * this method's generic return type {@code V}.
     */
    public static <V> V fail() {
        AssertionUtils.fail();
        return null;
    }

    /**
     * <em>Fails</em> a test with the given failure {@code message}.
     *
     * <p>See Javadoc for {@link #fail(String, Throwable)} for an explanation of
     * this method's generic return type {@code V}.
     */
    public static <V> V fail(String message) {
        AssertionUtils.fail(message);
        return null; // appeasing the compiler: this line will never be executed.
    }

    /**
     * <em>Fails</em> a test with the given failure {@code message} as well
     * as the underlying {@code cause}.
     *
     * <p>The generic return type {@code V} allows this method to be used
     * directly as a single-statement lambda expression, thereby avoiding the
     * need to implement a code block with an explicit return value. Since this
     * method throws an {@link org.opentest4j.AssertionFailedError} before its
     * return statement, this method never actually returns a value to its caller.
     * The following example demonstrates how this may be used in practice.
     *
     * <pre>{@code
     * Stream.of().map(entry -> fail("should not be called"));
     * }</pre>
     */
    public static <V> V fail(String message, Throwable cause) {
        AssertionUtils.fail(message, cause);
        return null; // appeasing the compiler: this line will never be executed.
    }

    /**
     * <em>Fails</em> a test with the given underlying {@code cause}.
     *
     * <p>See Javadoc for {@link #fail(String, Throwable)} for an explanation of
     * this method's generic return type {@code V}.
     */
    public static <V> V fail(Throwable cause) {
        AssertionUtils.fail(cause);
        return null; // appeasing the compiler: this line will never be executed.
    }

    public static void assertEquals(Object expected, Object actual) {
        return;
    }

    public static void assertEquals(Object expected, Object actual, String message) {
        return;
    }

    public static void assertFalse(boolean condition) {
        return;
    }

    public static void assertFalse(boolean condition, String message) {
        return;
    }

    public static void assertNotNull(Object actual) {
        return;
    }

    public static void assertNotNull(Object actual, String message) {
        return;
    }

    public static void assertNotEquals(Object unexpected, Object actual) {
        return;
    }

    public static void assertNotEquals(Object unexpected, Object actual, String message) {
        return;
    }

    public static void assertNotSame(Object unexpected, Object actual) {
        return;
    }

    public static void assertNotSame(Object unexpected, Object actual, String message) {
        return;
    }

    public static void assertNull(Object actual) {
        return;
    }

    public static void assertNull(Object actual, String message) {
        return;
    }

    public static void assertSame(Object expected, Object actual) {
        return;
    }

    public static void assertSame(Object expected, Object actual, String message) {
        return;
    }

    public static <T extends Throwable> T assertThrows(Class<T> expectedType, Executable executable) {
    return AssertThrows.assertThrows(expectedType, executable);
    }

    public static <T extends Throwable> T assertThrows(Class<T> expectedType, Executable executable, String message) {
        return AssertThrows.assertThrows(expectedType, executable, message);
    }
}

