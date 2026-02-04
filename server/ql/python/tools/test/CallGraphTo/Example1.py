# COMPLIANT: Functions that should not be analyzed
def unrelated1():
    # No calls
    pass

# NON_COMPLIANT: Target function for call graph analysis
def targetFunc():
    unrelated1()

def caller1():
    targetFunc()

def caller2():
    targetFunc()
