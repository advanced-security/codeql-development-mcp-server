# COMPLIANT: Methods that should not be analyzed
def unrelated1
  # No calls
end

# NON_COMPLIANT: Target method for call graph analysis
def targetFunc
  unrelated1
end

def caller1
  targetFunc
end

def caller2
  targetFunc
end
