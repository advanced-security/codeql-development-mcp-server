# COMPLIANT: Functions that should not be analyzed
def unrelated1():
    # No calls
    pass

def unrelated2():
    unrelated1()

# NON_COMPLIANT: Source function for call graph analysis
def sourceFunc():
    unrelated1()
    unrelated2()
