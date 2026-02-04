# Example1 test case for PrintCFG.ql

# COMPLIANT - Basic control flow for CFG testing
def simple_method(x):
    if x > 0:
        print("Positive")
    else:
        print("Non-positive")

    for i in range(3):
        print(i)

# NON_COMPLIANT - Function with complex control flow
def complex_method(value):
    if value < 0:
        return -1

    while value > 10:
        value = value // 2

    if value == 0:
        return 0
    elif value == 1:
        return 1
    else:
        return value * 2
