# COMPLIANT: Methods that should not be analyzed
def unrelated1
  # No calls
end

def unrelated2
  unrelated1
end

# NON_COMPLIANT: Source method for call graph analysis
def sourceFunc
  unrelated1
  unrelated2
end
