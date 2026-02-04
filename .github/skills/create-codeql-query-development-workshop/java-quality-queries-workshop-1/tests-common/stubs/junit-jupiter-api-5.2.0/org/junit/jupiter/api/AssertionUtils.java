/*
 * Copyright 2015-2018 the original author or authors.
 *
 * All rights reserved. This program and the accompanying materials are
 * made available under the terms of the Eclipse Public License v2.0 which
 * accompanies this distribution and is available at
 *
 * http://www.eclipse.org/legal/epl-v20.html
 */

package org.junit.jupiter.api;

import org.opentest4j.AssertionFailedError;

/**
 * {@code AssertionUtils} is a collection of utility methods that are common to
 * all assertion implementations.
 *
 * @since 5.0
 */
class AssertionUtils {

	///CLOVER:OFF
	private AssertionUtils() {
		/* no-op */
	}
	///CLOVER:ON

	static void fail() {
		throw new AssertionFailedError();
	}

	static void fail(String message) {
		throw new AssertionFailedError(message);
	}

	static void fail(String message, Throwable cause) {
		throw new AssertionFailedError(message, cause);
	}

	static void fail(Throwable cause) {
		throw new AssertionFailedError(null, cause);
	}

	static void fail(String message, Object expected, Object actual) {
		throw new AssertionFailedError(message, expected, actual);
	}

}
