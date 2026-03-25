def unrelated():
    # No calls
    pass

def target():
    unrelated()

def intermediate():
    target()

def source():
    intermediate()
